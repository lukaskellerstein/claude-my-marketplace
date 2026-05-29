# Generative SVG — scene-graph-first code generation

The single highest-leverage technique for **complex** SVG. Hand-emitting raw `<svg>` markup for a scene with coordinate math, many repeated objects, or dense annotation is the #1 cause of broken output: models hallucinate coordinates, mis-order overlapping shapes, and clip content off-canvas. The fix is to **stop hand-writing geometry** and instead author a small program that computes it.

> **When to reach for this (HARD RULE 2 in SKILL.md).** Use generative SVG whenever the asset has **coordinate math** (isometric/projection, arcs, packed grids), **repeated motifs** (a fleet of nodes, a tile field), or **~30+ elements**. Below that — a single icon, a logo mark, a 5-shape spot illustration — hand-write it directly. For **data** charts/maps, don't write your own renderer at all: defer to **graph-generation** (D3 / Observable Plot / Vega-Lite own the layout + data-binding).

---

## The two-part split: spec ≠ renderer

Separate **what** is in the picture from **where/how** it's drawn. This is what makes complex scenes reliable, reviewable, and editable.

1. **Scene graph (the spec) — semantics, as plain data.** Symbols, positioned instances, edges, labels, legend, title/desc. No geometry math, no SVG strings. This is the part a model (or a human) reasons about and edits.
2. **Deterministic renderer — geometry, as code.** Pure functions that turn the spec into SVG: projection, layout, shading, depth-sort, bbox, emission. Given the same spec it always produces the same SVG (diffable).

```js
// ---- 1. the scene graph (semantics only) ----
const spec = {
  title: 'Service topology',
  description: '3 gateways feeding a queue cluster and a warehouse.',
  width: 1600, height: 900,
  instances: [
    { id: 'gw1', symbol: 'server', x: 120, y: 200, label: 'API GW 1' },
    { id: 'gw2', symbol: 'server', x: 120, y: 360, label: 'API GW 2' },
    { id: 'wh',  symbol: 'store',  x: 900, y: 280, label: 'Warehouse' },
  ],
  edges: [ { from: 'gw1', to: 'wh' }, { from: 'gw2', to: 'wh' } ],
};

// ---- 2. the deterministic renderer (geometry only) ----
function render(spec) {
  const defs = `<defs>
    <symbol id="server" viewBox="0 0 120 72">
      <rect x="10" y="12" width="100" height="48" rx="8" fill="#1c222d" stroke="#2a313d"/>
      <rect x="18" y="22" width="84" height="8" rx="4" fill="#8aa6c8"/>
    </symbol>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#647e9e"/>
    </marker>
  </defs>`;
  const byId = Object.fromEntries(spec.instances.map(n => [n.id, n]));
  const edges = spec.edges.map(e => {
    const a = byId[e.from], b = byId[e.to];
    return `<path d="M${a.x+60} ${a.y+36} L${b.x+60} ${b.y+36}" fill="none" stroke="#647e9e" stroke-width="2" marker-end="url(#arrow)"/>`;
  }).join('\n');
  const nodes = spec.instances.map(n => `<g transform="translate(${n.x} ${n.y})">
      <use href="#${n.symbol}"/>
      <text x="60" y="92" text-anchor="middle" font-size="14" fill="#e7eaee">${esc(n.label)}</text>
    </g>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" role="img" aria-labelledby="t d">
    <title id="t">${esc(spec.title)}</title><desc id="d">${esc(spec.description)}</desc>
    ${defs}\n${edges}\n${nodes}
  </svg>`;
}
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
```

Edit the **spec** to change the picture; edit the **renderer** to change the style. A reference image or brief becomes a spec; restyling never risks the layout.

---

## Renderer disciplines (the non-negotiables)

These are exactly the things that go wrong when you eyeball geometry:

- **Reuse primitives with `<defs>` + `<symbol>`/`<use>`.** One shaded node, stamped N times — consistent look, tiny file. Never copy-paste a 12-line group per instance.
- **Compute, never eyeball, coordinates.** Project 3D→2D (see [isometric.md](isometric.md)), derive arc endpoints (see [path-geometry.md](path-geometry.md)), snap to a grid. Round to 2–3 decimals for diffable output.
- **Track a bounding box of EVERY drawn point — *including text extents and callout leaders* — and derive the `viewBox` from it.**
  > ⚠ **Named pitfall: untracked text = clipped output.** The most common generative-SVG bug: shapes are tracked into the bbox but a label, leader line, or side-callout is not, so it lands outside the computed `viewBox` and renders half-cut. (This is exactly how a real "ACT · WITH APPROVAL — held at L3…" callout shipped clipped.) Feed every text anchor *plus an estimated text width/height* into the bbox tracker, or add explicit padding on the side the text extends toward.
  ```js
  let BB = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const track = (x, y) => { BB.minX=Math.min(BB.minX,x); BB.minY=Math.min(BB.minY,y);
                            BB.maxX=Math.max(BB.maxX,x); BB.maxY=Math.max(BB.maxY,y); };
  // for text: track BOTH ends of its bounding run
  const trackText = (x, y, str, size=12, anchor='start') => {
    const w = str.length * size * 0.6;                 // rough estimate — see caveat
    const x0 = anchor === 'middle' ? x - w/2 : anchor === 'end' ? x - w : x;
    track(x0, y - size); track(x0 + w, y + size*0.3);
  };
  // ⚠ This 0.6-per-char estimate is for monospace-ish type; proportional fonts with
  //   wide glyphs can still under-estimate and clip. Pad the text-side margin generously,
  //   and let the render-qa harness be the authority — it renders the real font and the
  //   rubric's "clipped" check catches what the estimate misses.
  ```
- **Depth-sort: paint back-to-front, bottom-to-top.** SVG has no z-index — document order *is* z-order. Sort objects by projected depth (`x+y+z`) before emitting. Wrong stack order is the #1 isometric bug.
- **Escape text.** Any `&`, `<`, `>` in a label breaks XML — route every dynamic string through an `esc()` helper (above). `xmllint` will catch a miss, but escape by construction.
- **Emit accessibility from the spec** (HARD RULE 3): `role="img"` + `<title>` (+ `<desc>` when it conveys meaning), populated from the spec's title/description — not added in cleanup.
- **One canonical `viewBox`**, no `width`/`height` on the root for fluid scaling (add them back only when a fixed size is required).

---

## Then run the harness loop (HARD RULE 4)

A generator that "looks right in the code" is not done. After writing the SVG, render and inspect:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/svg-mastery/scripts/render-qa.mjs out.svg --bg both
# → Read the PNG(s), score against validation-and-qa.md, fix the generator, re-run.
```

Because the picture is generated, you fix **the renderer or the spec**, never the SVG by hand — then regenerate. Iterate up to 5 passes, accept only strict improvements. See [validation-and-qa.md](validation-and-qa.md) for the scored rubric and loop contract.

---

## Pre-flight
- [ ] Confirmed this is complex enough to generate (coord math / repetition / ~30+ elements); else hand-write, or defer data charts to **graph-generation**.
- [ ] Spec (semantics) is separate from renderer (geometry).
- [ ] Primitives defined once in `<defs>`, stamped with `<use>`.
- [ ] bbox tracks every point **and text/callout extents**; `viewBox` derived from it.
- [ ] Depth-sorted paint order; deterministic rounding.
- [ ] `role`/`<title>`/`<desc>` emitted from the spec; all text escaped.
- [ ] **Rendered with `render-qa.mjs` and inspected** against the scored rubric.

## See also
- [isometric.md](isometric.md) — the projection math for 3D-look scenes.
- [path-geometry.md](path-geometry.md) — arcs, scales, bbox, coordinate math the renderer needs.
- [art-illustration.md](art-illustration.md) — shading/palette/depth so the rendered scene isn't flat.
- [validation-and-qa.md](validation-and-qa.md) — the render-and-inspect loop + scored rubric.
- [toolchain-scripts.md](toolchain-scripts.md) — the libraries the renderer/harness use.
- **graph-generation** — for data charts/maps/standard diagrams, use it instead of a hand-rolled renderer.

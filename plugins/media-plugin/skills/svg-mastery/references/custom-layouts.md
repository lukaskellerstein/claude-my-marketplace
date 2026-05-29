# Custom Composed Layouts

Hand-authoring a composed SVG graphic — stat panels, comparison cards, "how it works" flows, badges, custom infographic layouts — **only when no `graph-generation` pattern covers it**. This is the fallback engine for bespoke composition, plus the connector/marker/primitive toolkit you need to build it.

> **Read this gate before drawing anything.**
> - **Stats / timeline / "how it works" / comparison / any real chart, diagram, map, or numbers** → **`graph-generation`** first (D3 `stat-dashboard`, `timeline`, `radial-gauge`, `pie-donut`; Mermaid/Draw.io for flows). Those patterns are battle-tested and faster than hand-SVG.
> - **Before composing an infographic at all**, read **`visual-planning/references/infographic-design.md`** — it classifies the asset (data vs. decorative) and sets the layout principles (one message, one hero, direct labels, grid, restrained color).
> - Come here **only** for a layout no pattern covers, where you need pixel control. Then apply the infographic-design principles *in raw SVG*.

---

## The layout skeleton

Author on an explicit grid. Define spacing tokens and stick to them — uniform gaps and aligned edges are what read as "professional" ([infographic-design.md §8 alignment]).

```html
<svg viewBox="0 0 960 540" font-family="Inter, sans-serif">
  <rect width="960" height="540" fill="#ffffff"/>
  <!-- 12-col grid mental model: margin 48, gutter 24 -->
  <g transform="translate(48 48)"><!-- header --></g>
  <g transform="translate(48 140)"><!-- card row --></g>
</svg>
```

Keep a margin constant (e.g. 48) and a gutter constant (e.g. 24); position every group from those. Cards equal height, left edges aligned.

---

## Cards & panels

```html
<g transform="translate(0 0)">
  <rect width="280" height="160" rx="16" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="24" y="64" font-size="48" font-weight="800" fill="#4338ca">99.9%</text>  <!-- hero number -->
  <text x="24" y="92" font-size="14" fill="#64748b">Uptime</text>                    <!-- label below -->
</g>
```
- **One hero number** per card at the largest size; label directly beneath/beside it (no legend).
- Round corners consistently (`rx` shared across all cards).
- Use one accent color for the hero metric, neutral greys for everything else.

Stamp a repeated card with `<use>` and override text per instance, or generate the group server-side (see [toolchain-scripts.md](toolchain-scripts.md)).

---

## Connectors & arrowheads (`<marker>`)

For "how it works" flows and linking panels, define an arrowhead once and reuse it:

```html
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="#94a3b8"/>
  </marker>
</defs>
<!-- straight connector -->
<line x1="280" y1="80" x2="360" y2="80" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
<!-- elbow / orthogonal connector -->
<path d="M280 80 H320 V200 H360" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
<!-- curved connector -->
<path d="M280 80 C330 80 330 200 360 200" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
```
- `orient="auto-start-reverse"` rotates the marker to follow the line and flips correctly for `marker-start`.
- `refX/refY` set the marker's anchor so the tip lands exactly on the endpoint.
- Keep connectors a neutral grey, thinner than the boxes they join.

> If you're drawing more than a few boxes-and-arrows, stop — that's a **flowchart → `graph-generation`** (Mermaid/Draw.io auto-routes connectors). Hand-routing many connectors is error-prone.

---

## Minimal data primitives (for custom layouts only)

When a custom panel needs a *small* bespoke plot that no D3 pattern fits, these primitives help. For anything standard (bar/line/pie/scatter/area), use **`graph-generation`** — don't reinvent its scales/axes here.

### Linear scale (map a value to a pixel position)
```js
const scale = (v, dMin, dMax, pMin, pMax) => pMin + (v - dMin) / (dMax - dMin) * (pMax - pMin);
// e.g. value 0..100 → x 0..240:  scale(75, 0, 100, 0, 240)  // 180
```

### A bare bar row (value-labeled, direct)
```html
<g transform="translate(0 0)" font-size="13" fill="#334155">
  <text x="0" y="14">Q1</text>
  <rect x="48" y="3" width="180" height="14" rx="3" fill="#6366f1"/>  <!-- width = scale(value) -->
  <text x="236" y="14">75</text>
</g>
```

### A single progress arc (big-number gauge)
```html
<path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" stroke-width="14"/>  <!-- track -->
<path d="M20 100 A80 80 0 0 1 140 36"  fill="none" stroke="#6366f1" stroke-width="14" stroke-linecap="round"/> <!-- value -->
<text x="100" y="96" text-anchor="middle" font-size="36" font-weight="800" fill="#111">72%</text>
```
Arc geometry & the full-circle gotcha: [path-geometry.md](path-geometry.md). (For real gauges, `graph-generation`'s `radial-gauge` is faster.)

---

## Apply the infographic principles (in SVG)

From `visual-planning/references/infographic-design.md`, enforced by hand here:
- **One message, one hero element.** Largest thing = the single takeaway.
- **Direct labels**, value + unit (`42ms`, not `42`); no legend unless a color scale truly needs one.
- **≤3 hues**, color encodes meaning, rest grey; pull palette from brand/`styleguide`.
- **Grid alignment**, equal-height cards, uniform gaps.
- **No chartjunk** — no 3-D, gratuitous shadows, heavy gridlines.
- **Real numbers only** — never invent figures to fill a layout.

## Pre-flight
- [ ] Confirmed no `graph-generation` pattern fits (else use that).
- [ ] Read `infographic-design.md`; one message, one hero, direct labels.
- [ ] Everything on a shared grid; equal-height cards; uniform gaps.
- [ ] ≤3 hues, accent encodes the hero metric, rest neutral.
- [ ] Connectors neutral/thin; arrowheads land exactly on endpoints.
- [ ] All figures real; units shown.
- [ ] **Rendered and scored** — `render-qa.mjs <file> --bg both` at the destination aspect ratio, then `Read` the PNG and score the rubric ([validation-and-qa.md](validation-and-qa.md)). Iterate ≤5, accept only improvements.

## See also
- **graph-generation** — the first choice for stats/timeline/comparison/charts/flows.
- **visual-planning/references/infographic-design.md** — classify + principles before composing.
- [path-geometry.md](path-geometry.md) — arcs, scales, coordinate math.
- [typography-text.md](typography-text.md) — labels and headline type.
- [validation-and-qa.md](validation-and-qa.md) — render-and-inspect the composition.

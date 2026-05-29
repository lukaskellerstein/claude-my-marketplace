# SVG Validation & QA — the render-and-inspect loop

The single most important reference in this skill. **The only way to guarantee an SVG is beautiful and bug-free is to validate its markup, render it to a raster image, and *look at the result* before shipping it.** A validator catches malformed XML; only your eyes (reading a rendered PNG) catch off-canvas shapes, invisible fills, broken clips, ID collisions, overlapping text, and "it parses but looks wrong." This applies to *any* SVG — hand-authored here, or produced by **graph-generation** / **icon-library**.

> **Hard truth about schemas:** SVG 2 has **no** DTD or normative schema — you cannot validate against it. SVG 1.1 has a DTD, but it cannot express path-data grammar, attribute value types, or coordinate sanity, so "passes the DTD" ≠ "correct" ≠ "renders right." Do **not** add a `<!DOCTYPE>` to SVG files (W3C discourages it — it slows parsers and can break rendering). Treat schema/markup validation as a *sanity check only*, and rely on the render-and-inspect loop for correctness.

---

## The loop (run this whenever you author or substantially edit an SVG)

```
 1. emit / edit the SVG
 2. xmllint --noout file.svg          # well-formed? (unescaped &, unclosed tags, bad ns)
 3. npx svgo file.svg -o file.min.svg # optional: clean + surface accidental junk
 4. render to PNG  (resvg / cairosvg / headless Chrome — see below)
 5. READ the PNG with the Read tool and inspect it against the brief
 6. fix issues, go to 2
```

Do not declare an SVG "done" until step 5 has been done at least once and the rendered image matches intent. For animated/interactive SVGs, render a representative frame (or screenshot via a headless browser).

### Run the loop with one command — `render-qa.mjs`

Steps 2–4 (xmllint → rasterize @2× → optional SVGO) are bundled in the skill's harness, so you don't rebuild them each time:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/svg-mastery/scripts/render-qa.mjs <file.svg> --bg both [--svgo]
```

It runs `xmllint` (hard-fails on malformed XML), renders to PNG at 2× with **`@resvg/resvg-js`**, and **auto-switches to headless Chrome (Playwright)** when the SVG uses `<style>`, web fonts, CSS animation, blend modes, or `<foreignObject>` — the cases resvg renders wrong. `--bg both` renders on dark *and* white to expose invisible fills. It prints the PNG path(s); **step 5 (looking) is still yours.** First run in a new environment: `(cd <skill>/scripts && npm install)`; the browser path additionally needs `npx playwright install chromium`.

---

## Step 2 — Well-formedness (always, it's instant)

```bash
xmllint --noout file.svg      # exit 0 = well-formed; otherwise prints line:col of the error
```

Catches the most common *fatal* bug: an unescaped `&` in a URL or text node, an unclosed tag, or a stray namespace. `xmllint` ships with libxml2 (preinstalled on macOS / most Linux). If a string is in memory rather than a file:

```bash
printf '%s' "$SVG" | xmllint --noout -
```

### Optional markup correctness — W3C Nu validator (`vnu`)

The most authoritative *correctness* checker (knows real SVG rules, not just XML):

```bash
# Node:  npm i -g vnu-jar  (needs Java)   |  Python: pip install html5validator
vnu --format gnu file.svg
# or the hosted service: https://validator.w3.org/nu/
```

Use `vnu` when you want to catch unknown attributes/elements or bad enum values. It's heavier than `xmllint`; reserve it for final QA on hand-authored markup.

---

## Step 4 — Render to PNG (pick by what's in the SVG)

| Renderer | Install | Best for | Limitation |
|----------|---------|----------|------------|
| **resvg-js** | `npm i @resvg/resvg-js` | Fast, static SVG, Node, no browser | No CSS animation / JS / some filters |
| **cairosvg** | `pip install cairosvg` | Fast, static, Python/CLI | Limited filter/blend support |
| **sharp** | `npm i sharp` (librsvg) | Static, also resizes | librsvg quirks on advanced filters |
| **rsvg-convert** | `brew install librsvg` | One-shot CLI | Same librsvg limits |
| **headless Chrome** (Playwright/Puppeteer) | `npm i playwright` | CSS, JS, animation, web fonts, blend modes — highest fidelity | Slower, heavier |

**Rule of thumb:** static art/diagram/icon → `resvg` or `cairosvg` (fast). Anything using CSS animation, `<style>`, web fonts, `mix-blend-mode`, or complex `<filter>` chains → **headless Chrome** (it's the real rendering engine).

### resvg-js (recommended default for Node)

```js
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const svg = fs.readFileSync('file.svg');
const resvg = new Resvg(svg, {
  background: 'white',                       // catch elements that rely on a bg
  fitTo: { mode: 'width', value: 1200 },     // render at 2× for crisp inspection
  font: { loadSystemFonts: true },           // so <text> resolves
});
fs.writeFileSync('out.png', resvg.render().asPng());
```

### cairosvg (CLI, zero JS)

```bash
cairosvg file.svg -o out.png -W 1200 -b white
```

### Headless Chrome screenshot (for CSS/JS/animation/fonts)

```js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.setContent(`<body style="margin:0;background:#fff">${require('fs').readFileSync('file.svg','utf8')}</body>`);
  await p.locator('svg').screenshot({ path: 'out.png' });   // tight-crops to the SVG
  await b.close();
})();
```

> Render on **both** a white and a dark background if the SVG will live in light/dark contexts — white-on-transparent art vanishes on white; check it.

---

## Step 5 — Inspect the PNG against the scored rubric (the part most people skip)

After rendering, use the **Read tool on the PNG** and score it line by line. **Any failing line ⇒ the SVG is not done — fix and re-render.** Treat this as a pass/fail gate, not a vibe check.

**Correctness (no bugs):**
- [ ] **Everything intended is visible** — nothing clipped at the edges or pushed off-canvas (viewBox too small / wrong coords). *Check labels, leaders, and side-callouts specifically* — untracked text extents are the #1 generative-SVG clip ([generative-svg.md](generative-svg.md)).
- [ ] **Nothing invisible** — a shape with `fill="white"` on white, or `fill="none"` with no stroke, silently disappears. (This is why you render `--bg both`.)
- [ ] **Z-order / occlusion correct** — SVG has no z-index; paint order = document order. No object wrongly hidden behind another; depth-sorted scenes stack right.
- [ ] **No label collisions** — text doesn't overlap text or sit on a busy shape illegibly.
- [ ] **Proportions & alignment** match the brief — no squashed aspect ratio (`preserveAspectRatio`), no misaligned grid.
- [ ] **Colors/gradients resolve** — gradients point the right way; no ID collision pulling the wrong gradient/filter; clips/masks reveal the right region.
- [ ] **No stray artifacts** — leftover debug rects, off-color outlines, half-drawn paths.

**Quality (looks designed, not defaulted):**
- [ ] **One clear focal point** and a foreground/midground/background read — not everything at equal visual weight.
- [ ] **No amateur "flat SVG" tells** — flat single-fill faces where form needs gradient/shading, no contact/ambient shadow grounding objects, raw primaries fighting for attention, stroke-width `1` on everything. (The pro moves are in [art-illustration.md](art-illustration.md).)
- [ ] **Matches the brief's *message*, not just its parts** — the intended metaphor actually reads at a glance.

**Accessibility (informative SVG):**
- [ ] `role="img"` + `<title>` present (+ `<desc>` when it conveys meaning); decorative SVG is `aria-hidden="true"`.

### Repairing an existing SVG — feed it BOTH ways

A model **cannot "see" SVG markup** and cannot reliably read a PNG's structure. So when fixing/restyling an existing SVG, ground the loop with **both** inputs: the **rendered PNG** (what it looks like — for the quality/correctness judgment) *and* the **raw SVG/markup text** (how it's built — for the edit). Judging from only one half is why "repairs" miss the actual defect.

### The loop contract

- **Max 5 iterations.** Render → score → fix → re-render.
- **Accept only strict improvements.** Keep a revision only if its rubric score goes *up*; if a change makes the picture worse, revert it — don't let the loop drift ("Forced Optimization").
- **The loop fixes layout, not concept.** Composition is largely set in pass 1; iterations reliably fix clipping, occlusion, collisions, and flatness — they will *not* rescue a fundamentally wrong idea. If pass 1 is conceptually off, re-plan (back to **visual-planning**), don't grind the loop.
- Shipping after **zero** render passes is the #1 cause of "ugly/buggy SVG."

---

## Diffable, deterministic output

When generating many SVGs (icon sets, batches), make output stable so visual diffs are meaningful:

```bash
npx svgo file.svg --config svgo.config.js   # with sortAttrs + fixed floatPrecision
```

Run a final `xmllint --noout` over the whole directory in CI:

```bash
find ./svgs -name '*.svg' -print0 | xargs -0 -n1 xmllint --noout
```

---

## Quick decision tree

- *Is it well-formed XML?* → `xmllint --noout` (always).
- *Does it use only static shapes/paths/gradients?* → render with `resvg`/`cairosvg`, inspect.
- *Does it use CSS animation / JS / web fonts / blend modes?* → render with headless Chrome, inspect a frame.
- *Untrusted source?* → sanitize first (see [bug-catalog.md](bug-catalog.md) and [toolchain-scripts.md](toolchain-scripts.md)).
- *Shipping to production / many files?* → SVGO with a fixed config, then `xmllint` sweep in CI.

## See also
- [bug-catalog.md](bug-catalog.md) — the specific bugs this loop is designed to catch.
- [toolchain-scripts.md](toolchain-scripts.md) — every library/CLI referenced here, with install + snippets.
- [path-geometry.md](path-geometry.md) — when the bug is geometric (off-canvas, bad arcs, wrong bbox).
- [optimization.md](optimization.md) — SVGO config details for the cleanup step.

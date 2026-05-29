# Typography & Text in SVG

Setting type inside SVG — labels, headlines, text on a curve, knock-out and gradient text, variable fonts — so it's positioned precisely and renders the same everywhere.

> **Defer first.** SVG `<text>` is for **display type that's part of a graphic** — a headline in a hero, labels on a custom layout, a logotype, text on a path. **Long-form body copy belongs in HTML**, not SVG (better reflow, accessibility, SEO, selection). If you're labeling a chart/diagram, that's **`graph-generation`**'s job.

---

## Anatomy & precise positioning

```html
<text x="100" y="50" text-anchor="middle" dominant-baseline="middle"
      font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#111">
  Hello
</text>
```

- `x`,`y` set the **baseline anchor**, not the top-left. `y` is the baseline.
- **`text-anchor`**: `start` (default) | `middle` | `end` — horizontal alignment about `x`.
- **`dominant-baseline`**: `auto` (default) | `middle` | `central` | `hanging` — vertical alignment about `y`. For true centering use `text-anchor="middle"` + `dominant-baseline="middle"`.

The #1 text bug is forgetting `y` is the baseline and that anchoring defaults to `start` — text drifts off where you expected. Render and check ([validation-and-qa.md](validation-and-qa.md)).

---

## Multi-line & spans

SVG `<text>` does **not** wrap automatically. Lay out lines yourself with `<tspan>`:

```html
<text x="20" y="40" font-size="18" fill="#111">
  <tspan x="20" dy="0">First line</tspan>
  <tspan x="20" dy="1.4em">Second line</tspan>
  <tspan x="20" dy="1.4em">Third line</tspan>
</text>
```
Repeat `x` on each `<tspan>` and step `dy` by your line-height. For real auto-wrapping you must measure text width (browser `getComputedTextLength()`, or a server-side metrics lib) and break manually.

`textLength` + `lengthAdjust="spacingAndGlyphs"` forces a string to an exact width (useful for fitting a label to a box):
```html
<text textLength="160" lengthAdjust="spacingAndGlyphs">STRETCHED</text>
```

---

## Text on a path

```html
<defs><path id="curve" d="M20 120 Q150 20 280 120" fill="none"/></defs>
<text font-size="20" fill="#6366f1">
  <textPath href="#curve" startOffset="50%" text-anchor="middle">curved headline</textPath>
</text>
```
- `startOffset` (px or %) positions the text along the path; `text-anchor="middle"` centers it.
- Keep the path smooth — sharp corners crowd glyphs. Tangent-following is automatic.

---

## Knock-out & gradient text

### Gradient fill
```html
<linearGradient id="t" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#ec4899"/>
</linearGradient>
<text fill="url(#t)" font-size="64" font-weight="800" x="0" y="64">GRADIENT</text>
```

### Knock-out (text cut out of a shape) — via `<mask>`
```html
<mask id="ko">
  <rect width="100%" height="100%" fill="white"/>
  <text x="50%" y="55%" text-anchor="middle" font-size="72" font-weight="800" fill="black">HOLE</text>
</mask>
<rect width="400" height="120" fill="#6366f1" mask="url(#ko)"/>
```
See [filters-and-effects.md](filters-and-effects.md) for outline/glow/3D text effects.

---

## Fonts: the portability problem

A renderer can only use a font it **has**. Three strategies:

| Strategy | When | How |
|---|---|---|
| **System/declared font** | SVG shown in a browser with that font available | `font-family="Inter, sans-serif"` + ensure the page loads it |
| **Convert text → paths** | Standalone SVG, unknown environment, logos | Outline glyphs so no font is needed (loses selectability/edit) |
| **Embed the font** | Need real text + guaranteed rendering | `@font-face` with base64 `src` inside `<style>` (large file) |

**For logos and portable assets, convert to paths.** Tools: Inkscape (`Path → Object to Path`), `text-to-svg` (Node), or FontForge. When rendering for inspection, resvg needs `font: { loadSystemFonts: true }` or it falls back ([validation-and-qa.md](validation-and-qa.md)).

---

## Variable fonts

Variable-font axes work where the font is loaded (browser):
```html
<text style="font-family: 'Inter var'; font-variation-settings: 'wght' 650, 'slnt' -6;">…</text>
```
Not all renderers honor `font-variation-settings`; if exporting to PNG with resvg/cairosvg, test the weight or convert to paths.

---

## Accessibility

- Real `<text>` is read by screen readers — good. If you convert to paths, the text becomes invisible to AT → add `role="img"` + `<title>`/`aria-label` to the SVG (see SKILL.md Accessibility).
- Don't rely on color alone to distinguish text; keep sufficient contrast.

## Pre-flight
- [ ] Anchoring correct (`text-anchor` + `dominant-baseline`); text lands where intended.
- [ ] No reliance on auto-wrap — multi-line laid out with `<tspan>` + `dy`.
- [ ] Font strategy chosen: declared, outlined-to-paths (portable/logos), or embedded.
- [ ] If outlined to paths, accessible name added (`<title>`/`aria-label`).
- [ ] **Rendered in the target environment** — correct font resolved, nothing clipped/overflowing.

## See also
- [filters-and-effects.md](filters-and-effects.md) — gradient/outline/glow text effects.
- [logos-marks.md](logos-marks.md) — wordmarks and outlining type for brand marks.
- [validation-and-qa.md](validation-and-qa.md) — verify font resolution and layout.
- **graph-generation** — for chart/diagram labels (don't hand-place those here).

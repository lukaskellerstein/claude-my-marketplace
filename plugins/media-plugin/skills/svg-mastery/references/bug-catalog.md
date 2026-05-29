# SVG Bug Catalog — what breaks, why, and how to detect it

A field guide to the bugs that make SVGs render wrong, look ugly, or fail to load. Each entry: the symptom, the cause, the fix, and how to *detect* it (validator vs. render-and-inspect — see [validation-and-qa.md](validation-and-qa.md)). Scan this before shipping any hand-authored SVG.

---

## Fatal — file won't parse or render at all

| Bug | Symptom | Cause | Fix | Detect with |
|-----|---------|-------|-----|-------------|
| **Unescaped `&`** | "not well-formed" error; blank render | `&` in text or a URL (`href="...?a=1&b=2"`) | `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;` in text/attr values | `xmllint --noout` |
| **Missing `xmlns`** | Renders inline in HTML but blank as a file, data-URI, or in `<img>` | No `xmlns="http://www.w3.org/2000/svg"` on root | Add it to root `<svg>` (also `xmlns:xlink` if you use `xlink:href`) | render as standalone file |
| **Unclosed / mismatched tags** | Parse error | Hand-edited markup | Close every element; self-close empties (`<circle .../>`) | `xmllint --noout` |
| **Duplicate / malformed attributes** | Parse error or ignored attr | Copy-paste | One value per attribute | `xmllint --noout` |

---

## Layout & visibility — it parses but you can't see it right

| Bug | Symptom | Cause | Fix | Detect with |
|-----|---------|-------|-----|-------------|
| **Missing `viewBox`** | Won't scale to container; fixed-size; clips | No `viewBox` on root | Always set `viewBox="minX minY w h"`; never let SVGO's `removeViewBox` run | render at 2 sizes |
| **Off-canvas geometry** | Shapes cut off or absent | Coordinates outside the viewBox | Compute bbox of all geometry; widen viewBox or move shapes (see [path-geometry.md](path-geometry.md)) | render + inspect |
| **Squashed / distorted** | Wrong aspect ratio | Container ratio ≠ viewBox ratio with `preserveAspectRatio="none"` | Use `xMidYMid meet` (default) or match the ratio | render + inspect |
| **Invisible white-on-white** | Element gone | `fill="white"`/`fill="#fff"` on a white page, or `fill="none"` with no stroke | Render on white *and* dark bg; give it a real fill or stroke | render on both bgs |
| **Zero size in Safari** | SVG collapses to 0×0 in flex/absolute layout | Only viewBox, no width/height, plus `height:auto` | Add intrinsic `width`/`height`, or set explicit CSS size | render in browser |
| **Wrong z-order** | Element hidden behind another | SVG has no `z-index`; paint order = document order | Reorder elements — later siblings paint on top | render + inspect |
| **`overflow` clipping** | Glow/shadow/stroke cut at edge | Default `overflow:hidden`, or filter region too small | Set filter `x="-50%" y="-50%" width="200%" height="200%"`, or widen viewBox | render + inspect |

---

## Color, gradients, filters

| Bug | Symptom | Cause | Fix | Detect with |
|-----|---------|-------|-----|-------------|
| **ID collision across inlined SVGs** | One SVG's gradient/filter/clip applies to another; wrong colors | Two documents share `id="grad1"`; `url(#grad1)` resolves to the first match in the DOM | Namespace every id (`prefixIds` in SVGO), or scope ids per asset | render multiple inlined together |
| **Gradient "stuck" while shape scales** | Gradient doesn't move with shape | Wrong `gradientUnits` | `objectBoundingBox` (default, 0–1, follows shape) vs `userSpaceOnUse` (absolute coords) | render at 2 sizes |
| **Filter clipped** | Blur/glow/shadow cut off | Filter region defaults to element bbox | Add `x="-50%" y="-50%" width="200%" height="200%"` on `<filter>` | render + inspect |
| **Mask hides everything** | Content vanishes | Mask luminance: black = hidden; a black-filled mask hides all | White = visible, black = hidden; check fill colors inside `<mask>` | render + inspect |
| **`currentColor` shows black** | Icon is black, not themed | No `color` set on an ancestor | Set `color` (or Tailwind `text-*`) on a parent; use `fill="currentColor"` | render in context |

---

## Paths & geometry

| Bug | Symptom | Cause | Fix | Detect with |
|-----|---------|-------|-----|-------------|
| **Full-circle arc not drawn** | Arc disappears | An `A` arc whose start point == end point is, by spec, **not rendered** | Split a full circle into two semicircle arcs, or use `<circle>` | render + inspect |
| **Wrong arc of four** | Arc bulges the wrong way / takes the long route | Misset `large-arc-flag` / `sweep-flag` | `large-arc`: 0 = ≤180°, 1 = >180°. `sweep`: 1 = clockwise, 0 = CCW | see [path-geometry.md](path-geometry.md) |
| **Holes filled solid (or punched wrong)** | Compound shape's inner hole is filled | Wrong `fill-rule` or sub-path winding | Choose `nonzero` (default) vs `evenodd`; for `nonzero`, reverse the inner sub-path's direction | render + inspect |
| **Self-intersecting fills** | Speckled / inverted regions | Path crosses itself with `nonzero` | Switch to `evenodd`, or split into non-crossing sub-paths | render + inspect |
| **Jagged when scaled up** | Visible faceting | Over-aggressive precision rounding | Raise `floatPrecision` (2–3 for illustrations); don't round detailed paths to 0–1 | render large |
| **Stroke scales unexpectedly** | Line thickens/thins with zoom | Stroke scales with the element by default | `vector-effect="non-scaling-stroke"` to pin width | render at 2 sizes |

---

## Text & fonts

| Bug | Symptom | Cause | Fix | Detect with |
|-----|---------|-------|-----|-------------|
| **Wrong font / fallback** | Text looks off, metrics shift, overflows | Font not available to the renderer | Convert `<text>`→`<path>` for portability, or embed/declare the font; load system fonts in resvg | render where it ships |
| **Text overflows / clipped** | Letters run past edge | Fixed coords, longer string than expected | Measure text, use `textLength`/`<tspan>` wrapping, widen viewBox | render + inspect |
| **`text-anchor` confusion** | Misaligned labels | Default `start`; centered layout needs `middle` | `text-anchor="middle"` + `dominant-baseline="middle"` for centering | render + inspect |

---

## Security (untrusted SVGs)

SVGs can carry executable content. Before inlining anything from an untrusted source:

```js
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty, { USE_PROFILES: { svg: true, svgFilters: true } });
```

Strip `<script>`, `<foreignObject>`, `<iframe>`, all `on*` handlers, and `javascript:` URLs. When in doubt, embed via `<img src>` (which blocks scripts) instead of inline. Keep DOMPurify current — older versions had SVG-namespace mutation-XSS bypasses. Python: parse with `defusedxml`, never raw `xml.etree` on untrusted input. Full snippets in [toolchain-scripts.md](toolchain-scripts.md).

---

## The meta-bug: shipping without rendering

The most common bug of all is **not looking at the output.** Markup can be perfectly well-formed and still be the wrong picture. Always run the [render-and-inspect loop](validation-and-qa.md) before declaring an SVG done.

## See also
- [validation-and-qa.md](validation-and-qa.md) — the loop that catches everything here.
- [path-geometry.md](path-geometry.md) — the math behind the path/geometry bugs above.
- [optimization.md](optimization.md) — `prefixIds` and `floatPrecision` settings referenced here.

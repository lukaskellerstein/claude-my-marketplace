# SVG Path & Geometry

Deep reference for the `d` attribute, the coordinate system, and the math you need to draw paths that land exactly where you intend. Most "the shape looks wrong" bugs are geometry bugs — this is how to reason about them precisely. Pairs with [bug-catalog.md](bug-catalog.md) (the symptoms) and [validation-and-qa.md](validation-and-qa.md) (proving the fix).

---

## Coordinate system

- Origin `(0,0)` is **top-left**. **+x → right, +y → down** (y is flipped vs. math class).
- The `viewBox="minX minY width height"` defines the internal coordinate space; CSS `width`/`height` scale it to the screen.
- Angles measured clockwise (because y points down). A "0°" pointing right rotates *downward* as the angle grows.

```
viewBox="0 0 100 100"
(0,0)────────────► +x
  │   ┌──────────┐
  │   │  shape   │
  ▼   └──────────┘
 +y
```

To place something at the center of a `0 0 W H` viewBox: `(W/2, H/2)`.

---

## Path commands

| Cmd | Name | Params | Notes |
|-----|------|--------|-------|
| `M`/`m` | Move to | `x y` | Starts a sub-path; no line drawn |
| `L`/`l` | Line to | `x y` | Straight segment |
| `H`/`h` | Horizontal | `x` | |
| `V`/`v` | Vertical | `y` | |
| `C`/`c` | Cubic Bézier | `x1 y1 x2 y2 x y` | 2 control points |
| `S`/`s` | Smooth cubic | `x2 y2 x y` | Reflects previous control point |
| `Q`/`q` | Quadratic Bézier | `x1 y1 x y` | 1 control point |
| `T`/`t` | Smooth quadratic | `x y` | Reflects previous control point |
| `A`/`a` | Arc | `rx ry rot large-arc sweep x y` | Elliptical arc (see below) |
| `Z`/`z` | Close | — | Straight line back to sub-path start |

**Uppercase = absolute. Lowercase = relative to the current point.** Mixing is fine and often clearer (`M` to position absolutely, then `l`/`c` to build relatively).

---

## Bézier curves — control the curve, not just the endpoints

Cubic (`C`) is the workhorse. The curve leaves the start point heading toward control point 1, and arrives at the end point coming from control point 2:

```
M 10 80            start
C 40 10, 65 10, 95 80   cp1=(40,10) cp2=(65,10) end=(95,80)  → a smooth hump
```

- Pull control points **away** from the line for a deeper curve; place them **on** the line for nearly straight.
- For an S-curve, use `C` then `S` (the `S` mirrors cp2 automatically for tangent continuity).
- Quadratic (`Q`) has one shared control point — cheaper, less control. Good for simple arcs of speech bubbles, leaves, waves.

**Cubic formula** (for computing a point at parameter `t ∈ [0,1]`):

```
B(t) = (1−t)³·P0 + 3(1−t)²t·P1 + 3(1−t)t²·P2 + t³·P3
```

Tangent direction at `t` is `B'(t)` — useful for placing arrowheads/markers along a curve.

---

## Arcs — the four-arc trap

`A rx ry x-axis-rotation large-arc-flag sweep-flag x y`

Given a start point, an end point, and the radii, **four** different arcs are possible. Two flags pick which one:

| Flag | 0 | 1 |
|------|---|---|
| `large-arc-flag` | minor arc (≤ 180°) | major arc (> 180°) |
| `sweep-flag` | counter-clockwise | clockwise |

```
<!-- quarter circle, r=50, from (50,0) to (100,50), short way, clockwise -->
<path d="M50 0 A50 50 0 0 1 100 50" fill="none" stroke="#333"/>
```

**Full-circle gotcha:** an arc whose start point equals its end point is **not drawn** (zero-length per spec). To draw a full circle with arcs, use **two semicircles**, or just use `<circle>`:

```
<!-- full circle r=40 centered (50,50) via two arcs -->
<path d="M10 50 A40 40 0 1 1 90 50 A40 40 0 1 1 10 50" />
```

If you find arcs painful, author with `<circle>`/`<ellipse>` or convert arcs to cubics (`svgpath().unarc()` in JS, `svgpathtools` in Python — see [toolchain-scripts.md](toolchain-scripts.md)); many renderers and animation tools handle cubics more reliably.

---

## fill-rule — which regions are "inside"

For self-intersecting or compound paths (a shape with a hole), the fill depends on `fill-rule`:

- **`nonzero`** (default): cast a ray; count +1 for each clockwise crossing, −1 for counter-clockwise. Non-zero total = filled. → To punch a hole, draw the inner sub-path in the **opposite winding direction** of the outer.
- **`evenodd`**: count total crossings; odd = filled. → A hole works regardless of direction (simpler, predictable). Great for "donut" shapes and overlapping stars.

```
<!-- ring via evenodd: outer + inner circle, inner is knocked out -->
<path fill-rule="evenodd" d="M50 10 A40 40 0 1 1 49.9 10 Z M50 30 A20 20 0 1 0 49.9 30 Z"/>
```

If a hole fills in solid → wrong rule or wrong winding. Switch to `evenodd` first; it's the easiest to reason about.

---

## viewBox math & fitting

- **Scale factor** = `cssWidth / viewBoxWidth`. A stroke of `2` in a `0 0 100 100` viewBox shown at `400px` renders `8px` wide — unless `vector-effect="non-scaling-stroke"`.
- **Fit content to canvas:** compute the bounding box of all geometry `(minX,minY,maxX,maxY)`, then set `viewBox="minX minY (maxX-minX) (maxY-minY)"`, optionally with a margin: `viewBox="minX-m minY-m W+2m H+2m"`.
- **`preserveAspectRatio`** controls fit when ratios differ: `xMidYMid meet` (default, letterbox-fit centered), `slice` (cover-crop), `none` (stretch — distorts). See SKILL.md table.

---

## Measuring geometry

**In the browser (most reliable for length/point):**

```js
const p = document.querySelector('path');
const len = p.getTotalLength();              // for stroke-dash draw-on animations
const mid = p.getPointAtLength(len / 2);     // {x, y} — place a marker/label
const box = p.getBBox();                     // {x, y, width, height} of rendered geometry
```

**Headless / server-side (no browser):** use `svgpathtools` (Python — `path.length()`, `path.point(t)`, `path.bbox()`) or `svg-path-properties` (JS). Note `getTotalLength` results differ slightly across engines — don't hard-code a length you measured in one browser.

**Path simplification:** reduce point count with Ramer–Douglas–Peucker (`simplify-js`) before re-encoding; reduce coordinate precision with SVGO's `cleanupNumericValues` (`floatPrecision`). Keep 2–3 decimals for illustrations — rounding detailed paths to 0–1 decimals visibly facets them.

---

## Tips

- Build complex paths **incrementally**: position with `M`, then add one segment at a time, rendering after each (the loop in [validation-and-qa.md](validation-and-qa.md)) — far easier than debugging a 40-command `d` at once.
- Prefer absolute coords (`M C L`) when hand-authoring symmetric shapes; relative (`m c l`) when translating a repeated motif.
- Keep numbers tidy: a leading-zero-free, space-separated `d` (`M.5 1C2 3 4 5 6 7`) is valid but hard to read — keep it readable while authoring, optimize at the end.
- When a shape "is there but invisible," it's usually `fill="none"` with no stroke, or off-canvas — check the bbox against the viewBox first.

## See also
- [bug-catalog.md](bug-catalog.md) — geometry bug symptoms ↔ fixes.
- [validation-and-qa.md](validation-and-qa.md) — render to confirm geometry.
- [toolchain-scripts.md](toolchain-scripts.md) — path parsers, arc→cubic, length/bbox libraries.
- [animation-recipes.md](animation-recipes.md) — uses `getTotalLength` for draw-on effects.

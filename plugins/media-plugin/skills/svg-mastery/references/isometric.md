# Isometric & Axonometric SVG

Drawing 3D-looking scenes — stacked cubes, isometric rooms, server racks, city blocks, product illustrations — in flat SVG, using projection math so faces align perfectly.

> **Defer first.** For an **isometric architecture/infrastructure diagram with real vendor icons** (AWS/Azure/GCP, network topology), use **`graph-generation`** (Draw.io has isometric shape libraries). Use this file for hand-authored **isometric illustration** — decorative or conceptual 3D vector art where you control every face.

---

## Pick a projection

| Projection | Angles | Look | Use |
|---|---|---|---|
| **True isometric** | all three axes 120° apart; horizontals at **30°** | Equal foreshortening, classic "iso" | Game art, icon sets, even scenes |
| **2:1 (pixel) isometric** | horizontals at ~**26.57°** (slope 1:2) | Snaps to pixel grid, crisp | UI illustration, pixel-perfect tiles |
| **Dimetric** | two axes equal, one different | Slightly "truer" perspective | Hero product shots |
| **Cabinet / cavalier** | front face flat, depth at 45° | Easy, side-receding | Quick blocks, boxes |

Most illustration uses **true isometric (30°)** or **2:1**. Pick one and keep it for the whole scene.

---

## The transform recipe (true isometric)

Draw shapes flat, then rotate each face onto its isometric plane. The classic CSS/SVG transform set for the three visible faces of a cube:

```
top face:    rotate(30) skewX(-30) scaleY(0.864)
left face:   rotate(-30) skewX(30) scaleY(0.864)
right face:  rotate(90) skewX(-30) scaleY(0.864)   /* then position */
```

In SVG, apply via `transform` on a `<g>` wrapping each face. In practice it's cleaner to **compute the projected coordinates directly** (below) than to chain skews.

### Project a 3D point to 2D (do the math, place exactly)

For a point `(x, y, z)` in world space, isometric screen coords:

```js
// 30° isometric
const isoX = (x - y) * Math.cos(Math.PI / 6);   // cos30 ≈ 0.866
const isoY = (x + y) * Math.sin(Math.PI / 6) - z; // sin30 = 0.5; z raises it up
```

Generate all your face corners from `(x,y,z)` cube vertices through this projection, then emit `<polygon points="…">` for each face. This guarantees faces meet exactly — no eyeballing skews.

---

## A cube, the right way

```html
<svg viewBox="0 0 200 220">
  <!-- vertices projected from a unit cube, scaled; back-to-front paint order -->
  <polygon points="100,40 160,75 100,110 40,75"  fill="#a5b4fc"/> <!-- top   (lightest) -->
  <polygon points="40,75 100,110 100,180 40,145" fill="#6366f1"/> <!-- left  (mid)      -->
  <polygon points="160,75 100,110 100,180 160,145" fill="#4338ca"/> <!-- right (darkest) -->
</svg>
```

**Lighting rule:** top face lightest, one side mid, the other side darkest — a fixed 3-tone shade of one hue sells the 3D form instantly. Reuse the same three tints across every block in the scene.

---

## The isometric grid (build on it, don't float)

Lay an iso grid first and snap every object's base to it. Grid lines run along the two horizontal axes at ±30° (or ±26.57° for 2:1):

```html
<defs>
  <pattern id="iso-grid" width="34.64" height="20" patternUnits="userSpaceOnUse">
    <path d="M0 10 L17.32 0 M17.32 0 L34.64 10 M17.32 20 L17.32 0"
          stroke="#e5e7eb" stroke-width="0.5" fill="none"/>
  </pattern>
</defs>
<rect width="400" height="300" fill="url(#iso-grid)"/>
```

---

## Stacking & depth (z-order is everything)

- Paint **back-to-front, bottom-to-top**: objects further back and lower first.
- Sort objects by `(x + y + z)` (their projected depth) and emit in ascending order.
- A wrong stack order is the #1 iso bug — render and inspect ([validation-and-qa.md](validation-and-qa.md)).

---

## Reuse blocks with `<use>`

Define one shaded cube/tile in `<defs>`, then `<use href="#cube" transform="translate(…)">` across the grid — consistent shading, tiny file:

```html
<defs><g id="cube"><!-- the 3 polygons above --></g></defs>
<use href="#cube" transform="translate(0 0)"/>
<use href="#cube" transform="translate(60 35)"/>   <!-- one tile right -->
<use href="#cube" transform="translate(-60 35)"/>  <!-- one tile left  -->
```

Tile step = `(±60, 35)` matches the projected axis vectors above — adjust to your scale.

---

## Pre-flight
- [ ] One projection chosen (true iso 30° or 2:1) and used consistently.
- [ ] Faces meet exactly (computed from projected vertices, not eyeballed skews).
- [ ] Fixed 3-tone shading: top lightest → one side mid → other side darkest, same hue.
- [ ] Objects snapped to a shared iso grid; nothing floating.
- [ ] Depth-sorted paint order (back-to-front, bottom-to-top).
- [ ] Any non-trivial scene (many cubes, computed coords) is **generated, not hand-written** ([generative-svg.md](generative-svg.md)) — with bbox tracking that includes text/label extents.
- [ ] **Rendered and scored** — `render-qa.mjs <file> --bg both`, then `Read` the PNG and score the rubric ([validation-and-qa.md](validation-and-qa.md)); confirm stacking/occlusion and that nothing (esp. labels/callouts) is clipped. Iterate ≤5, accept only improvements.

## See also
- [path-geometry.md](path-geometry.md) — the coordinate math behind the projection.
- [art-illustration.md](art-illustration.md) — shading, palette, and scene composition.
- [validation-and-qa.md](validation-and-qa.md) — catch stacking/overlap errors.
- **graph-generation** (Draw.io) — isometric *infrastructure diagrams* with vendor icons.

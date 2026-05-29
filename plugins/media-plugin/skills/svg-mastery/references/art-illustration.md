# Vector Art & Illustration

Hand-authoring flat / vector illustration in raw SVG — blobs, organic shapes, layered scenes, gradient art, hero illustrations — so they look *designed*, not *defaulted*.

> **Defer first.** This is for **vector** art you compose by hand. If the asset's job is **pure-tone raster decoration** (a photographic mood image, a painterly hero), that's **`image-generation`** / **`image-sourcing`**, not this. If it must **explain** something (a process, an architecture, data), it's a **diagram/chart → `graph-generation`**. Reach here only when you want clean, scalable, editable vector illustration. The pre-generation gate (**`visual-planning`**) decides which; this file is the *how* once it lands on vector.

---

## What makes vector illustration look good (vs. amateur)

| Amateur tell | Pro move |
|---|---|
| Pure primaries, `#ff0000`/`#00ff00` | A small curated palette (3–5 hues) with one accent; muted/desaturated bases |
| Flat fills everywhere | One or two **gradient** focal areas + flat supporting shapes |
| Hard, uniform outlines on everything | Selective outlines, or none; let shape edges define form |
| Symmetric, centered, evenly spaced | Intentional asymmetry, overlap, depth, a clear focal point |
| Default drop shadows on each element | One soft ambient shadow grounding the composition |
| Stroke-width `1` everywhere | A deliberate weight scale; thick for hero forms, thin for detail |

The whole game is **restraint + hierarchy + depth**: a limited palette, one focal point, and layering that reads as foreground/midground/background.

---

## Building shapes

### Organic blobs (the backbone of modern flat illustration)
Blobs are smooth closed cubic paths. Author by placing 4–6 anchor points around a center and connecting with `C`/`S`, pulling control points tangent to the perimeter:

```html
<path d="M60 10 C90 10 110 35 105 65 C100 95 70 110 45 100
         C20 90 10 60 20 38 C28 18 40 10 60 10 Z" fill="#c7d2fe"/>
```
Easier: generate the blob path with a tool and paste it in (e.g. blobmaker-style cubic loops), then tweak. Keep `evenodd` off for solid blobs.

### Layering for depth
Paint back-to-front (SVG paint order = document order):

```html
<svg viewBox="0 0 200 160">
  <rect width="200" height="160" fill="#eef2ff"/>            <!-- background -->
  <path d="…big soft blob…" fill="#c7d2fe" opacity="0.7"/>   <!-- midground -->
  <ellipse cx="100" cy="150" rx="70" ry="10" fill="#000" opacity="0.08"/> <!-- contact shadow -->
  <g><!-- hero subject paths --></g>                          <!-- foreground -->
</svg>
```

### Lighting
- A **single light direction** — pick one (e.g. top-left) and keep highlights on that side, shadows opposite, for the whole piece.
- Add form with a lighter-tint shape clipped to the base shape (highlight) and a darker-shade shape (shadow), each at low opacity.
- Soft radial gradient for a glow/light source (see [filters-and-effects.md](filters-and-effects.md) for gradients/feGaussianBlur).

---

## Color & gradient craft

```html
<defs>
  <!-- 3-stop gradient reads richer than 2 -->
  <linearGradient id="art-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"  stop-color="#a5b4fc"/>
    <stop offset="55%" stop-color="#818cf8"/>
    <stop offset="100%" stop-color="#6366f1"/>
  </linearGradient>
</defs>
```
- Build the palette from a base hue + tints/shades, or pull from the **`styleguide`** skill / project brand. Avoid fully saturated, equal-brightness colors fighting for attention.
- One **accent** color does the heavy lifting (the focal element); everything else recedes (lower saturation/contrast).
- For "duotone" art, map shadows to a dark hue and highlights to a light hue of the *same* family.

---

## Texture without rasters

- **Grain:** a `<feTurbulence>` + `<feColorMatrix>` overlay at low opacity adds analog warmth (see [filters-and-effects.md](filters-and-effects.md)).
- **Stipple / halftone:** a `<pattern>` of small dots clipped to a shape (see [patterns-backgrounds.md](patterns-backgrounds.md)).
- **Paper / noise:** subtle turbulence as a `mix-blend-mode: multiply` layer.

---

## Reusable motifs

Define once, stamp many times — keeps file size down and the look consistent:

```html
<defs>
  <g id="leaf"><path d="M0 0 C8 -10 8 -22 0 -30 C-8 -22 -8 -10 0 0 Z" fill="#34d399"/></g>
</defs>
<use href="#leaf" transform="translate(40 120) rotate(-20)"/>
<use href="#leaf" transform="translate(70 120) rotate(10) scale(0.8)"/>
```

---

## Pre-flight (reject if any fails)
- [ ] Palette is 3–5 curated hues with one clear accent — no raw primaries.
- [ ] One focal point; clear foreground / midground / background layering.
- [ ] Single consistent light direction across the whole piece.
- [ ] Gradients used intentionally (focal areas), not on every shape.
- [ ] One grounding ambient shadow, not a shadow per element.
- [ ] `viewBox` fits the art with a small margin; nothing off-canvas.
- [ ] **Rendered and scored** — `render-qa.mjs <file> --bg both`, then `Read` the PNG and score every line of the rubric ([validation-and-qa.md](validation-and-qa.md)); the "amateur flat-SVG tells" lines above are checked there. Iterate ≤5, accept only improvements.

## See also
- [filters-and-effects.md](filters-and-effects.md) — gradients, grain, glow, blend modes.
- [patterns-backgrounds.md](patterns-backgrounds.md) — textures and backdrops for scenes.
- [path-geometry.md](path-geometry.md) — drawing smooth blobs with Béziers.
- [validation-and-qa.md](validation-and-qa.md) — render-and-inspect before shipping.
- **image-generation** / **image-sourcing** — when the asset should be raster, not vector.

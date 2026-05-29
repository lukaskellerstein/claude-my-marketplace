# Patterns & Backgrounds

Seamless repeating patterns, decorative backdrops, mesh-style gradients, blob fields, and subtle texture — the decorative vector layer behind UI, slides, and illustration. Fully owned by svg-mastery (nothing else produces these).

---

## Repeating patterns with `<pattern>`

A `<pattern>` tiles a small motif across any fill. `patternUnits="userSpaceOnUse"` sizes the tile in SVG coordinates (predictable); `objectBoundingBox` uses 0–1 fractions of the target.

### Dots
```html
<defs>
  <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
    <circle cx="12" cy="12" r="2" fill="#6366f1" opacity="0.35"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="url(#dots)"/>
```

### Grid / blueprint
```html
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
  <path d="M40 0H0V40" fill="none" stroke="#e5e7eb" stroke-width="1"/>
</pattern>
```
Layer a coarse grid over a fine one (two `<rect>`s, two patterns) for a blueprint look.

### Diagonal hatch
```html
<pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <line x1="0" y1="0" x2="0" y2="10" stroke="#6366f1" stroke-width="1" opacity="0.2"/>
</pattern>
```

### Seamlessness rule
A tile is seamless when motifs crossing an edge are **mirrored on the opposite edge**. The cleanest trick: keep all geometry fully *inside* the tile (like the dot above), or draw edge-crossing elements twice (once on each side). Always tile it over a large `<rect>` and **render to confirm** there are no visible seams ([validation-and-qa.md](validation-and-qa.md)).

---

## Gradient backdrops

### Multi-stop linear (hero background)
```html
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#312e81"/>
  <stop offset="50%" stop-color="#6366f1"/>
  <stop offset="100%" stop-color="#a5b4fc"/>
</linearGradient>
<rect width="100%" height="100%" fill="url(#bg)"/>
```

### Mesh-gradient look (no native SVG mesh — fake it)
SVG has no portable mesh gradient. Emulate it with **several large, overlapping, heavily-blurred radial gradients**:

```html
<defs>
  <radialGradient id="g1"><stop offset="0%" stop-color="#f0abfc"/><stop offset="100%" stop-color="#f0abfc" stop-opacity="0"/></radialGradient>
  <radialGradient id="g2"><stop offset="0%" stop-color="#818cf8"/><stop offset="100%" stop-color="#818cf8" stop-opacity="0"/></radialGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="40"/></filter>
</defs>
<rect width="600" height="400" fill="#0f172a"/>
<g filter="url(#soft)">
  <circle cx="120" cy="100" r="180" fill="url(#g1)"/>
  <circle cx="480" cy="320" r="220" fill="url(#g2)"/>
</g>
```
Three or four colored blobs + a big blur ≈ the trendy "mesh/aurora" gradient.

### Conic-gradient look
Native `<conicGradient>` isn't in SVG; use CSS `conic-gradient()` on an HTML element behind the SVG, or approximate with many gradient-filled pie slices.

---

## Blob fields & organic backdrops

Scatter a few large, low-opacity blobs (see [art-illustration.md](art-illustration.md) for blob paths) behind content:

```html
<g opacity="0.15">
  <path d="…blob…" fill="#6366f1" transform="translate(40 30) scale(2)"/>
  <path d="…blob…" fill="#ec4899" transform="translate(420 260) scale(1.6) rotate(40)"/>
</g>
```
Keep them out of the content's reading zone; low opacity so text stays legible.

---

## Texture & noise

Add analog grain so flat backgrounds don't look sterile:

```html
<filter id="grain">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
  <feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer> <!-- very low opacity -->
</filter>
<rect width="100%" height="100%" filter="url(#grain)" mix-blend-mode="overlay"/>
```
`baseFrequency` high = fine grain; low = cloudy/organic. Keep alpha low (0.03–0.08) — texture should be felt, not seen. `stitchTiles="stitch"` keeps turbulence seamless if tiled.

---

## Performance & sizing

- `<feTurbulence>` and big blurs are **GPU-expensive** — fine for a single background `<rect>`, costly if applied per-element or animated. Rasterize a heavy decorative background to PNG for production if it's static (render via [validation-and-qa.md](validation-and-qa.md) tools).
- For tiling CSS backgrounds, encode a small seamless SVG as a data URI (see SKILL.md "CSS Background").
- Unique gradient/filter **IDs** per document or they collide when inlined — namespace them ([bug-catalog.md](bug-catalog.md)).

## Pre-flight
- [ ] Tiled pattern shows **no seams** (rendered over a large area).
- [ ] Decorative layers don't reduce foreground text legibility (low opacity / out of reading zone).
- [ ] Heavy filters limited to one backdrop element, not many; rasterized if static + expensive.
- [ ] Gradient/filter IDs are unique/namespaced.

## See also
- [filters-and-effects.md](filters-and-effects.md) — gradients, turbulence, blur, blend modes in depth.
- [art-illustration.md](art-illustration.md) — blob construction and palettes.
- [validation-and-qa.md](validation-and-qa.md) — render to catch seams and performance issues.

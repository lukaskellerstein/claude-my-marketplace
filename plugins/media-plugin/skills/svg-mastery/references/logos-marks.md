# Logos & Custom Marks

Constructing custom logo-marks, wordmarks, badges, and brand symbols in SVG — built on a grid, optically balanced, and clean at every size.

> **Defer first.** For **pre-made UI icons** (search, settings, arrow, user…), use **`icon-library`** (Lucide / Heroicons / Tabler) — *never hand-draw a standard UI icon*. Use this file for a **bespoke brand mark / logo / badge** that no library has. You may also land here to **tune, recolor, or animate** an icon that `icon-library` already fetched.

---

## Construct on a grid

Professional marks are built on an explicit construction grid so proportions are deliberate and reproducible:

```html
<svg viewBox="0 0 100 100">
  <!-- construction guides (delete before shipping) -->
  <g stroke="#f0a" stroke-width="0.25" opacity="0.4" fill="none">
    <circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="28"/>
    <line x1="50" y1="0" x2="50" y2="100"/><line x1="0" y1="50" x2="100" y2="50"/>
  </g>
  <!-- the mark, snapped to the guides -->
  <path d="…" fill="#111"/>
</svg>
```

- Use a **square viewBox** (`0 0 100 100` or `0 0 24 24`) with consistent padding (the "clear space").
- Anchor curves to circle/line guides so arcs share radii and strokes share weight.
- Keep stroke weights on a small scale (e.g. one or two values), not arbitrary.

---

## Optical alignment beats mathematical alignment

The eye, not the ruler, is the judge:

- **Circles look smaller** than squares of the same height — oversize round elements ~2–5% to appear equal.
- **Triangles/pointed shapes** need their visual center (centroid), not the bounding-box center, on the axis.
- **Overshoot:** curved tops/bottoms should extend slightly past flat ones to look aligned.
- Center the mark **optically** in its clear space; pure bbox-centering often looks off for asymmetric marks.

Always render and eyeball it ([validation-and-qa.md](validation-and-qa.md)) — optical fixes can't be computed reliably.

---

## Stroke marks vs. filled marks

| | Stroke-based | Filled (solid) |
|---|---|---|
| Look | Light, linear, modern | Bold, confident, app-icon ready |
| Scaling | Use `vector-effect="non-scaling-stroke"` only if you *want* constant px; otherwise let it scale | Scales cleanly, no stroke pitfalls |
| Small sizes | Thin strokes vanish < 16px — thicken or switch to fill | Holds up at favicon size |
| Theming | `stroke="currentColor"` | `fill="currentColor"` |

For a mark that must work as a 16px favicon **and** a hero, design the **filled** version as the source of truth; derive the stroke version if needed.

---

## currentColor + a single-color source of truth

Author the mark in **one color** using `currentColor` so it adapts to any context, then layer brand color via CSS or a duotone variant:

```html
<svg viewBox="0 0 100 100" fill="currentColor" role="img" aria-label="Acme">
  <title>Acme</title>
  <path d="…"/>
</svg>
```
```css
.logo { color: #4338ca; }            /* brand */
.footer .logo { color: #fff; }       /* on dark */
```

Keep a **monochrome** master. Color/gradient variants derive from it — never the reverse.

---

## Responsive logo system (different marks per size)

A detailed logo turns to mud at 16px. Ship size-specific variants and swap by breakpoint:

| Size | Variant |
|---|---|
| Favicon 16–32px | Glyph/monogram only, filled, no fine detail |
| App / avatar 48–128px | Symbol, simplified |
| Header ≥ 120px wide | Symbol + wordmark, full detail |

```html
<picture>
  <source media="(max-width:480px)" srcset="logo-mark.svg">
  <img src="logo-full.svg" alt="Acme">
</picture>
```

Favicon: ship `favicon.svg` (modern browsers) + a fallback `.ico`.

---

## Animated badges & marks

Subtle motion on a logo reveal (draw-on, scale-in, gradient sweep). Keep it short and easeful — a logo is not a fireworks show.

```css
.mark path { stroke-dasharray: 300; stroke-dashoffset: 300; animation: draw 1.2s ease forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
```

Full recipes (stroke draw-on, morph, stagger, GSAP/Framer) in [animation-recipes.md](animation-recipes.md). Remember the SVG `transform-origin` gotcha: set `transform-box: fill-box; transform-origin: center;` for centered scale/rotate.

---

## Pre-flight
- [ ] Built on a square grid with defined clear space; construction guides removed.
- [ ] Optically aligned (circles overshot, points on centroid) — verified by eye in a render.
- [ ] Monochrome `currentColor` master exists; color variants derive from it.
- [ ] Holds up at **favicon size** (rendered at 16px and inspected).
- [ ] Strokes don't vanish at small sizes (or a filled variant covers small sizes).
- [ ] Optimized (`svgo`) and well-formed (`xmllint`) — see [optimization.md](optimization.md).

## See also
- [optimization.md](optimization.md) — ship a tiny, clean mark.
- [animation-recipes.md](animation-recipes.md) — logo reveal animations.
- [filters-and-effects.md](filters-and-effects.md) — gradient/duotone variants.
- [validation-and-qa.md](validation-and-qa.md) — render at multiple sizes, inspect optically.
- **icon-library** — for standard UI icons (don't hand-draw those).

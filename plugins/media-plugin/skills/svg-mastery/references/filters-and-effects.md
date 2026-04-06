# SVG Filters & Effects

Deep-dive reference for SVG gradients, filters, clip-paths, masks, and pattern fills. These techniques add visual depth to SVGs without raster images.

---

## Gradients

### Linear Gradient

```html
<defs>
  <linearGradient id="grad-horizontal" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#6366f1"/>
    <stop offset="100%" stop-color="#ec4899"/>
  </linearGradient>
</defs>
<rect fill="url(#grad-horizontal)" width="200" height="100" rx="8"/>
```

**Direction control via x1/y1/x2/y2:**

| Direction | x1 | y1 | x2 | y2 |
|-----------|----|----|----|----|
| Left → Right | 0% | 0% | 100% | 0% |
| Top → Bottom | 0% | 0% | 0% | 100% |
| Diagonal ↘ | 0% | 0% | 100% | 100% |
| Diagonal ↗ | 0% | 100% | 100% | 0% |

**Multi-stop gradient:**

```html
<linearGradient id="grad-multi" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#6366f1"/>
  <stop offset="50%" stop-color="#8b5cf6"/>
  <stop offset="100%" stop-color="#ec4899"/>
</linearGradient>
```

### Radial Gradient

```html
<defs>
  <radialGradient id="grad-radial" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#fbbf24"/>
    <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
  </radialGradient>
</defs>
<circle fill="url(#grad-radial)" cx="100" cy="100" r="80"/>
```

**Off-center focal point** (light source effect):

```html
<radialGradient id="grad-focal" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
  <stop offset="0%" stop-color="#fff"/>
  <stop offset="100%" stop-color="#6366f1"/>
</radialGradient>
```

### Gradient on Stroke

```html
<linearGradient id="stroke-grad" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#6366f1"/>
  <stop offset="100%" stop-color="#ec4899"/>
</linearGradient>

<path d="M10 50 Q100 10 190 50" fill="none" stroke="url(#stroke-grad)" stroke-width="4"/>
```

---

## Filter Primitives

SVG filters are composable — chain primitives inside a `<filter>` element.

### Gaussian Blur

```html
<defs>
  <filter id="blur">
    <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
  </filter>
</defs>
<circle filter="url(#blur)" cx="50" cy="50" r="30" fill="#6366f1"/>
```

`stdDeviation` controls blur radius. Use `stdDeviation="3 0"` for horizontal-only blur.

### Drop Shadow

```html
<defs>
  <filter id="shadow">
    <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.25)"/>
  </filter>
</defs>
<rect filter="url(#shadow)" x="20" y="20" width="100" height="60" rx="8" fill="white"/>
```

### Multi-Layer Shadow (Elevation Effect)

```html
<filter id="elevation-3">
  <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.1)"/>
  <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.08)"/>
  <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="rgba(0,0,0,0.05)"/>
</filter>
```

### Color Matrix

Transform colors across all channels:

```html
<!-- Grayscale -->
<filter id="grayscale">
  <feColorMatrix type="saturate" values="0"/>
</filter>

<!-- Sepia -->
<filter id="sepia">
  <feColorMatrix type="matrix"
    values="0.393 0.769 0.189 0 0
            0.349 0.686 0.168 0 0
            0.272 0.534 0.131 0 0
            0     0     0     1 0"/>
</filter>

<!-- Hue rotate -->
<filter id="hue-shift">
  <feColorMatrix type="hueRotate" values="90"/>
</filter>
```

### Morphology (Expand/Shrink)

```html
<!-- Thicken strokes or expand shapes -->
<filter id="thicken">
  <feMorphology operator="dilate" radius="2"/>
</filter>

<!-- Thin strokes or shrink shapes -->
<filter id="thin">
  <feMorphology operator="erode" radius="1"/>
</filter>
```

---

## Composable Filter Chains

### Glow Effect

```html
<filter id="glow">
  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
</filter>

<!-- Usage -->
<text filter="url(#glow)" fill="#6366f1" font-size="48" x="50" y="60">GLOW</text>
```

### Neon Glow

```html
<filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
  <!-- Colored blur layer -->
  <feFlood flood-color="#6366f1" result="color"/>
  <feComposite in="color" in2="SourceAlpha" operator="in" result="colored"/>
  <feGaussianBlur in="colored" stdDeviation="6" result="blur"/>
  <!-- Bright core -->
  <feFlood flood-color="#c4b5fd" result="bright"/>
  <feComposite in="bright" in2="SourceAlpha" operator="in" result="core"/>
  <!-- Stack: blur behind, core on top -->
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="blur"/>
    <feMergeNode in="core"/>
  </feMerge>
</filter>
```

### Inset Shadow

```html
<filter id="inset-shadow">
  <!-- Invert the alpha to create the shadow shape -->
  <feComponentTransfer in="SourceAlpha">
    <feFuncA type="table" tableValues="1 0"/>
  </feComponentTransfer>
  <feGaussianBlur stdDeviation="3"/>
  <feOffset dx="2" dy="2" result="offset"/>
  <!-- Clip to original shape -->
  <feComposite in="offset" in2="SourceAlpha" operator="in" result="shadow"/>
  <!-- Color the shadow -->
  <feFlood flood-color="rgba(0,0,0,0.3)"/>
  <feComposite in2="shadow" operator="in" result="colored-shadow"/>
  <!-- Merge with original -->
  <feMerge>
    <feMergeNode in="SourceGraphic"/>
    <feMergeNode in="colored-shadow"/>
  </feMerge>
</filter>
```

---

## Clip-Path

Clip-path defines a visible region — everything outside is hidden.

### SVG clipPath Element

```html
<defs>
  <clipPath id="circle-clip">
    <circle cx="100" cy="100" r="80"/>
  </clipPath>
</defs>
<image href="photo.jpg" width="200" height="200" clip-path="url(#circle-clip)"/>
```

### Path-Based Clip

```html
<defs>
  <clipPath id="wave-clip">
    <path d="M0 0 L200 0 L200 120 Q150 160 100 120 Q50 80 0 120 Z"/>
  </clipPath>
</defs>
<rect clip-path="url(#wave-clip)" width="200" height="160" fill="#6366f1"/>
```

### CSS clip-path (Simpler for Basic Shapes)

```css
/* Circle */
.avatar { clip-path: circle(50%); }

/* Rounded rectangle */
.card { clip-path: inset(0 round 16px); }

/* Diamond */
.badge { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }

/* Hexagon */
.hex { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }

/* Angled section */
.slant { clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); }
```

### SVG clipPath vs CSS clip-path

| Feature | SVG `<clipPath>` | CSS `clip-path` |
|---------|-----------------|-----------------|
| Shape complexity | Any SVG shape/path | Basic shapes + polygon |
| Animation | Via SMIL or JS | Via CSS transitions |
| Browser support | Excellent | Excellent (modern) |
| Syntax | Verbose (XML) | Concise |
| Best for | Complex shapes, SVG context | HTML elements, simple shapes |

---

## Masks

Masks use luminance or alpha to control visibility. White = visible, black = hidden, gray = semi-transparent.

### Luminance Mask

```html
<defs>
  <mask id="fade-mask">
    <linearGradient id="mask-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="white"/>
      <stop offset="100%" stop-color="black"/>
    </linearGradient>
    <rect fill="url(#mask-grad)" width="200" height="100"/>
  </mask>
</defs>
<image href="photo.jpg" width="200" height="100" mask="url(#fade-mask)"/>
```

### Text Mask (Knock-Out Text)

```html
<defs>
  <mask id="text-mask">
    <rect width="100%" height="100%" fill="white"/>
    <text x="50%" y="55%" text-anchor="middle" font-size="72" font-weight="bold" fill="black">
      HELLO
    </text>
  </mask>
</defs>
<rect mask="url(#text-mask)" width="400" height="120" fill="#6366f1"/>
```

This creates a solid rectangle with text cut out (knocked out).

### Circular Reveal Mask

```html
<defs>
  <mask id="reveal">
    <circle cx="100" cy="100" r="0" fill="white">
      <animate attributeName="r" from="0" to="150" dur="1s" fill="freeze"/>
    </circle>
  </mask>
</defs>
<image href="photo.jpg" width="200" height="200" mask="url(#reveal)"/>
```

---

## Pattern Fills

Repeat a small SVG element to fill a shape:

### Dot Pattern

```html
<defs>
  <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
    <circle cx="10" cy="10" r="2" fill="#6366f1" opacity="0.3"/>
  </pattern>
</defs>
<rect fill="url(#dots)" width="300" height="200"/>
```

### Diagonal Lines (Hatch)

```html
<defs>
  <pattern id="hatch" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"
    patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="10" stroke="#6366f1" stroke-width="1" opacity="0.2"/>
  </pattern>
</defs>
<rect fill="url(#hatch)" width="300" height="200"/>
```

### Grid Pattern

```html
<defs>
  <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>
  </pattern>
</defs>
<rect fill="url(#grid)" width="400" height="300"/>
```

---

## Blend Modes

Apply Photoshop-style blend modes to SVG elements:

```html
<circle cx="80" cy="80" r="60" fill="#6366f1"/>
<circle cx="120" cy="80" r="60" fill="#ec4899" style="mix-blend-mode: multiply"/>
```

Common blend modes: `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `difference`.

---

## Tips

- **Filter region:** Filters clip to the element's bounding box by default. For effects that extend beyond (blur, glow), set `x="-50%" y="-50%" width="200%" height="200%"` on the `<filter>` element
- **Gradient IDs must be unique** per document — if you inline multiple SVGs, their gradient IDs will collide. Namespace them (e.g., `id="card1-gradient"`)
- **Performance:** Complex filters (blur, color matrix) trigger GPU compositing. Avoid applying them to many elements simultaneously
- **CSS vs SVG filters:** CSS `filter: drop-shadow()` is simpler for basic shadows. Use SVG `<filter>` for complex chains
- **clip-path animation:** CSS `clip-path` with `polygon()` or `circle()` transitions smoothly — great for reveal effects
- **Pattern sizing:** `patternUnits="userSpaceOnUse"` uses the SVG coordinate system. `"objectBoundingBox"` uses 0-1 fractions of the target element

# Layout Composition

Most websites share the same skeleton: centered container, symmetric columns, uniform spacing. Layout composition is about breaking that pattern deliberately. By using asymmetry, overlap, diagonal flow, and depth, you create visual distinction that makes a site feel designed rather than assembled from a template.

---

## Asymmetric Grids

Divide the grid unevenly to create visual tension and hierarchy.

### 8-Column / 4-Column Split

```css
.asymmetric-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* On smaller screens, stack */
@media (max-width: 768px) {
  .asymmetric-layout {
    grid-template-columns: 1fr;
  }
}
```

### Named Grid Areas with Asymmetry

```css
.editorial-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 1.5rem;
  grid-template-areas:
    "hero   hero   hero   hero   hero   hero   hero   hero   side   side   side   side"
    "feat1  feat1  feat1  feat1  feat2  feat2  feat2  feat2  side   side   side   side"
    "wide   wide   wide   wide   wide   wide   wide   wide   wide   wide   wide   wide";
}

.editorial-hero  { grid-area: hero; }
.editorial-side  { grid-area: side; }
.editorial-feat1 { grid-area: feat1; }
.editorial-feat2 { grid-area: feat2; }
.editorial-wide  { grid-area: wide; }
```

### Golden Ratio Grid

```css
.golden-grid {
  display: grid;
  grid-template-columns: 1.618fr 1fr;
  gap: 2rem;
}
```

---

## Overlapping Elements

Create depth and visual interest by layering elements on top of each other.

### Negative Margin Technique

```css
.overlap-section {
  position: relative;
}

.overlap-image {
  width: 100%;
  border-radius: 12px;
}

.overlap-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-top: -4rem;        /* Pull up into the image */
  margin-left: 3rem;
  margin-right: 3rem;
  position: relative;
  z-index: 2;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

### Z-Index Layering with Absolute Positioning

```css
.layered-container {
  position: relative;
  min-height: 500px;
}

.layer-back {
  position: absolute;
  top: 2rem;
  left: 0;
  width: 65%;
  height: 400px;
  background: var(--color-accent-light);
  border-radius: 16px;
  z-index: 1;
}

.layer-mid {
  position: absolute;
  top: 4rem;
  left: 15%;
  width: 55%;
  z-index: 2;
}

.layer-mid img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.layer-front {
  position: absolute;
  bottom: 0;
  right: 5%;
  width: 40%;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  z-index: 3;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

### Overlapping Grid Items

```css
.overlap-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(6, 80px);
}

.overlap-grid__image {
  grid-column: 1 / 8;
  grid-row: 1 / 5;
}

.overlap-grid__text {
  grid-column: 6 / 13;   /* Overlaps columns 6-7 */
  grid-row: 3 / 7;       /* Overlaps rows 3-4 */
  background: white;
  padding: 2rem;
  z-index: 2;
  align-self: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}
```

---

## Diagonal Flow

Break horizontal monotony with angled section edges and transforms.

### Clip-Path Angled Sections

```css
/* Style 1: Simple angle */
.section-angled {
  clip-path: polygon(0 0, 100% 4%, 100% 96%, 0 100%);
  padding: 6rem 0;
  margin: -2rem 0;
}

/* Style 2: Arrow pointing down */
.section-arrow {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%);
  padding: 4rem 0 6rem;
}

/* Style 3: Curved edge */
.section-curved {
  clip-path: ellipse(75% 100% at 50% 0%);
  padding: 4rem 0 8rem;
}
```

### Skew Transforms

```css
.diagonal-bg {
  position: relative;
  overflow: hidden;
}

.diagonal-bg::before {
  content: '';
  position: absolute;
  inset: -10% 0;
  background: var(--color-surface-alt);
  transform: skewY(-3deg);
  z-index: -1;
}

/* Keep content straight */
.diagonal-bg__content {
  position: relative;
  z-index: 1;
}
```

### Diagonal Divider Between Sections

```css
.diagonal-divider {
  position: relative;
  padding-bottom: 4rem;
}

.diagonal-divider::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background: var(--next-section-bg);
  clip-path: polygon(0 100%, 100% 0, 100% 100%);
}
```

---

## Breaking the Grid

Intentionally let elements escape their containers for visual impact.

### Full-Bleed Image in Constrained Layout

```css
.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.full-bleed {
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
}

.full-bleed img {
  width: 100%;
  height: auto;
}
```

### Element Overflowing Container

```css
.feature-section {
  max-width: 1000px;
  margin: 0 auto;
  overflow: visible;   /* Allow children to escape */
}

.feature-image {
  width: 120%;          /* 20% wider than parent */
  margin-left: -10%;    /* Center the overflow */
  border-radius: 16px;
}
```

### Pull-Quote Breakout

```css
.pull-quote {
  width: calc(100% + 6rem);
  margin-left: -3rem;
  padding: 2rem 3rem;
  border-left: 4px solid var(--color-accent);
  background: var(--color-surface-alt);
  font-size: 1.5rem;
  font-style: italic;
}
```

---

## Z-Depth Layering

Create a sense of depth using stacked visual layers, no JavaScript needed.

### Stacked Background Layers

```css
.depth-section {
  position: relative;
  isolation: isolate;
}

.depth-layer-1 {
  position: absolute;
  inset: 0;
  background: var(--color-primary);
  opacity: 0.05;
  transform: translateY(0);
  z-index: -3;
}

.depth-layer-2 {
  position: absolute;
  inset: 2rem;
  background: var(--color-primary);
  opacity: 0.08;
  border-radius: 24px;
  z-index: -2;
}

.depth-layer-3 {
  position: absolute;
  inset: 4rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.06);
  z-index: -1;
}
```

### Card with Shadow Depth

```css
.depth-card {
  position: relative;
  background: white;
  border-radius: 12px;
  padding: 2rem;
}

/* Shadow layer beneath */
.depth-card::before {
  content: '';
  position: absolute;
  inset: 8px 16px -8px 16px;
  background: var(--color-accent);
  opacity: 0.15;
  border-radius: 12px;
  filter: blur(16px);
  z-index: -1;
}
```

---

## Viewport-Unit Techniques

Use viewport units for dramatic, screen-filling layouts.

### Full-Viewport Hero

```css
.hero {
  min-height: 100dvh;     /* dvh respects mobile browser chrome */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
```

### Viewport-Relative Typography with Clamp

```css
.display-heading {
  /* Minimum 2.5rem, scales with viewport, max 6rem */
  font-size: clamp(2.5rem, 5vw + 1rem, 6rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: clamp(1.125rem, 1.5vw + 0.5rem, 1.75rem);
  line-height: 1.4;
}

/* Viewport-scaled spacing */
.section {
  padding: clamp(3rem, 8vh, 8rem) 0;
}
```

### Viewport-Width Decorative Element

```css
.hero-accent-line {
  width: 40vw;
  height: 2px;
  background: var(--color-accent);
  margin: 2rem 0;
}
```

---

## Responsive Composition

Responsive design should not just reflow columns. At each breakpoint, reconsider the entire composition.

### Composition Shifts by Breakpoint

```css
.feature-layout {
  display: grid;
  gap: 2rem;
}

/* Mobile: stacked, image-first */
@media (max-width: 639px) {
  .feature-layout {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .feature-layout__image {
    order: -1;
    max-width: 280px;
    margin: 0 auto;
  }
}

/* Tablet: side-by-side, tighter */
@media (min-width: 640px) and (max-width: 1023px) {
  .feature-layout {
    grid-template-columns: 1fr 1fr;
    align-items: center;
  }
}

/* Desktop: asymmetric with overlap */
@media (min-width: 1024px) {
  .feature-layout {
    grid-template-columns: 3fr 2fr;
    align-items: center;
  }
  .feature-layout__image {
    margin-right: -4rem;  /* Overlap into text column */
  }
}
```

### Mobile-Specific Composition

```css
/* On mobile, convert horizontal layouts to vertical with different proportions */
@media (max-width: 639px) {
  .testimonial-card {
    flex-direction: column;
    text-align: center;
    padding: 2rem 1.5rem;
  }

  /* Make the avatar larger when stacked */
  .testimonial-card__avatar {
    width: 80px;
    height: 80px;
    margin: 0 auto 1rem;
  }

  /* Full-bleed cards on mobile for more impact */
  .card-grid {
    margin: 0 -1.5rem;
    gap: 0;
  }

  .card-grid .card {
    border-radius: 0;
    border-bottom: 1px solid var(--color-border);
  }
}
```

---

## The Anti-Grid

Magazine-style free-form layouts that feel curated and editorial.

### CSS Grid Free-Form Placement

```css
.magazine-layout {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: 60px;
  gap: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Large feature image: spans 7 cols, 5 rows */
.magazine-feature {
  grid-column: 1 / 8;
  grid-row: 1 / 6;
}

/* Tall narrow sidebar text */
.magazine-sidebar-text {
  grid-column: 9 / 13;
  grid-row: 2 / 7;
  padding: 1.5rem;
}

/* Wide caption below feature, offset right */
.magazine-caption {
  grid-column: 3 / 9;
  grid-row: 6 / 8;
  font-size: 1.25rem;
  font-style: italic;
  padding: 1rem 0;
}

/* Small inset image */
.magazine-inset {
  grid-column: 9 / 12;
  grid-row: 8 / 12;
}

/* Full-width pull quote */
.magazine-quote {
  grid-column: 1 / 13;
  grid-row: 13 / 15;
  font-size: 2rem;
  text-align: center;
  padding: 2rem;
  border-top: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
}
```

### Deliberate Spacing Variation

```css
/* Instead of uniform gap, vary spacing intentionally */
.editorial-flow > * + * {
  margin-top: 2rem;
}

.editorial-flow > .wide-image + * {
  margin-top: 4rem;
}

.editorial-flow > * + .pull-quote {
  margin-top: 3rem;
}

.editorial-flow > .pull-quote + * {
  margin-top: 3rem;
}

.editorial-flow > * + .section-break {
  margin-top: 6rem;
}
```

### Offset Grid Items

```css
/* Create visual rhythm by offsetting alternating items */
.offset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3rem 2rem;
}

.offset-grid > *:nth-child(even) {
  margin-top: 4rem;    /* Push even items down */
}
```

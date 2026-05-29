---
name: svg-mastery
description: >
  Expert knowledge for working with SVG (Scalable Vector Graphics) — optimization, embedding,
  animation, accessibility, responsive scaling, React integration, filters, and programmatic
  creation. Use when the user asks to "optimize SVG", "clean up SVG", "reduce SVG file size",
  "embed SVG in HTML", "inline SVG vs img tag", "animate SVG", "SVG stroke animation",
  "SVG morphing", "accessible SVG", "SVG viewBox", "responsive SVG", "SVG in React",
  "SVG sprite", "SVG gradient", "SVG filter", "clip-path", "SVG mask", "create SVG
  programmatically", "SVG path commands", "SVGO", "currentColor SVG". Also covers hand-authored
  vector work and SVG QA: "vector illustration", "draw SVG art", "isometric SVG", "SVG logo /
  custom mark / badge", "SVG pattern / background", "SVG text on path", "validate SVG", "why is
  my SVG broken / blank / clipped", "render SVG to PNG", "check SVG looks right", "fix SVG bug".
  Or any question about SVG best practices, techniques, or patterns. Complements icon-library
  (which sources icons) and graph-generation (which produces charts/diagrams/maps) by providing
  deep knowledge on how to author, optimize, validate, and manipulate SVGs correctly.
---

# SVG Mastery

> **Step 0 — plan first.** When you're *authoring* a new vector/infographic asset, run the **visual-planning** skill first: clarify the ask, lock the style, pin the message, decide what's IN/OUT, then draft. (Skip it when you're just optimizing, animating, or fixing an existing SVG — no new creative intent.)

Comprehensive reference for working with SVGs correctly — authoring hand-made vector, plus optimizing, validating, animating, and embedding any SVG.

## HARD RULES for authoring/editing SVG (must follow, do not skip)

These four rules are why authored SVGs come out beautiful instead of "basic." Skipping them produces the classic failures: flat tech-slop, off-message pictures, and clipped/garbled output. They apply whenever you **create or substantially edit** an SVG (not to a quick optimize/embed of an existing file).

1. **Write a "done-when" brief first.** Before drawing, pin **Goal / Context / Constraints / Done-when acceptance criteria**. The Done-when list *becomes the rubric you score against* at the end. (This complements the **visual-planning** gate above — planning picks the style/message; this turns it into a checkable spec.)
2. **Complex/structural scene → generate it scene-graph-first; don't hand-write coordinates.** If the asset has coordinate math (isometric/projection/arcs), repeated motifs, or **~30+ elements**, author a **JSON scene graph + a deterministic renderer** ([references/generative-svg.md](references/generative-svg.md)) — never eyeball raw polygon coordinates. Hand-written raw SVG is for small/standalone subjects only (icons, single marks, ≤~30 elements). For **data** charts/maps, don't even write a renderer — defer to **graph-generation** (D3 / Observable Plot / Vega-Lite).
3. **Informative SVG must be accessible by construction.** Emit `role="img"` + `<title>` (+ `<desc>` when it conveys meaning) *as you author*, never as a cleanup afterthought. Decorative SVG gets `aria-hidden="true"`.
4. **Never ship an unrendered SVG.** After authoring/editing, run the harness, `Read` the PNG, and **score it against the rubric** in [references/validation-and-qa.md](references/validation-and-qa.md):
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/skills/svg-mastery/scripts/render-qa.mjs <file.svg> --bg both
   ```
   Iterate up to **5 passes**; **accept a revision only if it strictly improves** the score; ship only when the rubric passes (no clipping/occlusion, clear focal point, no flat-SVG tells, a11y present). Generated SVG? Fix the **renderer/spec** and regenerate — never hand-patch the output.

**Decision in one line:** small/standalone subject → hand-write raw SVG · complex/structural/repeated → scene-graph + renderer ([generative-svg.md](references/generative-svg.md)) · data chart/diagram/map → **graph-generation** · pre-made UI icon → **icon-library** · photographic/painterly → **image-generation / image-sourcing**.

## Where svg-mastery sits

svg-mastery is a **downstream engine** in the media toolkit. The **`visual-planning`** gate decides *what* each asset should be and routes it; svg-mastery handles two jobs once an asset lands on it:

```
visual-planning  (the gate — decides the JOB → engine)
   ├─ explain / structure / data / numbers / map  → graph-generation (D3 · Mermaid · Draw.io)
   ├─ pre-made UI icon                            → icon-library (Lucide · Heroicons · Tabler)
   ├─ pure-tone raster decoration                 → image-generation / image-sourcing
   └─ hand-tuned / animated / custom VECTOR,      → svg-mastery   ◄── (a) AUTHOR it
        or a composed layout no pattern covers
                                                       │
   ANY SVG from any engine above ─────────────────────┘ ──► svg-mastery (b) OPTIMIZE · VALIDATE · ANIMATE · EMBED · QA
```

**svg-mastery never decides whether something should be a chart/diagram/icon** — that's the gate. It defers:
- Charts, diagrams, flowcharts, maps, standard infographic archetypes → **graph-generation**.
- Pre-made UI icons → **icon-library** (it can *tune/animate* a fetched icon, but never hand-draws standard ones).
- Raster/photographic decoration → **image-generation / image-sourcing**.

What it *owns*: hand-authored vector (illustration, isometric, logos/marks, patterns, typographic SVG, custom composed layouts) **and** the universal engineering/QA layer for every SVG, whoever produced it.

## When to Use

- User needs to optimize or clean up SVG files
- User asks about SVG embedding strategies (inline vs `<img>` vs sprite)
- User wants to animate SVG elements (stroke draw-on, morphing, motion paths)
- User needs accessible SVGs with proper ARIA attributes
- User asks about viewBox, responsive scaling, or preserveAspectRatio
- User is integrating SVGs into React/Next.js/Vite components
- User wants SVG filters, gradients, clip-paths, or masks
- User needs to create or manipulate SVGs programmatically
- User wants to **hand-author** vector art, an isometric scene, a custom logo/mark, a pattern/background, or typographic SVG
- User needs to **validate, debug, or QA** an SVG ("why is it blank/clipped?", "render it to check it looks right")
- User has SVGs from **icon-library** and needs to optimize/embed/animate/tune them
- User extracted SVGs from **graph-generation** and needs post-processing or validation

## When NOT to Use

- User wants pre-made UI icons → use **icon-library** skill (don't hand-draw standard icons here)
- User wants to generate charts, diagrams, flowcharts, maps, or standard infographic archetypes → use **graph-generation** skill
- User wants to generate raster / photographic images → use **image-generation** / **image-sourcing**
- User hasn't decided *what kind* of asset this should be → go through the **visual-planning** gate first

---

## Verify before you ship (the no-bugs rule)

**An SVG is not done until you've rendered it and looked at it.** Markup can be perfectly well-formed and still be the wrong picture — off-canvas shapes, invisible white-on-white fills, ID collisions, broken clips. No schema catches that (SVG 2 has no schema at all; SVG 1.1's DTD can't check coordinates or path grammar). The only reliable guarantee is the **render-and-inspect loop**:

```
emit/edit  →  render-qa.mjs <file> --bg both   (xmllint + rasterize @2×; auto-uses Chrome for CSS/fonts)
           →  Read the PNG and SCORE it against the rubric
           →  fix (the renderer/spec, if generated), repeat — max 5 passes, accept only improvements
```

This is **HARD RULE 4** above. The harness bundles the mechanical steps:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/svg-mastery/scripts/render-qa.mjs <file.svg> --bg both [--svgo]
```

Run it whenever you author or substantially edit an SVG. Full pipeline, the scored rubric, and the loop contract: [references/validation-and-qa.md](references/validation-and-qa.md). Common bugs and their fixes: [references/bug-catalog.md](references/bug-catalog.md).

## Authoring by visual type

When you're *creating* a vector asset, open the matching playbook (each loads only when needed and states what to route elsewhere):

| Asset | Playbook |
|-------|----------|
| **Complex scene — coord math, repeated motifs, ~30+ elements** (read FIRST) | [references/generative-svg.md](references/generative-svg.md) |
| Flat / vector illustration, blobs, scenes, hero art | [references/art-illustration.md](references/art-illustration.md) |
| Isometric / axonometric 3D-look scenes | [references/isometric.md](references/isometric.md) |
| Custom logo-mark, wordmark, badge, animated mark | [references/logos-marks.md](references/logos-marks.md) |
| Patterns, seamless tiles, gradient/mesh backgrounds, texture | [references/patterns-backgrounds.md](references/patterns-backgrounds.md) |
| Display type, text on a path, knock-out/gradient text | [references/typography-text.md](references/typography-text.md) |
| Composed layout *no graph-generation pattern covers* (stat panels, flows) | [references/custom-layouts.md](references/custom-layouts.md) |

The engineering layer applies to *all* of them: [generative-svg](references/generative-svg.md) · [validation-and-qa](references/validation-and-qa.md) · [bug-catalog](references/bug-catalog.md) · [path-geometry](references/path-geometry.md) · [toolchain-scripts](references/toolchain-scripts.md) · [optimization](references/optimization.md) · [animation-recipes](references/animation-recipes.md) · [filters-and-effects](references/filters-and-effects.md) · [react-integration](references/react-integration.md).

---

## SVG Fundamentals Quick Reference

### viewBox

```
viewBox="minX minY width height"
```

The viewBox defines the SVG's internal coordinate system. The SVG scales to fit its container while preserving the coordinate space. Always set viewBox — omitting it makes the SVG non-responsive.

### Basic Shapes

| Element | Key Attributes | Example |
|---------|---------------|---------|
| `<rect>` | x, y, width, height, rx (rounded) | `<rect x="0" y="0" width="100" height="50" rx="8"/>` |
| `<circle>` | cx, cy, r | `<circle cx="50" cy="50" r="40"/>` |
| `<ellipse>` | cx, cy, rx, ry | `<ellipse cx="50" cy="50" rx="40" ry="25"/>` |
| `<line>` | x1, y1, x2, y2 | `<line x1="0" y1="0" x2="100" y2="100"/>` |
| `<polyline>` | points | `<polyline points="0,0 50,25 100,0"/>` |
| `<polygon>` | points | `<polygon points="50,0 100,100 0,100"/>` |
| `<path>` | d | `<path d="M10 10 L90 90"/>` |

### Path Commands Cheat Sheet

| Command | Name | Parameters | Description |
|---------|------|-----------|-------------|
| M/m | Move to | x y | Move pen (no line drawn) |
| L/l | Line to | x y | Straight line |
| H/h | Horizontal line | x | Horizontal line |
| V/v | Vertical line | y | Vertical line |
| C/c | Cubic Bézier | x1 y1 x2 y2 x y | Curve with 2 control points |
| S/s | Smooth cubic | x2 y2 x y | Curve mirroring previous control point |
| Q/q | Quadratic Bézier | x1 y1 x y | Curve with 1 control point |
| T/t | Smooth quadratic | x y | Curve mirroring previous control point |
| A/a | Arc | rx ry rotation large-arc sweep x y | Elliptical arc |
| Z/z | Close path | — | Line back to start |

Uppercase = absolute coordinates. Lowercase = relative to current position.

### Structural Elements

| Element | Purpose | Use When |
|---------|---------|----------|
| `<g>` | Group elements | Apply shared transforms, styles, or event handlers |
| `<defs>` | Define reusable elements | Gradients, filters, clip-paths, symbols (not rendered directly) |
| `<use>` | Reference a defined element | Reuse a shape/group defined in `<defs>` |
| `<symbol>` | Define reusable template | Like `<g>` but supports its own viewBox — ideal for sprite sheets |

---

## Optimization

**Quick optimization** — run SVGO:

```bash
npx svgo input.svg -o output.svg
```

**Batch optimize a directory:**

```bash
npx svgo -f ./svgs -o ./svgs-optimized
```

**Manual cleanup checklist:**
1. Remove editor metadata (`<metadata>`, Illustrator/Sketch comments, `data-name` attributes)
2. Remove empty `<g>` groups and unnecessary nesting
3. Remove default attribute values (`fill-opacity="1"`, `stroke-miterlimit="4"`)
4. Round decimal precision: 1 decimal for icons, 2 for illustrations
5. Remove `xml:space="preserve"` unless whitespace matters in `<text>`
6. Collapse `<g>` with single child if it carries no attributes

**Typical savings:** 30-60% file size reduction on editor-exported SVGs.

→ Full SVGO config walkthrough: [references/optimization.md](references/optimization.md)

---

## Embedding Decision Matrix

| Method | Styleable | Animatable | Cacheable | Scriptable | Best For |
|--------|-----------|------------|-----------|------------|----------|
| Inline `<svg>` | ✅ CSS/JS | ✅ Full | ❌ | ✅ | Theming, animation, interactivity |
| `<img src>` | ❌ | ❌ | ✅ | ❌ | Static content images, CMS content |
| CSS `background-image` | ❌ | ❌ | ✅ | ❌ | Decorative backgrounds, CSS-only icons |
| `<object>` | Shadow DOM | ✅ | ✅ | ✅ Own scope | Interactive SVGs needing isolation |
| Data URI | ❌ | ❌ | With CSS | ❌ | Small SVGs in CSS, avoid extra request |
| SVG sprite `<use>` | Partial | ❌ | ✅ | ❌ | Icon systems with many repeated icons |

### Inline SVG

```html
<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
</svg>
```

### img Tag

```html
<img src="/icons/logo.svg" alt="Company logo" width="120" height="40">
```

### CSS Background

```css
.icon-search {
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>') no-repeat center;
  width: 24px; height: 24px;
}
```

### SVG Sprite

```html
<!-- sprite.svg -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-search" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="m21 21-4.3-4.3" fill="none" stroke="currentColor" stroke-width="2"/>
  </symbol>
  <symbol id="icon-home" viewBox="0 0 24 24">...</symbol>
</svg>

<!-- Usage -->
<svg width="24" height="24"><use href="#icon-search"/></svg>
```

---

## Accessibility Essentials

### Decorative SVG (no meaningful content)

```html
<svg aria-hidden="true" focusable="false">...</svg>
```

### Informative SVG (conveys meaning)

```html
<svg role="img" aria-labelledby="title-id desc-id" viewBox="0 0 24 24">
  <title id="title-id">Search</title>
  <desc id="desc-id">Magnifying glass icon for the search function</desc>
  <circle cx="11" cy="11" r="8"/>
  <path d="m21 21-4.3-4.3"/>
</svg>
```

### Inline Icon in Text

```html
<button>
  <span role="img" aria-label="Search">
    <svg aria-hidden="true" focusable="false">...</svg>
  </span>
  Search
</button>
```

**Rules:**
- If the SVG is purely decorative or has adjacent text label → `aria-hidden="true"`
- If the SVG is the only content conveying meaning → `role="img"` + `<title>` + optional `<desc>`
- Always add `focusable="false"` on decorative SVGs to prevent IE/Edge focus issues

---

## Responsive SVG Rules

### Rule 1: Set viewBox, Control Size with CSS

```html
<!-- Fluid SVG — scales to container -->
<svg viewBox="0 0 100 50">...</svg>
```

```css
svg { width: 100%; height: auto; }
```

Remove `width` and `height` attributes for fluid scaling. Add them back when you need a fixed size.

### preserveAspectRatio Cheat Sheet

| Value | Behavior |
|-------|----------|
| `xMidYMid meet` (default) | Scale uniformly to fit, centered — letterbox |
| `xMidYMid slice` | Scale uniformly to cover, centered — crop overflow |
| `none` | Stretch to fill — distorts aspect ratio |
| `xMinYMin meet` | Fit, aligned top-left |
| `xMaxYMax meet` | Fit, aligned bottom-right |

### Responsive Icon System

```css
:root {
  --icon-sm: 16px;
  --icon-md: 24px;
  --icon-lg: 32px;
  --icon-xl: 48px;
}
.icon { width: var(--icon-md); height: var(--icon-md); }
.icon-sm { width: var(--icon-sm); height: var(--icon-sm); }
.icon-lg { width: var(--icon-lg); height: var(--icon-lg); }
```

---

## Animation Quick Reference

### CSS Stroke Draw-On Effect

The most commonly requested SVG animation — draws a path as if being hand-written:

```css
.draw-on {
  stroke-dasharray: 1000;  /* Must be >= path total length */
  stroke-dashoffset: 1000;
  animation: draw 2s ease forwards;
}
@keyframes draw {
  to { stroke-dashoffset: 0; }
}
```

Get exact path length: `document.querySelector('path').getTotalLength()`

### GSAP Stroke Animation

```js
const path = document.querySelector('.logo-path');
const length = path.getTotalLength();
gsap.fromTo(path,
  { strokeDasharray: length, strokeDashoffset: length },
  { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' }
);
```

### Framer Motion Path Draw

```jsx
<motion.path
  d="M10 10 L90 90"
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 2, ease: "easeInOut" }}
/>
```

### SVG Transform Gotcha

SVG elements use `transform-origin: 0 0` by default (not center). Fix:

```css
.svg-element {
  transform-origin: center;
  transform-box: fill-box;  /* Origin relative to element's bounding box */
}
```

→ Full animation recipes (logo reveal, morphing, motion paths, stagger): [references/animation-recipes.md](references/animation-recipes.md)

---

## React / Web Framework Patterns

### currentColor for Theming

SVGs using `currentColor` inherit the parent element's text color — ideal for icons:

```jsx
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
</svg>
```

```css
.nav-link { color: #666; }
.nav-link:hover { color: #000; }  /* Icon color changes automatically */
```

### SVG as React Component

```tsx
interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}
const SearchIcon = ({ size = 24, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
    stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);
```

### Import Methods (Vite)

```tsx
// 1. As React component (requires vite-plugin-svgr)
import SearchIcon from './search.svg?react';

// 2. As raw string (built-in Vite support)
import searchSvg from './search.svg?raw';

// 3. As URL (built-in Vite support)
import searchUrl from './search.svg';
// <img src={searchUrl} alt="Search" />
```

### SVG + Tailwind CSS

```jsx
<svg className="w-6 h-6 text-gray-500 hover:text-gray-900 transition-colors"
  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
  ...
</svg>
```

Tailwind's `text-*` utilities set `color`, which `currentColor` picks up.

→ Full React patterns (Icon system, vite-plugin-svgr setup, Next.js, sprites): [references/react-integration.md](references/react-integration.md)

---

## Filters & Effects Quick Reference

### Linear Gradient

```html
<defs>
  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#6366f1"/>
    <stop offset="100%" stop-color="#ec4899"/>
  </linearGradient>
</defs>
<rect fill="url(#grad1)" width="200" height="100"/>
```

### Drop Shadow

```html
<defs>
  <filter id="shadow">
    <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
  </filter>
</defs>
<circle filter="url(#shadow)" cx="50" cy="50" r="40"/>
```

### Clip-Path

```html
<defs>
  <clipPath id="circle-clip">
    <circle cx="100" cy="100" r="80"/>
  </clipPath>
</defs>
<image href="photo.jpg" clip-path="url(#circle-clip)" width="200" height="200"/>
```

### CSS clip-path (simpler for basic shapes)

```css
.avatar { clip-path: circle(50%); }
.diamond { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }
```

→ Full filter reference (blur, color matrix, masks, glow effects, pattern fills): [references/filters-and-effects.md](references/filters-and-effects.md)

---

## Programmatic SVG Creation

### Vanilla JavaScript

Always use `createElementNS` — regular `createElement` won't work for SVG:

```js
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(SVG_NS, 'svg');
svg.setAttribute('viewBox', '0 0 100 100');

const circle = document.createElementNS(SVG_NS, 'circle');
circle.setAttribute('cx', '50');
circle.setAttribute('cy', '50');
circle.setAttribute('r', '40');
circle.setAttribute('fill', '#6366f1');

svg.appendChild(circle);
document.body.appendChild(svg);
```

### Server-Side SVG (Template Literals)

```js
function generateBadge(label, value, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 28">
    <rect width="80" height="28" rx="4" fill="#555"/>
    <rect x="80" width="120" height="28" rx="4" fill="${color}"/>
    <text x="40" y="18" text-anchor="middle" fill="#fff" font-size="12">${label}</text>
    <text x="140" y="18" text-anchor="middle" fill="#fff" font-size="12">${value}</text>
  </svg>`;
}
```

### D3.js SVG Generation

For data-driven SVGs, use D3 — see the **graph-generation** skill for full patterns. Extract the SVG:

```js
// After D3 renders, extract the SVG markup
const svgMarkup = document.querySelector('svg').outerHTML;
```

---

## Tips

- Always include `xmlns="http://www.w3.org/2000/svg"` on standalone SVG files (not needed for inline HTML5)
- Use `vector-effect="non-scaling-stroke"` to keep stroke width constant when scaling
- Prefer `<symbol>` over `<g>` in sprite sheets — `<symbol>` supports its own viewBox
- Use `currentColor` everywhere to make SVGs theme-adaptive in light/dark mode
- For icons, `viewBox="0 0 24 24"` with `stroke-width="2"` is the industry standard
- Sanitize SVGs from untrusted sources — SVGs can contain `<script>`, `<foreignObject>`, and event handlers
- Test SVGs in both light and dark contexts
- **Render and inspect before shipping** — well-formed ≠ correct ([references/validation-and-qa.md](references/validation-and-qa.md))

---

## Related skills

- **visual-planning** — the pre-generation gate; decides whether an asset is a vector (here), a chart/diagram (graph-generation), an icon (icon-library), or raster (image-generation). Start there for anything new.
- **graph-generation** — charts (D3), diagrams/flowcharts (Mermaid/Draw.io), maps, standard infographic archetypes. Hand them back here to optimize/validate/animate/embed.
- **icon-library** — sources pre-made UI icons; svg-mastery then optimizes/tunes/animates them.
- **image-generation / image-sourcing** — raster/photographic decoration (not vector).
- **visual-planning/references/infographic-design.md** — read before composing any infographic; svg-mastery's [custom-layouts.md](references/custom-layouts.md) is the fallback when no graph-generation pattern fits.

---
name: frontend-aesthetics
description: >
  Design guidance and aesthetic patterns for building beautiful, distinctive frontends — websites,
  web apps, landing pages. Provides typography strategies, color application, motion choreography,
  layout composition, and component design recipes. Use when the user asks to "make this look
  better", "improve the design", "it looks too generic", "add visual polish", "make it look
  professional", "design a landing page", "hero section design", "make it beautiful", or any
  request about visual quality of frontend code. Prevents generic "AI slop" by providing
  opinionated, intentional design patterns.
---

# Frontend Aesthetics

The "taste" skill. Turns generic frontend output into intentional, distinctive design through opinionated patterns and creative direction.

## When to Use

- User says the design "looks generic" or "like every other site"
- User asks to "make it look better" or "add polish"
- User is building a landing page, hero section, or marketing site
- User wants component design guidance (cards, CTAs, pricing tables, etc.)
- User wants animation/motion guidance for a frontend project

## When NOT to Use

- User wants a complete styleguide from scratch → use **styleguide** skill first
- User wants WCAG accessibility auditing → use **design-system**
- User wants to generate images → use **media-plugin/image-generation**

## The Anti-Slop Manifesto

Every design choice must be **intentional**. Default values are the enemy. If you cannot articulate WHY a color, font, or spacing value was chosen, it is wrong.

### The 5 Biggest AI Design Sins

1. **System fonts when the design calls for character** — Using Inter/Roboto/Arial when the project has personality. Fix: Choose distinctive fonts from the **styleguide** skill's font pairings.

2. **Gray-on-white when the content deserves drama** — Timid, washed-out color use. Fix: Commit to a dominant color. Use the 60-30-10 rule. Add depth with gradients and layered backgrounds.

3. **Perfectly symmetrical layouts when asymmetry creates energy** — Everything centered, evenly spaced, predictable. Fix: Use asymmetric grids, overlapping elements, and intentional size contrast.

4. **Uniform spacing when hierarchy needs breathing room** — Same padding everywhere, no rhythm. Fix: Use dramatic spacing jumps — tight within groups, generous between sections.

5. **Stock-looking components when the brand has personality** — Cookie-cutter cards, generic buttons, template-feeling sections. Fix: Add character through border radius choices, shadow styles, accent bars, and micro-details.

## Typography in Practice

Beyond choosing fonts (see **styleguide** skill), here's HOW to use them effectively:

### Extreme Weight Contrast

Use weight as a design tool, not just a hierarchy signal:

```css
/* Dramatic weight pairing */
.hero-title { font-weight: 900; letter-spacing: -0.03em; }
.hero-subtitle { font-weight: 300; letter-spacing: 0.02em; }

/* The contrast between 900 and 300 creates visual tension */
```

### Dramatic Size Jumps

Don't increment gradually — jump dramatically:

```css
/* Weak — incremental sizing */
.h1 { font-size: 28px; }
.h2 { font-size: 24px; }
.body { font-size: 16px; }

/* Strong — dramatic jumps */
.hero-title { font-size: 72px; }  /* 4.5x body */
.section-title { font-size: 36px; }  /* 2.25x body */
.body { font-size: 16px; }
```

### Letter-Spacing as a Design Tool

```css
/* Tight for large headlines — feels modern and confident */
.headline { letter-spacing: -0.03em; }

/* Wide for uppercase labels — feels premium and structured */
.label { text-transform: uppercase; letter-spacing: 0.15em; font-size: 12px; }

/* Normal for body — comfortable reading */
.body { letter-spacing: 0; }
```

### Font Loading Strategy

```html
<!-- Preload critical fonts to prevent FOUT -->
<link rel="preload" href="/fonts/heading.woff2" as="font" type="font/woff2" crossorigin>

<style>
@font-face {
  font-family: 'Heading';
  src: url('/fonts/heading.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately, swap when loaded */
}
</style>
```

## Color Application

Beyond choosing a palette (see **styleguide** skill), here's HOW to apply color:

### CSS Custom Properties Strategy

```css
:root {
  /* Semantic tokens — use THESE in components */
  --color-surface: var(--neutral-50);
  --color-surface-elevated: var(--neutral-0);
  --color-text-primary: var(--neutral-900);
  --color-text-secondary: var(--neutral-600);
  --color-text-muted: var(--neutral-400);
  --color-accent: var(--primary-500);
  --color-accent-hover: var(--primary-600);
  --color-border: var(--neutral-200);

  /* Primitive tokens — don't use directly in components */
  --primary-500: #3B82F6;
  --primary-600: #2563EB;
  --neutral-0: #FFFFFF;
  --neutral-50: #F8FAFC;
  /* ... */
}

[data-theme="dark"] {
  --color-surface: var(--neutral-900);
  --color-surface-elevated: var(--neutral-800);
  --color-text-primary: var(--neutral-50);
  /* Swap semantic tokens, primitives stay the same */
}
```

### The 60-30-10 Rule in Practice

```
60% — Dominant (backgrounds, large surfaces)  → neutral/white
30% — Secondary (cards, sections, containers) → primary or secondary color
10% — Accent (CTAs, highlights, active states) → accent color

The accent is SMALL but POWERFUL. Never dilute it across large areas.
```

### Gradient Techniques

```css
/* Layered gradients for depth */
.hero {
  background:
    radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
    linear-gradient(180deg, var(--neutral-950) 0%, var(--neutral-900) 100%);
}

/* Gradient text for headlines */
.gradient-text {
  background: linear-gradient(135deg, var(--primary-400), var(--accent-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Mesh gradient effect */
.mesh-bg {
  background-color: #0a0a0a;
  background-image:
    radial-gradient(at 40% 20%, hsla(228, 100%, 50%, 0.3) 0px, transparent 50%),
    radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 0.2) 0px, transparent 50%),
    radial-gradient(at 0% 50%, hsla(355, 85%, 60%, 0.15) 0px, transparent 50%);
}
```

### Dark Mode as First-Class Design

Dark mode is not just "invert the colors." It's a design choice:

```css
[data-theme="dark"] {
  /* Don't use pure black — use near-black for depth */
  --color-surface: #0F172A;          /* slate-900 */
  --color-surface-elevated: #1E293B; /* slate-800 — elevated = lighter in dark mode */

  /* Reduce text brightness — pure white is too harsh */
  --color-text-primary: #E2E8F0;    /* slate-200, not white */

  /* Saturated colors need desaturation in dark mode */
  --color-accent: #60A5FA;          /* blue-400 instead of blue-500 */

  /* Borders become subtle */
  --color-border: rgba(255, 255, 255, 0.08);

  /* Shadows become glows or are removed */
  --shadow-card: 0 0 0 1px rgba(255, 255, 255, 0.05);
}
```

## Component Design Recipes

See [references/component-recipes.md](references/component-recipes.md) for detailed patterns including:
- Hero sections with staggered reveal animations
- Feature cards with icon accents and hover states
- Testimonial cards with pull-quote styling
- Pricing tables with recommended plan highlight
- Dashboard stat cards with sparklines
- Scroll-aware navigation
- Newsletter footer CTAs
- Diagonal section dividers
- Bento grid layouts
- Floating action panels

## Spatial Composition

See [references/layout-composition.md](references/layout-composition.md) for techniques including:
- Asymmetric grids (8-col/4-col splits)
- Overlapping elements with negative margins
- Diagonal flow with clip-path and skew transforms
- Breaking the grid intentionally
- Z-depth layering and parallax effects
- Viewport-unit techniques for dramatic sizing
- Responsive composition strategies

## Motion Design

See [references/motion-choreography.md](references/motion-choreography.md) for patterns including:
- Page load orchestration with stagger timing
- Scroll-triggered reveals with IntersectionObserver
- Hover state progressions
- Page transition strategies
- Loading skeletons and micro-interactions
- @keyframes code and cubic-bezier timing functions

## Cross-Plugin References

- **design-system** — WCAG contrast checking, palette generation, type scale calculations
- **media-plugin/icon-library** — SVG icons from Lucide, Heroicons, Tabler
- **media-plugin/image-generation** — AI-generated hero images, backgrounds, illustrations
- **media-plugin/image-sourcing** — Stock photos from Unsplash/Pexels
- **styleguide** skill — create the foundational design language before applying these patterns
- **media-prompt-craft** skill — craft prompts for media assets that match the design direction

## Tips

- Apply these patterns AFTER establishing a styleguide — aesthetics without strategy is decoration
- Start with one strong design choice and let it inform the rest — a bold font, a striking color, an unusual layout
- Less is more: one well-executed animation beats ten scattered ones
- Test at real viewport sizes — designs that work at 1440px often break at 375px
- Use browser DevTools to test color contrast, font rendering, and animation performance

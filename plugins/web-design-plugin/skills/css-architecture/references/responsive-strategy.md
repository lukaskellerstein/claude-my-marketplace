# Responsive Design Strategy

Mobile-first responsive patterns for React/Vite websites using Tailwind CSS.

---

## Breakpoint System

Tailwind's default breakpoints (mobile-first — styles apply at that width and above):

| Breakpoint | Min Width | Target Devices | CSS |
|------------|-----------|----------------|-----|
| *(base)* | 0px | All phones (portrait) | No prefix |
| **sm** | 640px | Large phones (landscape), small tablets | `sm:` |
| **md** | 768px | Tablets (portrait) | `md:` |
| **lg** | 1024px | Small laptops, tablets (landscape) | `lg:` |
| **xl** | 1280px | Desktops | `xl:` |
| **2xl** | 1536px | Large screens | `2xl:` |

### When to Add Custom Breakpoints

Rarely. Tailwind's defaults cover 95% of cases. Only add custom breakpoints when:

- The design has a layout shift at a very specific width (e.g., 480px for a particular card grid)
- You need a max-width breakpoint for edge cases

```js
// tailwind.config.js — adding a custom breakpoint
screens: {
  'xs': '480px',   // Custom small breakpoint
  // ...defaults are preserved when using extend
}
```

---

## Mobile-First Approach

**Always write base styles for mobile first, then layer on larger breakpoints.**

### The Pattern

```html
<!-- Base (mobile) → sm → md → lg → xl -->
<div class="px-4 sm:px-6 lg:px-8">
<h1 class="text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

### Why Mobile-First?

1. **Mobile is the constraint.** Design for the smallest screen first, then add enhancements.
2. **Less CSS.** Base styles are simple; breakpoints only add changes.
3. **Tailwind is built for it.** Unprefixed classes are the base, breakpoint prefixes add overrides upward.

### Common Mistake

```html
<!-- WRONG: desktop-first thinking -->
<div class="grid grid-cols-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">

<!-- RIGHT: mobile-first -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

---

## Common Responsive Patterns

### Navigation: Horizontal to Hamburger

```tsx
function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        {/* Desktop: horizontal links */}
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <Button>Get Started</Button>
        </nav>

        {/* Mobile: hamburger */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="flex flex-col gap-4 pt-8">
              <a href="#features" className="text-lg font-medium">Features</a>
              <a href="#pricing" className="text-lg font-medium">Pricing</a>
              <Button className="mt-4 w-full">Get Started</Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
```

### Hero: Stacked to Side-by-Side

```tsx
function Hero() {
  return (
    <section className="section-py">
      <div className="container">
        {/* Stack on mobile, side-by-side on lg+ */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">

          {/* Text content — full width on mobile, half on desktop */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Your Headline Here
            </h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl lg:mt-6">
              Supporting description that explains the value proposition.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start lg:mt-8">
              <Button size="lg">Primary CTA</Button>
              <Button variant="outline" size="lg">Secondary CTA</Button>
            </div>
          </div>

          {/* Image/visual — below text on mobile, beside on desktop */}
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <img src="/hero.png" alt="" className="w-full" />
          </div>

        </div>
      </div>
    </section>
  )
}
```

### Card Grids: Progressive Column Growth

```tsx
function Features() {
  return (
    <section className="section-py">
      <div className="container">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Features</h2>

        {/* 1 col → 2 col → 3 col */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
```

### Typography: Scaling Down on Mobile

```html
<!-- Heading scale -->
<h1 class="text-3xl font-bold md:text-4xl lg:text-5xl xl:text-6xl">
<h2 class="text-2xl font-bold md:text-3xl lg:text-4xl">
<h3 class="text-xl font-semibold md:text-2xl">
<h4 class="text-lg font-semibold md:text-xl">

<!-- Body text -->
<p class="text-base md:text-lg">
<p class="text-sm md:text-base">  <!-- secondary text -->
```

### Spacing: Reduced on Mobile

```html
<!-- Section padding -->
<section class="py-16 md:py-20 lg:py-24">

<!-- Content gaps -->
<div class="space-y-8 md:space-y-12 lg:space-y-16">

<!-- Grid gaps -->
<div class="grid gap-4 md:gap-6 lg:gap-8">

<!-- Container padding (handled by container config, but manually): -->
<div class="px-4 sm:px-6 lg:px-8">
```

### Images: Full-Width to Constrained

```html
<!-- Full bleed on mobile, constrained on desktop -->
<div class="-mx-4 sm:mx-0 sm:rounded-lg sm:overflow-hidden">
  <img src="/image.jpg" class="w-full" alt="" />
</div>

<!-- Aspect ratio maintained -->
<div class="aspect-video w-full overflow-hidden rounded-lg">
  <img src="/image.jpg" class="h-full w-full object-cover" alt="" />
</div>
```

### Sidebar: Hidden on Mobile

```tsx
function Layout({ children }) {
  return (
    <div className="flex">
      {/* Sidebar: hidden on mobile, visible on lg+ */}
      <aside className="hidden w-64 shrink-0 border-r lg:block">
        <nav className="sticky top-16 p-4">
          {/* Sidebar navigation */}
        </nav>
      </aside>

      {/* Main content: full width on mobile */}
      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  )
}
```

---

## Container Strategy

### Centered Max-Width Container

Configure in Tailwind:

```js
// tailwind.config.js
container: {
  center: true,
  padding: {
    DEFAULT: '1rem',
    sm: '1.5rem',
    lg: '2rem',
  },
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1200px',  // Narrower than default 1280px — better for readability
  },
},
```

Usage:

```html
<div class="container">
  <!-- Centered, max-width 1200px, responsive padding -->
</div>
```

### Multiple Container Widths

For different section widths (e.g., narrow content, wide hero):

```html
<!-- Full-width hero -->
<section class="w-full">
  <div class="container">...</div>
</section>

<!-- Narrow content (blog post, about page) -->
<section>
  <div class="mx-auto max-w-3xl px-4">...</div>
</section>

<!-- Medium content (features, pricing) -->
<section>
  <div class="mx-auto max-w-5xl px-4">...</div>
</section>
```

### Fluid vs Fixed

| Approach | When to Use |
|----------|------------|
| **Fixed** (`container` with `max-width`) | Marketing pages, content sites — controls line length |
| **Fluid** (`w-full` with `px-*`) | Dashboards, data-heavy layouts — uses all available space |
| **Hybrid** | Hero full-width, content sections fixed-width |

---

## Container Queries

Use `@container` for component-level responsiveness (when a component needs to adapt to its parent's width, not the viewport).

### Setup

```bash
npm install -D @tailwindcss/container-queries
```

```js
// tailwind.config.js
plugins: [
  require('@tailwindcss/container-queries'),
],
```

### When to Use @container vs @media

| Use Case | Approach |
|----------|----------|
| Page layout changes | `@media` (Tailwind breakpoints) |
| Section column count | `@media` (Tailwind breakpoints) |
| Card internal layout | `@container` — card might be in a 2-col or 3-col grid |
| Sidebar widget layout | `@container` — sidebar width varies |
| Reusable component that appears in different contexts | `@container` |

### Example

```tsx
function ProductCard() {
  return (
    // Define as a container
    <div className="@container">
      <Card>
        {/* Stack on narrow containers, side-by-side on wide */}
        <div className="flex flex-col @md:flex-row @md:items-center gap-4">
          <img src="/product.jpg" className="aspect-square w-full rounded-md object-cover @md:w-32" />
          <div>
            <CardTitle>Product Name</CardTitle>
            <CardDescription>Product description text</CardDescription>
            <p className="mt-2 text-lg font-bold">$29.99</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

Container query breakpoints:

| Prefix | Min Width |
|--------|-----------|
| `@xs` | 320px |
| `@sm` | 384px |
| `@md` | 448px |
| `@lg` | 512px |
| `@xl` | 576px |
| `@2xl` | 672px |

---

## Responsive Typography

### Option 1: Breakpoint-Based (Simple)

Use Tailwind responsive prefixes for each heading level:

```html
<h1 class="text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
```

Pros: Explicit, easy to understand. Cons: Jumps between sizes at breakpoints.

### Option 2: Fluid Typography with clamp() (Smooth)

Typography smoothly scales between a minimum and maximum size:

```css
@layer utilities {
  .text-fluid-xl {
    font-size: clamp(2.25rem, 1.5rem + 3vw, 4.5rem);
  }
  .text-fluid-lg {
    font-size: clamp(1.875rem, 1.25rem + 2.5vw, 3.75rem);
  }
  .text-fluid-md {
    font-size: clamp(1.5rem, 1rem + 2vw, 3rem);
  }
  .text-fluid-sm {
    font-size: clamp(1.25rem, 1rem + 1vw, 2rem);
  }
  .text-fluid-base {
    font-size: clamp(1rem, 0.875rem + 0.5vw, 1.25rem);
  }
}
```

Usage:

```html
<h1 class="text-fluid-xl font-bold">Scales smoothly</h1>
```

### clamp() Formula

```
font-size: clamp(min, preferred, max)
```

- **min** — Smallest the text should ever be (mobile)
- **preferred** — A value using `vw` that scales with viewport
- **max** — Largest the text should ever be (desktop)

General formula: `clamp(mobileSize, mobileSize - sizeStep + (sizeStep / viewportRange) * 100vw, desktopSize)`

Simplified: `clamp(2rem, 1rem + 2vw, 4rem)` — starts at 2rem, grows with viewport, caps at 4rem.

### Option 3: Tailwind's Arbitrary clamp Values

```html
<h1 class="text-[clamp(2rem,1rem+3vw,4.5rem)]">
```

Works but harder to read. Better to define as a custom utility class.

---

## Touch Targets

### Minimum Sizes

Per WCAG 2.2 and Apple/Google HIG:

| Element | Minimum Size | Tailwind |
|---------|-------------|----------|
| Buttons | 44x44px | `min-h-11 min-w-11` (44px = 2.75rem = 11 in Tailwind) |
| Links in navigation | 44px height | `min-h-11 py-2` |
| Icon buttons | 44x44px | `h-11 w-11` |
| Form inputs | 44px height | `h-11` (Tailwind default `h-10` is 40px — increase for mobile) |

### Spacing Between Targets

Ensure at least 8px gap between interactive elements on mobile to prevent mis-taps:

```html
<nav class="flex flex-col gap-2">
  <!-- gap-2 = 8px between links -->
  <a href="#" class="min-h-11 flex items-center px-4">Link 1</a>
  <a href="#" class="min-h-11 flex items-center px-4">Link 2</a>
</nav>
```

### Expanding Touch Areas Without Visual Change

Use padding or pseudo-elements to make the tap target larger than the visible element:

```html
<!-- Small visual link, large tap target -->
<a href="#" class="relative inline-block py-3 text-sm after:absolute after:inset-x-0 after:-inset-y-2">
  Learn more
</a>
```

---

## Testing Checklist

Verify at each major breakpoint (320px, 640px, 768px, 1024px, 1280px, 1536px):

### Layout
- [ ] No horizontal scrollbar at any width
- [ ] Content doesn't overflow containers
- [ ] Grid columns collapse appropriately
- [ ] Hero section stacks correctly on mobile
- [ ] Sidebar hides/shows at the right breakpoint
- [ ] Footer stacks on mobile

### Navigation
- [ ] Desktop nav visible on lg+
- [ ] Hamburger menu visible on mobile/tablet
- [ ] Mobile menu opens and closes correctly
- [ ] All nav links are tappable (44px target)
- [ ] Sticky header doesn't overlap content

### Typography
- [ ] Headings are readable at all sizes (not too large on mobile, not too small on desktop)
- [ ] Body text line length is 45-75 characters on desktop
- [ ] Text doesn't overflow or get cut off
- [ ] Font sizes scale smoothly (if using clamp)

### Images & Media
- [ ] Images are full-width on mobile where intended
- [ ] Images don't stretch or distort
- [ ] Aspect ratios maintained
- [ ] Large images don't slow mobile load (verify lazy loading)

### Spacing
- [ ] Section padding reduces on mobile
- [ ] Card grid gaps are appropriate at each size
- [ ] Content doesn't touch screen edges (minimum 16px padding)

### Interactive Elements
- [ ] All buttons/links have 44x44px minimum touch target on mobile
- [ ] Form inputs are tall enough for easy tapping
- [ ] Hover states have equivalent focus states for keyboard
- [ ] No hover-only interactions that fail on touch

### Performance
- [ ] Verify with Chrome DevTools device emulation
- [ ] Test on real devices (iOS Safari, Android Chrome)
- [ ] Check for layout shifts (CLS) during resize
- [ ] Images serve appropriate sizes (srcset or responsive images)

### Accessibility
- [ ] Zoom to 200% — layout still usable
- [ ] Zoom to 400% — content still accessible (may reflow)
- [ ] `prefers-reduced-motion` respected for animations
- [ ] Color contrast passes WCAG AA at all breakpoint sizes
- [ ] Focus indicators visible at all sizes

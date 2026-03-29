# CSS Animation Patterns

CSS transitions, keyframe animations, hover states, and modern CSS animation APIs. Use these for simpler effects that don't require GSAP.

---

## CSS Transitions

### Property Transitions

```css
/* Single property */
.button {
  transition: background-color 300ms ease-out;
}

/* Multiple properties */
.card {
  transition: transform 300ms ease-out, box-shadow 300ms ease-out, opacity 200ms ease-out;
}

/* All properties (use sparingly — can cause unintended transitions) */
.element {
  transition: all 300ms ease-out;
}
```

### Common Easing Values

```css
:root {
  /* Smooth deceleration — most reveals and enters */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

  /* Smooth acceleration — exits */
  --ease-in: cubic-bezier(0.55, 0, 1, 0.45);

  /* Smooth both directions — UI state changes */
  --ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);

  /* Overshoot/bounce — playful interactions */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Sharp snap — toggles, switches */
  --ease-snap: cubic-bezier(0.2, 0, 0, 1);

  /* Spring-like — natural motion */
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

### Transition Shorthand Pattern

```css
.element {
  /* property duration timing-function delay */
  transition: transform 400ms var(--ease-out) 0ms,
              opacity 300ms var(--ease-out) 50ms;
}
```

---

## @keyframes Animations

### Fade In / Out

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.fade-in {
  animation: fadeIn 500ms var(--ease-out) forwards;
}
```

### Slide In from Directions

```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.slide-up {
  animation: slideInUp 600ms var(--ease-out) forwards;
}
```

### Scale / Bounce

```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.bounce-in {
  animation: bounceIn 600ms var(--ease-bounce) forwards;
}
```

### Skeleton Loading Shimmer

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    hsl(0 0% 90%) 25%,
    hsl(0 0% 95%) 50%,
    hsl(0 0% 90%) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

/* Dark mode variant */
.dark .skeleton {
  background: linear-gradient(
    90deg,
    hsl(0 0% 20%) 25%,
    hsl(0 0% 25%) 50%,
    hsl(0 0% 20%) 75%
  );
  background-size: 200% 100%;
}
```

### Pulse / Glow Effects

```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4);
  }
}

.pulse {
  animation: pulse 2s ease-in-out infinite;
}

.glow {
  animation: glow 2s ease-in-out infinite;
}

/* Scroll indicator bounce */
@keyframes scrollBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(8px);
  }
}

.scroll-indicator {
  animation: scrollBounce 1.5s ease-in-out infinite;
}
```

### Spin / Rotate

```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Half spin for toggles */
@keyframes flipIn {
  from {
    opacity: 0;
    transform: rotateY(-90deg);
  }
  to {
    opacity: 1;
    transform: rotateY(0);
  }
}
```

---

## Hover State Progressions

### Button Hover (Scale + Shadow + Color Shift)

```css
.button {
  padding: 12px 24px;
  background-color: hsl(220 90% 56%);
  color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transform: translateY(0);
  transition: transform 200ms var(--ease-out),
              box-shadow 200ms var(--ease-out),
              background-color 200ms var(--ease-out);
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: hsl(220 90% 50%);
}

.button:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition-duration: 100ms;
}
```

### Card Hover (Lift + Shadow)

```css
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transform: translateY(0);
  transition: transform 300ms var(--ease-out),
              box-shadow 300ms var(--ease-out);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.05);
}
```

### Image Hover (Zoom + Overlay)

```css
.image-container {
  overflow: hidden;
  border-radius: 12px;
  position: relative;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1);
  transition: transform 500ms var(--ease-out);
}

.image-container:hover img {
  transform: scale(1.08);
}

/* Gradient overlay on hover */
.image-container::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 300ms var(--ease-out);
}

.image-container:hover::after {
  opacity: 1;
}
```

### Link Underline Animations

```css
/* Slide-in underline from left */
.link-underline {
  position: relative;
  text-decoration: none;
}

.link-underline::after {
  content: "";
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 300ms var(--ease-out);
}

.link-underline:hover::after {
  transform: scaleX(1);
}

/* Center-out underline */
.link-center::after {
  transform-origin: center;
}

/* Existing underline that slides out on hover */
.link-out::after {
  transform: scaleX(1);
}

.link-out:hover::after {
  transform: scaleX(0);
  transform-origin: right;
}
```

---

## Page Load Animations

### CSS-Only Stagger Using animation-delay + nth-child

```css
.stagger-item {
  opacity: 0;
  transform: translateY(30px);
  animation: slideInUp 500ms var(--ease-out) forwards;
}

.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 80ms; }
.stagger-item:nth-child(3) { animation-delay: 160ms; }
.stagger-item:nth-child(4) { animation-delay: 240ms; }
.stagger-item:nth-child(5) { animation-delay: 320ms; }
.stagger-item:nth-child(6) { animation-delay: 400ms; }

/* Dynamic version using CSS custom properties */
.stagger-item {
  opacity: 0;
  transform: translateY(30px);
  animation: slideInUp 500ms var(--ease-out) forwards;
  animation-delay: calc(var(--index, 0) * 80ms);
}
```

**Usage with inline styles:**

```tsx
{items.map((item, i) => (
  <div
    key={item.id}
    className="stagger-item"
    style={{ "--index": i } as React.CSSProperties}
  >
    {item.content}
  </div>
))}
```

### Entry Animations with @starting-style (Modern CSS)

`@starting-style` defines the starting state for an element when it first renders or transitions from `display: none`.

```css
.dialog {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: opacity 300ms var(--ease-out),
              transform 300ms var(--ease-out),
              display 300ms allow-discrete;

  @starting-style {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
}

/* For elements that toggle display */
.toast {
  display: block;
  opacity: 1;
  transform: translateX(0);
  transition: opacity 300ms, transform 300ms, display 300ms allow-discrete;

  @starting-style {
    opacity: 0;
    transform: translateX(100%);
  }

  &[hidden] {
    display: none;
    opacity: 0;
    transform: translateX(100%);
  }
}
```

**Browser support:** Chrome 117+, Safari 17.5+, Firefox 129+. Progressive enhancement — falls back to instant display.

---

## View Transitions API

Basic setup for smooth page transitions in SPAs (React Router, etc.).

### Basic Setup

```tsx
// Wrap route changes in startViewTransition
function navigateTo(path: string) {
  if (!document.startViewTransition) {
    // Fallback for unsupported browsers
    router.navigate(path);
    return;
  }

  document.startViewTransition(() => {
    router.navigate(path);
  });
}
```

### Default Cross-Fade CSS

```css
/* The API provides these pseudo-elements automatically */
::view-transition-old(root) {
  animation: fadeOut 200ms ease-out;
}

::view-transition-new(root) {
  animation: fadeIn 300ms ease-out;
}
```

### Named Transitions (Shared Element)

```css
/* Mark elements that should transition between pages */
.hero-image {
  view-transition-name: hero;
}

/* Customize the transition for this specific element */
::view-transition-old(hero) {
  animation: slideOut 300ms ease-in;
}

::view-transition-new(hero) {
  animation: slideIn 300ms ease-out;
}
```

### React Integration Pattern

```tsx
import { useNavigate } from "react-router-dom";

function useViewTransitionNavigate() {
  const navigate = useNavigate();

  return (to: string) => {
    if (!document.startViewTransition) {
      navigate(to);
      return;
    }

    document.startViewTransition(() => {
      navigate(to);
    });
  };
}

// Usage
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const navigateWithTransition = useViewTransitionNavigate();

  return (
    <button onClick={() => navigateWithTransition(to)}>
      {children}
    </button>
  );
}
```

**Browser support:** Chrome 111+, Safari 18+. Not in Firefox yet. Always provide fallback.

---

## Scroll-Driven Animations (Modern CSS)

Native CSS scroll-linked animations without JavaScript. Use `scroll()` and `view()` timeline functions.

### Scroll Progress Bar

```css
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: hsl(220 90% 56%);
  transform-origin: left;
  transform: scaleX(0);
  animation: grow-progress linear;
  animation-timeline: scroll();
}

@keyframes grow-progress {
  to {
    transform: scaleX(1);
  }
}
```

### Element Reveal on Scroll (view())

```css
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Key properties:**
- `animation-timeline: scroll()` — ties to page scroll progress (0% at top, 100% at bottom)
- `animation-timeline: view()` — ties to element's visibility in the viewport
- `animation-range: entry 0% entry 100%` — animation plays as element enters the viewport
- `animation-range: cover 0% cover 100%` — animation plays across the element's full visibility range

### Parallax with Scroll Timeline

```css
.parallax-bg {
  animation: parallax linear;
  animation-timeline: scroll();
}

@keyframes parallax {
  from {
    transform: translateY(-20%);
  }
  to {
    transform: translateY(20%);
  }
}
```

**Browser support:** Chrome 115+, Safari 18+, Firefox 110+ (partial). Use GSAP ScrollTrigger as fallback for broader support.

---

## Utility Classes

Tailwind-compatible animation utility classes for quick prototyping and consistent animations across a project.

### CSS Custom Utility Classes

```css
/* Add to your global CSS or Tailwind @layer utilities */
@layer utilities {
  /* Fade animations */
  .animate-fade-in {
    animation: fadeIn 500ms var(--ease-out) forwards;
  }

  .animate-fade-in-up {
    animation: slideInUp 600ms var(--ease-out) forwards;
  }

  .animate-fade-in-down {
    animation: slideInDown 600ms var(--ease-out) forwards;
  }

  .animate-fade-in-left {
    animation: slideInLeft 600ms var(--ease-out) forwards;
  }

  .animate-fade-in-right {
    animation: slideInRight 600ms var(--ease-out) forwards;
  }

  /* Scale animations */
  .animate-scale-in {
    animation: scaleIn 400ms var(--ease-out) forwards;
  }

  .animate-bounce-in {
    animation: bounceIn 600ms var(--ease-bounce) forwards;
  }

  /* Stagger delay utilities */
  .delay-0 { animation-delay: 0ms; }
  .delay-1 { animation-delay: 80ms; }
  .delay-2 { animation-delay: 160ms; }
  .delay-3 { animation-delay: 240ms; }
  .delay-4 { animation-delay: 320ms; }
  .delay-5 { animation-delay: 400ms; }
  .delay-6 { animation-delay: 480ms; }
  .delay-7 { animation-delay: 560ms; }

  /* Hover utilities */
  .hover-lift {
    transition: transform 300ms var(--ease-out), box-shadow 300ms var(--ease-out);
  }
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }

  .hover-scale {
    transition: transform 200ms var(--ease-out);
  }
  .hover-scale:hover {
    transform: scale(1.05);
  }

  .hover-glow {
    transition: box-shadow 300ms var(--ease-out);
  }
  .hover-glow:hover {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  }

  /* Reduced motion — disable all custom animations */
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in,
    .animate-fade-in-up,
    .animate-fade-in-down,
    .animate-fade-in-left,
    .animate-fade-in-right,
    .animate-scale-in,
    .animate-bounce-in {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
}
```

### Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 500ms ease-out forwards",
        "fade-in-up": "slideInUp 600ms ease-out forwards",
        "slide-in-left": "slideInLeft 600ms ease-out forwards",
        "scale-in": "scaleIn 400ms ease-out forwards",
        "bounce-in": "bounceIn 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideInUp: {
          from: { opacity: "0", transform: "translateY(40px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
};
```

**Usage:**

```tsx
<div className="animate-fade-in-up">Fades in and slides up</div>
<div className="animate-fade-in-up [animation-delay:80ms]">Staggered</div>
<div className="animate-fade-in-up [animation-delay:160ms]">Staggered</div>
```

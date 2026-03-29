# Animation Performance Guide

How to keep animations at 60fps, avoid jank, respect user preferences, and optimize bundle size.

---

## The 60fps Rule

The browser has **16.67ms per frame** (1000ms / 60fps) to calculate, layout, paint, and composite. If your animation triggers layout or paint, it will likely miss the frame budget.

### What You Can Animate Cheaply

| Property | Cost | GPU-Composited |
|----------|------|----------------|
| `transform` (translate, scale, rotate) | Cheap | Yes |
| `opacity` | Cheap | Yes |
| `filter` (blur, brightness) | Medium | Yes (promoted layer) |
| `clip-path` | Medium | Depends |

### What You Should NOT Animate

| Property | Why |
|----------|-----|
| `width`, `height` | Triggers layout recalc for the element and its neighbors |
| `top`, `left`, `right`, `bottom` | Triggers layout (use `transform: translate()` instead) |
| `margin`, `padding` | Triggers layout |
| `border-width`, `border-radius` | Triggers layout + paint |
| `font-size` | Triggers layout |
| `box-shadow` | Triggers paint (expensive) — animate opacity of a pseudo-element with a fixed shadow instead |
| `background-color` | Triggers paint — acceptable for simple hovers, avoid in scroll animations |

### Instead Of / Use This

```css
/* BAD — triggers layout */
.element {
  top: 0;
  transition: top 300ms;
}
.element:hover {
  top: -4px;
}

/* GOOD — GPU-composited */
.element {
  transform: translateY(0);
  transition: transform 300ms;
}
.element:hover {
  transform: translateY(-4px);
}
```

```css
/* BAD — animating box-shadow is expensive */
.card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: box-shadow 300ms;
}
.card:hover {
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}

/* GOOD — animate opacity of a pseudo-element */
.card {
  position: relative;
}
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
  opacity: 0;
  transition: opacity 300ms;
  pointer-events: none;
}
.card:hover::after {
  opacity: 1;
}
```

---

## will-change Usage

`will-change` tells the browser to promote an element to its own GPU layer before the animation starts, avoiding the first-frame jank of layer creation.

### When to Use

```css
/* Use on elements that WILL animate soon (e.g., hover targets) */
.card:hover {
  will-change: transform;
}

/* Or set it just before animation via JS */
element.style.willChange = "transform";
// ... start animation ...
// After animation completes:
element.style.willChange = "auto";
```

### When NOT to Use

```css
/* BAD — don't apply will-change to everything */
* {
  will-change: transform, opacity;
}

/* BAD — don't leave will-change on permanently */
.element {
  will-change: transform; /* This is always on, wasting GPU memory */
}
```

### Gotchas

- Each `will-change` element creates a new compositing layer, consuming GPU memory
- Too many layers = "layer explosion" = worse performance than no `will-change`
- Remove `will-change` after animations complete
- GSAP handles this automatically with `force3D` — you rarely need `will-change` with GSAP

---

## GPU Layers

### How to Promote an Element

```css
/* Any 3D transform promotes to a GPU layer */
.promoted {
  transform: translateZ(0);
  /* or */
  transform: translate3d(0, 0, 0);
}

/* will-change also promotes */
.promoted {
  will-change: transform;
}
```

### Layer Explosion Prevention

Every GPU layer costs memory. On a page with 200 cards, promoting all of them wastes resources.

**Rules:**
1. Only promote elements that are actively animating
2. Remove promotion after animation completes
3. Use `contain: layout style paint` on animated containers to limit repaint scope
4. In GSAP, `force3D: "auto"` (the default) promotes during animation and removes after

```css
/* Contain the repaint blast radius */
.animated-section {
  contain: layout style paint;
}
```

---

## GSAP Performance Tips

### Use gsap.set() for Initial States

```tsx
// GOOD — set initial state immediately, no transition
gsap.set(".card", { opacity: 0, y: 60 });

// Then animate from those values
gsap.to(".card", {
  opacity: 1,
  y: 0,
  duration: 0.6,
  scrollTrigger: { trigger: ".cards", start: "top 80%" },
});
```

This is better than `gsap.from()` when you need to prevent flash-of-unstyled-content (FOUC). Set the initial state immediately, then animate to the final state.

### force3D

```tsx
// Default: "auto" — promotes to GPU layer during animation, removes after
gsap.to(".box", { x: 100, force3D: "auto" });

// Force GPU layer permanently (use sparingly)
gsap.to(".box", { x: 100, force3D: true });

// Never promote to GPU (for cases where 3D causes issues like z-index stacking)
gsap.to(".box", { x: 100, force3D: false });
```

### Overwrite Modes

Prevent conflicting tweens from stacking up (especially on rapid hover in/out).

```tsx
// Kill any existing tweens on this target before starting new one
gsap.to(".button", { scale: 1.1, overwrite: true });

// Or set globally
gsap.defaults({ overwrite: "auto" });
```

**Overwrite values:**
- `false` (default) — don't overwrite, let tweens stack
- `true` — immediately kill all other tweens on the same target
- `"auto"` — only kill tweens that conflict on the same properties

### Batch Processing with gsap.utils

```tsx
// Efficient: convert NodeList to array once
const cards = gsap.utils.toArray<HTMLElement>(".card");

// Use selector utility for scoped queries
const getChild = gsap.utils.selector(containerRef);
gsap.from(getChild(".title"), { opacity: 0 });
```

---

## ScrollTrigger Performance

### Debouncing Refresh

ScrollTrigger recalculates positions on resize. On pages with many triggers, this can be expensive.

```tsx
// Throttle refresh calls
ScrollTrigger.config({
  limitCallbacks: true,  // Only fire callbacks when actually in the viewport
  ignoreMobileResize: true, // Ignore resize events from mobile address bar changes
});
```

### Lazy Loading with ScrollTrigger.batch()

For pages with many repeated elements (50+ cards), use `batch` instead of individual ScrollTriggers.

```tsx
ScrollTrigger.batch(".card", {
  onEnter: (batch) => {
    gsap.to(batch, {
      opacity: 1,
      y: 0,
      stagger: 0.05,
      duration: 0.6,
      ease: "power2.out",
    });
  },
  start: "top 85%",
});

// Set initial state
gsap.set(".card", { opacity: 0, y: 60 });
```

**Why batch is better:**
- Creates ONE ScrollTrigger instead of one per element
- Groups elements that enter the viewport at the same time
- Automatically staggers within each batch

### Start/End Optimization

```tsx
// BAD — function-based start/end recalculates on every scroll
scrollTrigger: {
  start: () => `top ${window.innerHeight * 0.8}px`, // Recalculated constantly
}

// GOOD — static string (calculated once)
scrollTrigger: {
  start: "top 80%", // Parsed once, cached
}
```

### Kill ScrollTriggers You Don't Need

```tsx
// For one-time animations, kill the trigger after it fires
scrollTrigger: {
  trigger: el,
  start: "top 80%",
  once: true, // Automatically kills itself after firing
}
```

---

## prefers-reduced-motion

Always respect the user's motion preference. This is both an accessibility requirement and a performance win.

### CSS Implementation

```css
/* Disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### JavaScript Detection

```tsx
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
```

### GSAP Integration Pattern

```tsx
// Global approach — wrap all GSAP animations
function useReducedMotionGSAP(
  callback: () => void,
  options?: { scope?: React.RefObject<HTMLElement> }
) {
  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      // Show content immediately without animation
      gsap.set(".reveal-item, .card, .hero-title, .hero-subtitle, .hero-cta", {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        rotation: 0,
      });
      return;
    }

    callback();
  }, options);
}
```

### Graceful Degradation Per Animation Type

| Animation Type | Reduced Motion Behavior |
|---------------|------------------------|
| Scroll reveal (fade+slide) | Show content immediately, no animation |
| Stagger | Show all items at once, no stagger |
| Parallax | Disable entirely (static position) |
| Text split | Show text normally, no split animation |
| Page transition | Instant cut, no transition |
| Hover effects | Keep simple color changes, remove transform/scale |
| Loading spinners | Replace with static indicator or simple opacity pulse |
| Auto-play carousel | Stop auto-play, keep manual navigation |

```tsx
// Example: conditional animation
useGSAP(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    // Just make everything visible
    gsap.set([".card", ".title", ".subtitle"], { opacity: 1, y: 0 });
    return;
  }

  // Full animations
  const tl = gsap.timeline({
    scrollTrigger: { trigger: ref.current, start: "top 80%" },
  });

  tl.from(".title", { y: 40, opacity: 0, duration: 0.6 })
    .from(".subtitle", { y: 20, opacity: 0, duration: 0.4 }, "-=0.2")
    .from(".card", { y: 60, opacity: 0, stagger: 0.1, duration: 0.5 }, "-=0.2");
});
```

### Listen for Changes (user toggles preference while page is open)

```tsx
useEffect(() => {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const handler = (e: MediaQueryListEvent) => {
    if (e.matches) {
      // Kill all ScrollTriggers and show content
      ScrollTrigger.getAll().forEach((st) => st.kill());
      gsap.set("[data-animated]", { opacity: 1, transform: "none" });
    }
  };

  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}, []);
```

---

## Bundle Size

### Tree-Shaking GSAP

Only import what you use. GSAP is modular.

```tsx
// GOOD — only imports core + ScrollTrigger
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// BAD — imports everything
import gsap from "gsap/all";
```

### Approximate Bundle Sizes

| Module | Size (minified + gzip) |
|--------|----------------------|
| gsap (core) | ~26 KB |
| ScrollTrigger | ~12 KB |
| SplitText | ~5 KB |
| Draggable | ~12 KB |
| MotionPathPlugin | ~8 KB |
| ScrollToPlugin | ~2 KB |
| **Typical total** (core + ScrollTrigger + SplitText) | **~43 KB** |

### Lazy-Loading ScrollTrigger

For pages where scroll animations are below the fold, lazy-load the plugin.

```tsx
// Load ScrollTrigger only when needed
async function initScrollAnimations() {
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  // Now create ScrollTrigger animations
  gsap.from(".section", {
    opacity: 0,
    y: 60,
    scrollTrigger: {
      trigger: ".section",
      start: "top 80%",
    },
  });
}

// Call when the user scrolls near the animated sections
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      initScrollAnimations();
      observer.disconnect();
    }
  },
  { rootMargin: "200px" } // Start loading 200px before visible
);

observer.observe(document.querySelector(".scroll-sections")!);
```

---

## Mobile Performance

### Simpler Animations on Mobile

Complex staggers and parallax effects that run smoothly on desktop can cause jank on lower-powered mobile devices.

```tsx
useGSAP(() => {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (isMobile) {
    // Simpler animation: just fade, no slide or stagger
    gsap.from(".card", {
      opacity: 0,
      duration: 0.5,
      scrollTrigger: { trigger: ".cards", start: "top 85%" },
    });
  } else {
    // Full desktop animation with stagger and transforms
    gsap.from(".card", {
      opacity: 0,
      y: 60,
      scale: 0.95,
      rotation: 2,
      stagger: 0.1,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: { trigger: ".cards", start: "top 80%" },
    });
  }
});
```

### IntersectionObserver Fallback

For situations where GSAP is too heavy or you want a zero-JS-dependency fallback:

```tsx
function useScrollReveal(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );

    el.querySelectorAll("[data-reveal]").forEach((child) => {
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, [ref]);
}
```

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}

[data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger via transition-delay */
[data-reveal]:nth-child(2) { transition-delay: 80ms; }
[data-reveal]:nth-child(3) { transition-delay: 160ms; }
[data-reveal]:nth-child(4) { transition-delay: 240ms; }
```

### Touch Considerations

- **Disable hover animations on touch devices** — hover states are sticky on mobile
- **Avoid parallax on mobile** — scroll performance is worse, and parallax feels unnatural with touch scrolling
- **Reduce stagger counts** — on a 12-card grid, stagger 4 at a time instead of individually
- **Avoid `position: fixed` animations** — fixed positioning is expensive on mobile Safari

```tsx
const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

if (!isTouch) {
  // Enable parallax only on non-touch devices
  gsap.to(".parallax-bg", {
    yPercent: -30,
    scrollTrigger: { trigger: ".hero", scrub: true },
  });
}
```

---

## Measuring Performance

### Chrome DevTools Performance Panel

1. Open DevTools > Performance tab
2. Check "Screenshots" and "Web Vitals"
3. Click Record, perform the animation, stop recording
4. Look for:
   - **Red bars** in the frame chart — these are dropped frames
   - **Long tasks** (>50ms) in the Main thread — these block animation
   - **Layout** events during animation — you're animating a layout property
   - **Paint** events during animation — you're animating a paint property

### Animation Frame Budget

```
16.67ms total per frame:
  - JavaScript:  ~6ms   (GSAP tick, event handlers)
  - Style calc:  ~2ms   (CSS property resolution)
  - Layout:      ~0ms   (should be zero during animation)
  - Paint:       ~0ms   (should be zero for composited animations)
  - Composite:   ~2ms   (GPU layer composition)
  - Headroom:    ~6ms   (browser overhead, garbage collection)
```

### Quick Performance Check

```tsx
// Log frame rate during animation
function measureFPS(duration = 3000) {
  let frames = 0;
  let start = performance.now();

  function count() {
    frames++;
    if (performance.now() - start < duration) {
      requestAnimationFrame(count);
    } else {
      const fps = Math.round(frames / (duration / 1000));
      console.log(`Average FPS: ${fps}`);
    }
  }

  requestAnimationFrame(count);
}
```

### GSAP Debug Helper

```tsx
// Show ScrollTrigger markers in development
if (import.meta.env.DEV) {
  ScrollTrigger.defaults({ markers: true });
}
```

This adds visible markers on the page showing exactly where each ScrollTrigger starts and ends — invaluable for debugging scroll animations.

### Performance Checklist

- [ ] All animations only use `transform` and `opacity`
- [ ] No layout thrashing (read then write, not interleaved)
- [ ] `will-change` removed after animation completes
- [ ] ScrollTrigger.batch() used for 10+ repeated elements
- [ ] `once: true` on one-time reveal animations
- [ ] `prefers-reduced-motion` respected
- [ ] Parallax disabled on mobile/touch devices
- [ ] GSAP plugins lazy-loaded where appropriate
- [ ] No more than 20 active ScrollTriggers on a single page
- [ ] `markers: true` removed before production build
- [ ] Animations tested on low-end Android device

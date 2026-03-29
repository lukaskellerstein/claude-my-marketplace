---
name: animation-system
description: >
  CSS and GSAP animation patterns for websites — ScrollTrigger, timelines, stagger effects,
  page transitions, micro-interactions, and performance optimization. Use when implementing
  animations for web design projects, when the user wants scroll-triggered animations, page
  load reveals, GSAP integration with React/Vite, animation planning, performance best
  practices, or when a design document specifies animations for sections.
---

# Animation System

Implementation-focused animation patterns for websites using CSS animations and GSAP (GreenSock Animation Platform). This skill bridges the gap between design intent and animation implementation.

---

## 1. Animation Philosophy

**Purposeful motion, not decorative noise.**

Every animation must serve one of these roles:
- **Guide attention** — draw the eye to what matters (CTA, key content)
- **Communicate state** — show that something changed (loading, success, error)
- **Create spatial context** — reveal where content lives (scroll reveals, page transitions)
- **Provide feedback** — confirm user interaction (hover, click, drag)

If an animation doesn't serve one of these, remove it.

### Timing Principles

| Category | Duration | Use For |
|----------|----------|---------|
| **Micro** | 150–300ms | Hover states, button feedback, toggles, tooltips |
| **Standard** | 300–500ms | Menu open/close, accordion, tab switch, card reveals |
| **Complex** | 500–800ms | Modal transitions, stagger sequences, section reveals |
| **Page** | 800–1200ms | Page transitions, hero load sequences, full-screen overlays |

### Easing Guidelines

| Ease | GSAP | CSS | When |
|------|------|-----|------|
| **Smooth deceleration** | `power2.out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Most reveals, enter animations |
| **Smooth acceleration** | `power2.in` | `cubic-bezier(0.55, 0, 1, 0.45)` | Exit animations, elements leaving |
| **Snap/overshoot** | `back.out(1.4)` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful UI, bouncy buttons |
| **Natural motion** | `power3.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Large movements, slides |
| **Linear** | `none` | `linear` | Progress bars, continuous spin |

### Performance-First Rules

1. **Only animate `transform` and `opacity`** — these are GPU-composited and don't trigger layout/paint
2. **Respect `prefers-reduced-motion`** — always provide a reduced-motion path
3. **Stagger > simultaneous** — staggered animations feel lighter on the GPU than 20 elements animating at once
4. **Lazy-load ScrollTrigger** — don't initialize scroll animations above the fold

---

## 2. CSS vs GSAP Decision Matrix

### Use CSS When:
- Simple hover/focus state transitions (color, scale, shadow)
- Loading spinners and skeleton shimmer effects
- UI state transitions (accordion open, toggle switch)
- Single-property transitions (opacity fade, background color)
- `@starting-style` entry animations (modern browsers)
- Animations that must work without JavaScript

### Use GSAP When:
- Scroll-triggered reveals (ScrollTrigger)
- Complex multi-step timelines (hero load sequence)
- Stagger sequences across multiple elements
- Text splitting animations (SplitText plugin)
- Parallax effects tied to scroll position
- Physics-based motion or spring animations
- Precise orchestration with labels and callbacks
- Animations that need scrubbing (tied to scroll progress)
- Horizontal scroll sections or pin effects
- Anything requiring `.from()`, `.fromTo()`, or timeline control

### Hybrid Approach (Recommended):
- **CSS** for hover states, focus rings, loading UI, simple transitions
- **GSAP** for scroll reveals, page load sequences, complex interactions
- This minimizes JS bundle while keeping powerful scroll animations

---

## 3. GSAP Setup in React/Vite

### Installation

```bash
npm install gsap @gsap/react
```

### Plugin Registration (do once, at app entry)

```tsx
// src/main.tsx or src/App.tsx
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);
```

### useGSAP Hook Pattern

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

function AnimatedSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // All GSAP code here — auto-cleanup on unmount
      gsap.from(".card", {
        y: 60,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
      });
    },
    { scope: containerRef } // Scopes all selectors to this container
  );

  return (
    <div ref={containerRef}>
      <div className="card">Card 1</div>
      <div className="card">Card 2</div>
      <div className="card">Card 3</div>
    </div>
  );
}
```

**Key points:**
- `useGSAP` handles cleanup automatically (kills tweens + ScrollTriggers on unmount)
- `scope` restricts all string selectors to the container (no leaking)
- All GSAP code goes inside the callback — never in useEffect

---

## 4. Core Animation Patterns

### Page Load Orchestration
A master timeline that sequences: hero background → headline reveal → subtitle fade → CTA bounce-in → nav fade → scroll indicator pulse.

See: [references/gsap-patterns.md → Timeline Patterns](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/gsap-patterns.md)

### Scroll-Triggered Section Reveals
Elements fade + slide into view as the user scrolls. The most common animation on modern websites.

See: [references/gsap-patterns.md → ScrollTrigger Patterns](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/gsap-patterns.md)

### Stagger Animations
Cards, list items, or grid cells appear one-by-one with a delay offset. Creates a "wave" effect.

See: [references/gsap-patterns.md → Stagger Patterns](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/gsap-patterns.md)

### Parallax Effects
Background images or decorative elements move at different speeds during scroll, creating depth.

See: [references/gsap-patterns.md → Parallax Patterns](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/gsap-patterns.md)

### Text Animations
Headlines split into characters/words/lines and animate individually. High-impact for hero sections.

See: [references/gsap-patterns.md → Text Animation Patterns](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/gsap-patterns.md)

### Hover Progressions
Multi-property CSS transitions on hover: scale + shadow + color shift simultaneously.

See: [references/css-animations.md → Hover State Progressions](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/css-animations.md)

### Page Transitions
Smooth transitions between routes using the View Transitions API or GSAP-powered overlays.

See: [references/css-animations.md → View Transitions API](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/css-animations.md)

---

## 5. Animation Plan Template

When documenting animations in a design document, use this format for each section:

```markdown
### Section: [Name]
- **Trigger:** scroll-enter | page-load | hover | click
- **Type:** reveal | stagger | parallax | text-split
- **Elements:** [what animates]
- **From → To:** opacity 0→1, y 60→0
- **Duration:** 600ms
- **Ease:** power2.out
- **Stagger:** 100ms (if applicable)
- **GSAP or CSS:** [choice + reason]
```

### Example: Landing Page Animation Plan

```markdown
### Section: Hero
- **Trigger:** page-load
- **Type:** text-split + reveal
- **Elements:** h1 (split words), subtitle (fade), CTA button (bounce)
- **From → To:** h1 words: y 40→0, opacity 0→1 | subtitle: opacity 0→1 | CTA: scale 0.8→1
- **Duration:** h1: 800ms, subtitle: 500ms, CTA: 600ms
- **Ease:** h1: power3.out, CTA: back.out(1.4)
- **Stagger:** h1 words: 60ms
- **GSAP or CSS:** GSAP — timeline orchestration + SplitText

### Section: Features Grid
- **Trigger:** scroll-enter
- **Type:** stagger
- **Elements:** 6 feature cards
- **From → To:** y 60→0, opacity 0→1, scale 0.95→1
- **Duration:** 600ms per card
- **Ease:** power2.out
- **Stagger:** 100ms
- **GSAP or CSS:** GSAP — ScrollTrigger + stagger

### Section: Testimonials
- **Trigger:** scroll-enter
- **Type:** reveal
- **Elements:** quote text, author avatar, author name
- **From → To:** opacity 0→1, y 30→0
- **Duration:** 500ms
- **Ease:** power2.out
- **Stagger:** 150ms
- **GSAP or CSS:** GSAP — ScrollTrigger

### Section: CTA Banner
- **Trigger:** scroll-enter
- **Type:** parallax + reveal
- **Elements:** background (parallax), headline (reveal), button (bounce)
- **From → To:** bg: y -50→50 | headline: opacity 0→1, y 40→0 | button: scale 0.9→1
- **Duration:** headline: 600ms, button: 500ms
- **Ease:** headline: power2.out, button: back.out(1.2)
- **GSAP or CSS:** GSAP — parallax requires scrub ScrollTrigger
```

---

## 6. Reference Files

| File | What It Covers |
|------|---------------|
| [references/gsap-patterns.md](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/gsap-patterns.md) | Full GSAP code — ScrollTrigger, timelines, staggers, text, parallax, reusable React components |
| [references/css-animations.md](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/css-animations.md) | CSS transitions, @keyframes, hover states, View Transitions API, scroll-driven animations |
| [references/animation-recipes.md](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/animation-recipes.md) | Complete per-section recipes — hero, features, testimonials, stats, gallery, pricing, nav, footer |
| [references/performance.md](${CLAUDE_PLUGIN_ROOT}/skills/animation-system/references/performance.md) | 60fps rules, GPU layers, prefers-reduced-motion, bundle size, mobile optimization, DevTools |

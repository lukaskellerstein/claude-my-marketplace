# Motion Choreography

Motion choreography is the deliberate sequencing and coordination of animations to guide user attention and create a sense of spatial coherence. Unlike isolated animations (a button bouncing, a card fading), choreography treats the entire viewport as a stage where elements enter, exit, and transform in a purposeful order. Good choreography feels invisible — the user simply perceives the interface as alive and responsive.

---

## Page Load Orchestration

Stagger child elements so they cascade into view rather than appearing all at once.

### Stagger Timing Pattern

Use a consistent delay increment (80ms works well for most cases):

| Element   | Delay |
|-----------|-------|
| Header    | 0ms   |
| Hero text | 80ms  |
| Hero CTA  | 160ms |
| Cards row | 240ms |
| Footer    | 320ms |

### Keyframes

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### CSS-Only Stagger (No JavaScript)

```css
.stagger-container > * {
  opacity: 0;
  animation: fade-in-up 500ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}

.stagger-container > *:nth-child(1) { animation-delay: 0ms; }
.stagger-container > *:nth-child(2) { animation-delay: 80ms; }
.stagger-container > *:nth-child(3) { animation-delay: 160ms; }
.stagger-container > *:nth-child(4) { animation-delay: 240ms; }
.stagger-container > *:nth-child(5) { animation-delay: 320ms; }
.stagger-container > *:nth-child(6) { animation-delay: 400ms; }
```

For dynamic lists, use a CSS custom property set inline:

```css
.stagger-container > * {
  animation-delay: calc(var(--i, 0) * 80ms);
}
```

```html
<div class="stagger-container">
  <div style="--i: 0">First</div>
  <div style="--i: 1">Second</div>
  <div style="--i: 2">Third</div>
</div>
```

---

## Scroll-Triggered Reveals

Reveal elements as the user scrolls them into view using IntersectionObserver.

### Complete JavaScript Pattern

```javascript
function initScrollReveals() {
  const revealElements = document.querySelectorAll('[data-reveal]');

  if (!revealElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // animate only once
        }
      });
    },
    {
      threshold: 0.15,     // trigger when 15% visible
      rootMargin: '0px 0px -60px 0px', // offset bottom trigger point
    }
  );

  revealElements.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', initScrollReveals);
```

### Fade-In-Up on Scroll (CSS)

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 600ms cubic-bezier(0.25, 0.1, 0.25, 1),
              transform 600ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

[data-reveal].revealed {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children within a revealed container */
[data-reveal-stagger].revealed > * {
  opacity: 0;
  animation: fade-in-up 500ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}

[data-reveal-stagger].revealed > *:nth-child(1) { animation-delay: 0ms; }
[data-reveal-stagger].revealed > *:nth-child(2) { animation-delay: 100ms; }
[data-reveal-stagger].revealed > *:nth-child(3) { animation-delay: 200ms; }
```

### Threshold Options

| Threshold | Behavior                                | Best for                |
|-----------|-----------------------------------------|-------------------------|
| 0         | Triggers when any pixel enters viewport | Tall elements, images   |
| 0.15      | Triggers at 15% visibility             | Cards, text blocks      |
| 0.5       | Triggers at 50% visibility             | Small elements, icons   |
| 1.0       | Triggers when fully visible            | Rarely used             |

---

## Hover State Progressions

Hover transitions should animate multiple properties simultaneously with a unified easing curve.

### Multi-Property Hover Transition

```css
.card {
  background: var(--surface);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transform: translateY(0);
  transition:
    transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1),
    background 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  background: var(--surface-hover);
}

.card:active {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition-duration: 100ms;
}
```

### Cubic-Bezier Recommendations

| Feel    | Value                             | Character                                      |
|---------|-----------------------------------|-------------------------------------------------|
| Snappy  | `cubic-bezier(0.4, 0, 0.2, 1)`   | Fast start, smooth decel. Best for UI responses |
| Gentle  | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Even, relaxed. Best for entrances and fades   |
| Bouncy  | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoots then settles. Best for playful UI  |

### Button with Bouncy Hover

```css
.btn-playful {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-playful:hover {
  transform: scale(1.05);
}

.btn-playful:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
```

---

## Page Transitions

Use the CSS View Transitions API for smooth page-to-page navigation.

### View Transitions API Pattern

```css
/* Opt elements into transitions */
.page-header {
  view-transition-name: page-header;
}

.main-content {
  view-transition-name: main-content;
}

/* Default cross-fade */
::view-transition-old(root) {
  animation: fade-out 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-new(root) {
  animation: fade-in 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

@keyframes fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Slide the main content */
::view-transition-old(main-content) {
  animation: slide-out-left 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-new(main-content) {
  animation: slide-in-right 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

@keyframes slide-out-left {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(-30px); opacity: 0; }
}

@keyframes slide-in-right {
  from { transform: translateX(30px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
```

### JavaScript Trigger

```javascript
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a[data-transition]');
  if (!link) return;

  e.preventDefault();

  if (!document.startViewTransition) {
    window.location.href = link.href;
    return;
  }

  const transition = document.startViewTransition(async () => {
    const response = await fetch(link.href);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    document.querySelector('main').replaceWith(doc.querySelector('main'));
  });
});
```

---

## Loading Skeletons

Shimmer and pulse animations for content placeholders during loading states.

### Shimmer Animation

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--skeleton-base, #e2e2e2) 25%,
    var(--skeleton-shine, #f5f5f5) 50%,
    var(--skeleton-base, #e2e2e2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Skeleton shapes */
.skeleton-text {
  height: 14px;
  margin-bottom: 8px;
  width: 100%;
}

.skeleton-text:last-child {
  width: 60%;
}

.skeleton-heading {
  height: 24px;
  width: 45%;
  margin-bottom: 16px;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
}
```

### Pulse Animation

```css
.skeleton-pulse {
  background: var(--skeleton-base, #e2e2e2);
  animation: pulse 1.8s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
  border-radius: 4px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
```

---

## Continuous Ambient Motion

Subtle, looping animations for decorative or background elements.

### Floating Animation

```css
.floating-element {
  animation: float 6s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  33% {
    transform: translateY(-12px) rotate(1deg);
  }
  66% {
    transform: translateY(6px) rotate(-0.5deg);
  }
}

/* Offset multiple floating elements */
.floating-element:nth-child(2) { animation-delay: -2s; animation-duration: 7s; }
.floating-element:nth-child(3) { animation-delay: -4s; animation-duration: 5s; }
```

### Subtle Parallax (CSS Only)

```css
.parallax-container {
  overflow-y: auto;
  perspective: 1px;
  height: 100vh;
}

.parallax-layer--back {
  transform: translateZ(-2px) scale(3);
  position: absolute;
  inset: 0;
  z-index: -1;
}

.parallax-layer--base {
  transform: translateZ(0);
  position: relative;
  z-index: 1;
}
```

### Rotating Gradient Background

```css
.ambient-gradient {
  background: conic-gradient(
    from 0deg,
    var(--color-1),
    var(--color-2),
    var(--color-3),
    var(--color-1)
  );
  animation: rotate-gradient 20s linear infinite;
  filter: blur(80px);
  opacity: 0.3;
}

@keyframes rotate-gradient {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

---

## Timing Guidelines

| Context             | Duration    | Easing                               | Notes                                       |
|---------------------|-------------|--------------------------------------|---------------------------------------------|
| Micro-interactions  | 150ms       | `cubic-bezier(0.4, 0, 0.2, 1)`      | Button press, toggle, checkbox              |
| Hover transitions   | 200-300ms   | `cubic-bezier(0.4, 0, 0.2, 1)`      | Card lift, color change, underline          |
| Entrance animations | 400-600ms   | `cubic-bezier(0.25, 0.1, 0.25, 1)`  | Fade-in, slide-in, scale-in                |
| Page transitions    | 300-500ms   | `cubic-bezier(0.25, 0.1, 0.25, 1)`  | Cross-fade, slide between views             |
| Exit animations     | 200-300ms   | `cubic-bezier(0.4, 0, 1, 1)`        | Should be faster than entrances             |
| Loading skeletons   | 1500-2000ms | `ease-in-out`                        | Shimmer cycle duration (loops)              |
| Ambient motion      | 4000-8000ms | `cubic-bezier(0.25, 0.1, 0.25, 1)`  | Floating, rotating, breathing (loops)       |
| Toast notifications | 300ms in, 200ms out | snappy / snappy              | Enter from edge, exit faster than enter     |
| Modal open          | 300-400ms   | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Slight overshoot feels satisfying           |
| Modal close         | 200ms       | `cubic-bezier(0.4, 0, 0.2, 1)`      | Fast, no overshoot                          |

### Rules of Thumb

- **Exits are faster than entrances.** Users want things gone quickly.
- **Smaller elements animate faster.** A tooltip at 150ms, a full-page transition at 400ms.
- **Never exceed 600ms** for UI animations. Beyond that, the interface feels sluggish.
- **Match easing to intent.** Snappy for interactions, gentle for entrances, bouncy for delight.
- **Respect `prefers-reduced-motion`.** Always provide a reduced-motion fallback:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

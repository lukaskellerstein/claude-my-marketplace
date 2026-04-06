# SVG Animation Recipes

Ready-to-use animation patterns for SVG elements. Each recipe includes CSS-only and GSAP versions where applicable.

---

## Stroke Draw-On Effect

The classic "hand-drawn" line animation. Works on any `<path>`, `<circle>`, `<line>`, `<polyline>`, or `<polygon>`.

### How It Works

Every SVG stroke can be dashed via `stroke-dasharray`. Setting the dash length equal to the total path length creates one continuous dash. Then `stroke-dashoffset` shifts that dash off-screen. Animate the offset to zero and the path appears to draw itself.

### CSS-Only Version

```html
<svg viewBox="0 0 200 200">
  <path class="draw" d="M20 100 C20 50, 100 20, 180 100 S20 180, 180 100"
    fill="none" stroke="#6366f1" stroke-width="3"/>
</svg>

<style>
.draw {
  stroke-dasharray: 500;    /* >= path.getTotalLength() */
  stroke-dashoffset: 500;
  animation: draw-on 2s ease-out forwards;
}
@keyframes draw-on {
  to { stroke-dashoffset: 0; }
}
</style>
```

### Getting the Exact Path Length

```js
const path = document.querySelector('path');
console.log(path.getTotalLength()); // e.g., 487.3
// Use this value for stroke-dasharray and stroke-dashoffset
```

### GSAP Version

```js
const path = document.querySelector('.draw');
const length = path.getTotalLength();

gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
gsap.to(path, {
  strokeDashoffset: 0,
  duration: 2,
  ease: 'power2.out',
});
```

---

## Logo Reveal (Staggered Multi-Path Draw)

Animate multiple paths in sequence to reveal a logo:

### CSS Version

```html
<svg class="logo" viewBox="0 0 300 100">
  <path class="logo-stroke s1" d="M10 90 L10 10 L60 10" fill="none" stroke="#000" stroke-width="3"/>
  <path class="logo-stroke s2" d="M80 10 L80 90 L130 90 L130 10" fill="none" stroke="#000" stroke-width="3"/>
  <path class="logo-stroke s3" d="M150 50 A40 40 0 1 1 230 50" fill="none" stroke="#000" stroke-width="3"/>
</svg>

<style>
.logo-stroke {
  stroke-dasharray: 300;
  stroke-dashoffset: 300;
}
.s1 { animation: draw-on 1s ease-out 0s forwards; }
.s2 { animation: draw-on 1s ease-out 0.3s forwards; }
.s3 { animation: draw-on 1s ease-out 0.6s forwards; }

@keyframes draw-on {
  to { stroke-dashoffset: 0; }
}
</style>
```

### GSAP Version (Cleaner Stagger)

```js
const paths = document.querySelectorAll('.logo-stroke');

paths.forEach(path => {
  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
});

gsap.to('.logo-stroke', {
  strokeDashoffset: 0,
  duration: 1,
  ease: 'power2.out',
  stagger: 0.3,
});
```

---

## Fill Reveal (Draw Stroke, Then Fill)

Draw the outline first, then fade in the fill:

```js
const path = document.querySelector('.icon-path');
const length = path.getTotalLength();

const tl = gsap.timeline();

// Phase 1: Draw the stroke
tl.set(path, { strokeDasharray: length, strokeDashoffset: length, fillOpacity: 0 });
tl.to(path, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.out' });

// Phase 2: Fade in the fill, fade out the stroke
tl.to(path, { fillOpacity: 1, duration: 0.5, ease: 'power1.in' });
tl.to(path, { strokeOpacity: 0, duration: 0.3 }, '-=0.3');
```

---

## SVG Morphing

Transform one shape into another. Requires paths with the same number of points, or a library to interpolate.

### Using flubber.js (Recommended for Web)

```bash
npm install flubber
```

```js
import { interpolate } from 'flubber';

const circle = 'M50,10 A40,40 0 1,1 50,90 A40,40 0 1,1 50,10';
const star = 'M50,0 L61,35 L98,35 L68,57 L79,91 L50,70 L21,91 L32,57 L2,35 L39,35 Z';

const interpolator = interpolate(circle, star);

// Use with GSAP
gsap.to({ t: 0 }, {
  t: 1,
  duration: 1.5,
  ease: 'power2.inOut',
  onUpdate: function() {
    document.querySelector('path').setAttribute('d', interpolator(this.targets()[0].t));
  },
});
```

### CSS-Only Morph (Simple Shapes with clip-path)

```css
.morph {
  clip-path: circle(50%);
  transition: clip-path 0.5s ease;
}
.morph:hover {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}
```

---

## Motion Along a Path

Move an element along an SVG path trajectory.

### CSS offset-path

```css
.mover {
  offset-path: path('M20,100 C20,50 100,20 180,100');
  offset-distance: 0%;
  animation: follow-path 3s ease-in-out infinite;
}
@keyframes follow-path {
  to { offset-distance: 100%; }
}
```

### GSAP MotionPathPlugin

```js
gsap.registerPlugin(MotionPathPlugin);

gsap.to('.mover', {
  motionPath: {
    path: '#my-path',       // ID of the SVG <path> element
    align: '#my-path',
    autoRotate: true,        // Element rotates to follow the path
    alignOrigin: [0.5, 0.5],
  },
  duration: 3,
  ease: 'power1.inOut',
  repeat: -1,
});
```

---

## Stagger Animations on SVG Groups

Animate child elements of an SVG group with cascading timing:

### Chart Bars Growing Up

```js
gsap.from('.bar', {
  scaleY: 0,
  transformOrigin: 'bottom',
  duration: 0.8,
  ease: 'back.out(1.7)',
  stagger: 0.1,
});
```

### Icons Appearing in Sequence

```js
gsap.from('.icon-group > *', {
  scale: 0,
  opacity: 0,
  transformOrigin: 'center',
  duration: 0.5,
  ease: 'back.out(2)',
  stagger: {
    each: 0.1,
    from: 'center',  // Radiate from center outward
  },
});
```

### Pie Chart Segments

```js
gsap.from('.pie-segment', {
  scale: 0,
  opacity: 0,
  transformOrigin: 'center',
  duration: 0.6,
  ease: 'power2.out',
  stagger: 0.15,
});
```

---

## Framer Motion SVG Patterns

### Path Draw with motion.path

```tsx
import { motion } from 'framer-motion';

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 2, ease: 'easeInOut' }, opacity: { duration: 0.2 } },
  },
};

function AnimatedCheck() {
  return (
    <motion.svg viewBox="0 0 24 24" initial="hidden" animate="visible">
      <motion.path
        d="M5 13 L9 17 L19 7"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        variants={draw}
      />
    </motion.svg>
  );
}
```

### Animated Circle Progress

```tsx
function CircleProgress({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 100 100">
      {/* Background ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
      {/* Animated progress ring */}
      <motion.circle
        cx="50" cy="50" r="40"
        fill="none" stroke="#6366f1" strokeWidth="8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: progress }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ rotate: -90, transformOrigin: 'center' }}
      />
    </svg>
  );
}
```

---

## Hover Effects on SVG Elements

### Scale + Glow on Hover

```css
.interactive-icon {
  transition: transform 0.2s ease, filter 0.2s ease;
  transform-origin: center;
  transform-box: fill-box;
  cursor: pointer;
}
.interactive-icon:hover {
  transform: scale(1.15);
  filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.5));
}
```

### Color Transition

```css
.icon-path {
  stroke: #9ca3af;
  transition: stroke 0.2s ease;
}
.icon-path:hover {
  stroke: #6366f1;
}
```

### Stroke Draw on Hover

```css
.hover-draw {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  transition: stroke-dashoffset 0.6s ease;
}
.hover-draw:hover {
  stroke-dashoffset: 0;
}
```

---

## Performance Notes

- **Only animate `transform` and `opacity`** for 60fps — avoid animating `d`, `fill`, `stroke` when possible (these trigger repaint)
- **Exception:** stroke-dashoffset is GPU-friendly and performs well
- **Use `will-change: transform`** on elements you'll animate (but remove after animation completes)
- **Prefer CSS transitions** for simple hover effects — no JS overhead
- **Use GSAP for complex sequences** — it batches DOM writes and handles cross-browser quirks
- **Respect `prefers-reduced-motion`:**

```css
@media (prefers-reduced-motion: reduce) {
  .draw-on, .logo-stroke, .mover {
    animation: none !important;
    stroke-dashoffset: 0 !important;
    opacity: 1 !important;
  }
}
```

# GSAP Animation Patterns

Complete GSAP code patterns for React/Vite websites. Every pattern includes working code, key properties explained, and customization options.

---

## GSAP + React Setup

### useGSAP Hook with Refs

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function MyComponent() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // GSAP code here — all selectors scoped to container
      gsap.from(".item", { opacity: 0, y: 40, stagger: 0.1 });
    },
    { scope: container }
  );

  return <div ref={container}>{/* children */}</div>;
}
```

### Direct Ref Targeting (for single elements)

```tsx
function SingleElement() {
  const boxRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(boxRef.current, { opacity: 0, y: 60, duration: 0.8 });
  });

  return <div ref={boxRef}>Animated box</div>;
}
```

### Cleanup Is Automatic

`useGSAP` automatically reverts all GSAP tweens and ScrollTriggers created inside its callback when the component unmounts. No manual cleanup needed.

If you need manual control:

```tsx
useGSAP(() => {
  const tl = gsap.timeline();
  tl.to(".box", { x: 100 });

  return () => {
    // Optional extra cleanup
    tl.kill();
  };
});
```

---

## ScrollTrigger Patterns

### Basic Scroll Reveal (Fade + Slide Up)

The most common web animation. Element fades in and slides up when it enters the viewport.

```tsx
function RevealSection() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".reveal-item", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",   // Animation starts when top of element hits 80% of viewport
          toggleActions: "play none none none", // onEnter, onLeave, onEnterBack, onLeaveBack
        },
      });
    },
    { scope: ref }
  );

  return (
    <section ref={ref}>
      <h2 className="reveal-item">Title</h2>
      <p className="reveal-item">Description</p>
      <button className="reveal-item">CTA</button>
    </section>
  );
}
```

**Key properties:**
- `start: "top 80%"` — triggers when the top of the element reaches 80% down the viewport. Use `"top 90%"` for earlier trigger, `"top center"` for midpoint.
- `toggleActions` — four states: `onEnter onLeave onEnterBack onLeaveBack`. Values: `play`, `pause`, `resume`, `reset`, `restart`, `complete`, `reverse`, `none`.
- Use `once: true` instead of toggleActions if the animation should only play once (same as `toggleActions: "play none none none"`).

**Customization:**
- Slide from left: change `y: 60` to `x: -60`
- Slide from right: `x: 60`
- Scale in: add `scale: 0.9`
- Rotate in: add `rotation: 5`

### Scrub Animation (Tied to Scroll Position)

Animation progress is directly linked to scroll position — scrubbing forward and backward.

```tsx
useGSAP(
  () => {
    gsap.fromTo(
      ".progress-bar",
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top center",
          end: "bottom center",
          scrub: true, // true = smooth, or number for smoothing seconds (e.g., 0.5)
        },
      }
    );
  },
  { scope: ref }
);
```

**Key properties:**
- `scrub: true` — 1:1 scroll-to-animation mapping
- `scrub: 0.5` — adds 0.5s of smoothing/easing as the scroll catches up
- `scrub: 1` — 1 second of smoothing (feels more polished)
- `start` / `end` — define the scroll range that maps to 0%–100% of the animation

### Pin Section (Sticky Scroll)

Pin an element in place while content scrolls through it.

```tsx
useGSAP(
  () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ref.current,
        start: "top top",
        end: "+=200%",     // Pin for 2x the viewport height of scrolling
        pin: true,
        scrub: 1,
        anticipatePin: 1,  // Prevents jitter on pin start
      },
    });

    tl.from(".step-1", { opacity: 0, y: 50 })
      .from(".step-2", { opacity: 0, y: 50 })
      .from(".step-3", { opacity: 0, y: 50 });
  },
  { scope: ref }
);
```

**Key properties:**
- `pin: true` — fixes the trigger element in place
- `end: "+=200%"` — the scroll distance during which the element stays pinned
- `anticipatePin: 1` — offsets the start slightly to prevent visual jump
- `pinSpacing: true` (default) — adds padding after the pinned section so content below flows naturally

### Horizontal Scroll Section

Content scrolls horizontally while the user scrolls vertically.

```tsx
function HorizontalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const panels = gsap.utils.toArray<HTMLElement>(".panel");

      gsap.to(panels, {
        xPercent: -100 * (panels.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 1,
          snap: 1 / (panels.length - 1), // Snap to each panel
          end: () => "+=" + (panelsRef.current?.scrollWidth ?? 0),
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <section ref={containerRef} className="overflow-hidden">
      <div ref={panelsRef} className="flex">
        <div className="panel w-screen h-screen flex-shrink-0">Panel 1</div>
        <div className="panel w-screen h-screen flex-shrink-0">Panel 2</div>
        <div className="panel w-screen h-screen flex-shrink-0">Panel 3</div>
      </div>
    </section>
  );
}
```

**Key properties:**
- `xPercent: -100 * (panels.length - 1)` — moves all panels left by their combined width
- `snap` — snaps to discrete positions (each panel)
- Each `.panel` must be `width: 100vw` and `flex-shrink: 0`

### Progress-Based Animation

Use ScrollTrigger's `onUpdate` to drive custom logic based on scroll progress.

```tsx
useGSAP(() => {
  ScrollTrigger.create({
    trigger: ref.current,
    start: "top center",
    end: "bottom center",
    onUpdate: (self) => {
      // self.progress is 0 to 1
      const progress = self.progress;
      gsap.set(".fill", { scaleX: progress });
      gsap.set(".counter", {
        innerText: Math.round(progress * 100),
        snap: { innerText: 1 },
      });
    },
  });
});
```

---

## Timeline Patterns

### Page Load Sequence (Orchestrated Hero Reveal)

```tsx
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Set initial states
      gsap.set([".hero-bg", ".hero-title", ".hero-subtitle", ".hero-cta", ".nav"], {
        opacity: 0,
      });

      tl.to(".hero-bg", {
        opacity: 1,
        scale: 1,
        duration: 1.2,
      })
        .to(
          ".hero-title",
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.6" // Overlap with previous by 0.6s
        )
        .to(
          ".hero-subtitle",
          { opacity: 1, y: 0, duration: 0.6 },
          "-=0.3"
        )
        .to(
          ".hero-cta",
          { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" },
          "-=0.2"
        )
        .to(
          ".nav",
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.3"
        );
    },
    { scope: ref }
  );

  return (
    <div ref={ref}>
      <nav className="nav translate-y-[-20px]">Navigation</nav>
      <div className="hero-bg scale-105">
        <h1 className="hero-title translate-y-[40px]">Headline</h1>
        <p className="hero-subtitle translate-y-[20px]">Subtitle text</p>
        <button className="hero-cta scale-90">Get Started</button>
      </div>
    </div>
  );
}
```

**Key properties:**
- `defaults` on the timeline — applies to all child tweens (can be overridden per tween)
- `"-=0.6"` — position parameter, starts this tween 0.6s before the previous one ends (overlap)
- `"+=0.2"` — starts 0.2s after the previous tween ends (gap)
- Set initial CSS states that match the `from` values so there's no flash of unstyled content

### Multi-Step Animation

```tsx
const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

tl.to(".box", { x: 300, duration: 1, ease: "power2.inOut" })
  .to(".box", { y: 200, duration: 0.8, ease: "power2.inOut" })
  .to(".box", { rotation: 360, duration: 0.6 })
  .to(".box", { scale: 0.5, duration: 0.4 })
  .to(".box", { scale: 1, x: 0, y: 0, rotation: 0, duration: 1 });
```

**Key properties:**
- `repeat: -1` — infinite loop
- `repeatDelay: 2` — 2 second pause between loops
- `yoyo: true` — reverses the animation on each repeat

### Timeline with Labels

Labels let you reference specific points in a timeline, making it easier to insert or align tweens.

```tsx
const tl = gsap.timeline();

tl.addLabel("start")
  .to(".bg", { opacity: 1, duration: 0.5 }, "start")
  .to(".title", { opacity: 1, y: 0, duration: 0.6 }, "start+=0.2")
  .addLabel("contentIn")
  .to(".card-1", { opacity: 1, x: 0, duration: 0.4 }, "contentIn")
  .to(".card-2", { opacity: 1, x: 0, duration: 0.4 }, "contentIn+=0.1")
  .to(".card-3", { opacity: 1, x: 0, duration: 0.4 }, "contentIn+=0.2")
  .addLabel("end");

// Jump to a label
tl.play("contentIn");
```

### Nested Timelines for Complex Sequences

Break a complex animation into smaller, manageable timelines.

```tsx
function createHeroTimeline() {
  const tl = gsap.timeline();
  tl.from(".hero-bg", { opacity: 0, scale: 1.1, duration: 1.2 })
    .from(".hero-text", { opacity: 0, y: 50, duration: 0.8 }, "-=0.5");
  return tl;
}

function createCardsTimeline() {
  const tl = gsap.timeline();
  tl.from(".card", {
    opacity: 0,
    y: 60,
    stagger: 0.1,
    duration: 0.6,
  });
  return tl;
}

function createFooterTimeline() {
  const tl = gsap.timeline();
  tl.from(".footer-col", {
    opacity: 0,
    y: 30,
    stagger: 0.08,
    duration: 0.5,
  });
  return tl;
}

// Master timeline
const master = gsap.timeline();
master
  .add(createHeroTimeline())
  .add(createCardsTimeline(), "-=0.3")
  .add(createFooterTimeline(), "-=0.2");
```

---

## Stagger Patterns

### Grid Reveal (Cards Appearing One by One)

```tsx
useGSAP(
  () => {
    gsap.from(".card", {
      y: 60,
      opacity: 0,
      scale: 0.95,
      duration: 0.6,
      ease: "power2.out",
      stagger: {
        amount: 0.6,  // Total stagger time spread across all elements
        // OR: each: 0.1 — fixed delay between each element
      },
      scrollTrigger: {
        trigger: ref.current,
        start: "top 80%",
      },
    });
  },
  { scope: ref }
);
```

**Key properties:**
- `stagger.amount` — total time for all staggers (e.g., 0.6s spread across 6 cards = 0.1s each)
- `stagger.each` — fixed delay between each element (e.g., 0.1s between every card)
- `stagger.from` — where the stagger starts: `"start"` (default), `"end"`, `"center"`, `"edges"`, `"random"`, or an index number

### List Stagger

```tsx
gsap.from(".list-item", {
  x: -40,
  opacity: 0,
  duration: 0.5,
  ease: "power2.out",
  stagger: 0.08,
  scrollTrigger: {
    trigger: ".list-container",
    start: "top 75%",
  },
});
```

### Random Stagger for Organic Feel

```tsx
gsap.from(".grid-item", {
  y: 80,
  opacity: 0,
  scale: 0.9,
  rotation: gsap.utils.random(-5, 5),
  duration: 0.7,
  ease: "power2.out",
  stagger: {
    amount: 0.8,
    from: "random",
  },
  scrollTrigger: {
    trigger: ".grid",
    start: "top 80%",
  },
});
```

### Stagger from Center/Edges

```tsx
// From center — elements closest to center animate first
gsap.from(".item", {
  opacity: 0,
  y: 40,
  stagger: {
    each: 0.1,
    from: "center",
  },
});

// From edges — elements at edges animate first, center last
gsap.from(".item", {
  opacity: 0,
  y: 40,
  stagger: {
    each: 0.1,
    from: "edges",
  },
});

// Grid stagger — 2D stagger for grid layouts
gsap.from(".grid-cell", {
  opacity: 0,
  scale: 0.8,
  stagger: {
    each: 0.05,
    from: "center",
    grid: [4, 3],      // rows, columns
    axis: null,         // null = both axes, "x" = horizontal only, "y" = vertical only
  },
});
```

---

## Text Animation Patterns

### SplitText Character Reveal

```tsx
function AnimatedHeadline({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    const split = SplitText.create(ref.current, { type: "chars" });

    gsap.from(split.chars, {
      y: 40,
      opacity: 0,
      rotateX: -90,
      stagger: 0.03,
      duration: 0.6,
      ease: "back.out(1.7)",
      scrollTrigger: {
        trigger: ref.current,
        start: "top 80%",
      },
    });
  });

  return <h2 ref={ref}>{text}</h2>;
}
```

**Key properties:**
- `type: "chars"` — splits into individual characters
- `type: "words"` — splits into words
- `type: "lines"` — splits into lines
- `type: "chars, words, lines"` — splits into all three (nested)
- SplitText wraps each piece in a `<div>`, so set `overflow: hidden` on the parent for clip effects

### Word-by-Word Fade In

```tsx
useGSAP(() => {
  const split = SplitText.create(".headline", { type: "words" });

  gsap.from(split.words, {
    opacity: 0,
    y: 20,
    filter: "blur(4px)",
    stagger: 0.06,
    duration: 0.5,
    ease: "power2.out",
  });
});
```

### Line-by-Line Reveal

```tsx
useGSAP(() => {
  const split = SplitText.create(".paragraph", {
    type: "lines",
    linesClass: "line-wrapper",
  });

  // Wrap each line in an overflow-hidden container for clip effect
  gsap.set(".line-wrapper", { overflow: "hidden" });

  gsap.from(split.lines, {
    y: "100%",
    opacity: 0,
    stagger: 0.1,
    duration: 0.7,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".paragraph",
      start: "top 80%",
    },
  });
});
```

### Typewriter Effect

```tsx
useGSAP(() => {
  const split = SplitText.create(".typewriter", { type: "chars" });

  gsap.from(split.chars, {
    opacity: 0,
    stagger: 0.04,      // Consistent typing speed
    duration: 0.01,      // Instant on/off per character
    ease: "none",
  });
});

// With blinking cursor
useGSAP(() => {
  const split = SplitText.create(".typewriter", { type: "chars" });

  const tl = gsap.timeline();
  tl.from(split.chars, {
    opacity: 0,
    stagger: 0.04,
    duration: 0.01,
    ease: "none",
  });

  // Blinking cursor via CSS is simpler:
  // .typewriter::after { content: "|"; animation: blink 1s step-end infinite; }
});
```

---

## Parallax Patterns

### Background Parallax

```tsx
useGSAP(
  () => {
    gsap.to(".parallax-bg", {
      yPercent: -30,
      ease: "none",
      scrollTrigger: {
        trigger: ref.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  },
  { scope: ref }
);
```

**Key properties:**
- `yPercent: -30` — moves the background up by 30% of its own height over the scroll range
- `scrub: true` — ties movement to scroll position
- The background image should be taller than its container (e.g., `h-[120%]`) to avoid gaps

### Multi-Layer Parallax

```tsx
useGSAP(
  () => {
    // Each layer moves at a different speed
    const layers = [
      { selector: ".layer-bg", speed: -20 },
      { selector: ".layer-mid", speed: -40 },
      { selector: ".layer-fg", speed: -60 },
    ];

    layers.forEach(({ selector, speed }) => {
      gsap.to(selector, {
        yPercent: speed,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  },
  { scope: ref }
);
```

### Element Parallax Within Sections

Individual elements within a section move at slightly different rates for a subtle depth effect.

```tsx
useGSAP(
  () => {
    gsap.utils.toArray<HTMLElement>(".parallax-element").forEach((el) => {
      const speed = parseFloat(el.dataset.speed || "0.5");

      gsap.to(el, {
        yPercent: -50 * speed,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  },
  { scope: ref }
);

// Usage in JSX:
// <img className="parallax-element" data-speed="0.3" src="..." />
// <img className="parallax-element" data-speed="0.7" src="..." />
```

---

## GSAP React Component Patterns

### AnimatedSection (Reusable Scroll Reveal)

A drop-in component that reveals its children on scroll.

```tsx
import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  start?: string;
}

function AnimatedSection({
  children,
  className = "",
  direction = "up",
  distance = 60,
  duration = 0.8,
  delay = 0,
  ease = "power2.out",
  start = "top 85%",
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  };

  useGSAP(() => {
    gsap.from(ref.current, {
      ...directionMap[direction],
      opacity: 0,
      duration,
      delay,
      ease,
      scrollTrigger: {
        trigger: ref.current,
        start,
      },
    });
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
```

**Usage:**

```tsx
<AnimatedSection>
  <h2>Default fade up</h2>
</AnimatedSection>

<AnimatedSection direction="left" distance={80} duration={1}>
  <p>Slide in from the left</p>
</AnimatedSection>

<AnimatedSection delay={0.3} ease="back.out(1.4)">
  <button>Bouncy CTA</button>
</AnimatedSection>
```

### StaggerGrid Component

```tsx
import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
  itemSelector?: string;
  staggerAmount?: number;
  distance?: number;
  duration?: number;
  start?: string;
}

function StaggerGrid({
  children,
  className = "",
  itemSelector = ".stagger-item",
  staggerAmount = 0.6,
  distance = 60,
  duration = 0.6,
  start = "top 80%",
}: StaggerGridProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(itemSelector, {
        y: distance,
        opacity: 0,
        scale: 0.95,
        duration,
        ease: "power2.out",
        stagger: {
          amount: staggerAmount,
        },
        scrollTrigger: {
          trigger: ref.current,
          start,
        },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
```

**Usage:**

```tsx
<StaggerGrid className="grid grid-cols-3 gap-6">
  <div className="stagger-item">Card 1</div>
  <div className="stagger-item">Card 2</div>
  <div className="stagger-item">Card 3</div>
  <div className="stagger-item">Card 4</div>
  <div className="stagger-item">Card 5</div>
  <div className="stagger-item">Card 6</div>
</StaggerGrid>
```

### ParallaxContainer Component

```tsx
import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface ParallaxContainerProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: "vertical" | "horizontal";
}

function ParallaxContainer({
  children,
  className = "",
  speed = 0.3,
  direction = "vertical",
}: ParallaxContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prop = direction === "vertical" ? "yPercent" : "xPercent";

    gsap.to(ref.current, {
      [prop]: -50 * speed,
      ease: "none",
      scrollTrigger: {
        trigger: ref.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
```

**Usage:**

```tsx
<section className="relative overflow-hidden h-[500px]">
  <ParallaxContainer speed={0.5} className="absolute inset-0 h-[130%] -top-[15%]">
    <img src="/bg.jpg" className="w-full h-full object-cover" />
  </ParallaxContainer>
  <div className="relative z-10">
    <h2>Content on top</h2>
  </div>
</section>
```

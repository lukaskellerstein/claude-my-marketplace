# Animation Recipes

Complete animation compositions for common website sections. Each recipe includes trigger, code, and React integration.

---

## Hero Section

Full page load sequence: background scale-in, headline split-text reveal, subtitle fade, CTA bounce-in, scroll indicator pulse.

### Animation Plan

| Element | Type | From → To | Duration | Ease | Delay |
|---------|------|-----------|----------|------|-------|
| Background | scale | scale 1.1→1, opacity 0→1 | 1200ms | power2.out | 0ms |
| Headline | text-split (words) | y 40→0, opacity 0→1 | 800ms | power3.out | 400ms |
| Subtitle | reveal | opacity 0→1, y 20→0 | 600ms | power2.out | 800ms |
| CTA Button | bounce | scale 0.8→1, opacity 0→1 | 500ms | back.out(1.4) | 1000ms |
| Scroll indicator | pulse | CSS infinite pulse | — | ease-in-out | 1500ms |

### Code

```tsx
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Set initial states to prevent flash
      gsap.set([".hero-bg", ".hero-subtitle", ".hero-cta", ".scroll-indicator"], {
        opacity: 0,
      });

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      // 1. Background scale-in
      tl.fromTo(
        ".hero-bg",
        { opacity: 0, scale: 1.1 },
        { opacity: 1, scale: 1, duration: 1.2 }
      );

      // 2. Headline split-text reveal
      const splitHeadline = SplitText.create(".hero-headline", { type: "words" });
      tl.from(
        splitHeadline.words,
        {
          y: 40,
          opacity: 0,
          stagger: 0.06,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.8"
      );

      // 3. Subtitle fade
      tl.to(
        ".hero-subtitle",
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.4"
      );

      // 4. CTA bounce-in
      tl.fromTo(
        ".hero-cta",
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" },
        "-=0.2"
      );

      // 5. Scroll indicator fade-in (CSS handles the pulse loop)
      tl.to(
        ".scroll-indicator",
        { opacity: 1, duration: 0.4 },
        "-=0.1"
      );
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="hero-bg absolute inset-0">
        <img src="/hero-bg.jpg" className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 text-center text-white">
        <h1 className="hero-headline text-5xl md:text-7xl font-bold">
          Build Something Amazing
        </h1>
        <p className="hero-subtitle mt-6 text-xl text-white/80 translate-y-5">
          The platform for modern web development
        </p>
        <button className="hero-cta mt-8 px-8 py-4 bg-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-500 transition-colors">
          Get Started Free
        </button>
      </div>

      <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </div>
    </section>
  );
}
```

---

## Feature Cards Grid

ScrollTrigger stagger: each card fades + slides up + subtle scale.

### Code

```tsx
function FeaturesGrid({ features }: { features: Feature[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".feature-card", {
        y: 60,
        opacity: 0,
        scale: 0.95,
        rotation: 2,
        duration: 0.7,
        ease: "power2.out",
        stagger: {
          amount: 0.6,
        },
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
        },
      });
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="feature-card p-6 bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## Testimonials Carousel

GSAP-powered smooth carousel with auto-play, drag support, and snap.

### Code

```tsx
function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const track = trackRef.current!;
      const cards = gsap.utils.toArray<HTMLElement>(".testimonial-card");
      const cardWidth = cards[0].offsetWidth + 32; // width + gap
      const totalWidth = cardWidth * cards.length;

      // Scroll reveal
      gsap.from(track, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
      });

      // Draggable horizontal scroll with snap
      let currentX = 0;
      const maxX = -(totalWidth - containerRef.current!.offsetWidth);

      Draggable.create(track, {
        type: "x",
        bounds: { minX: maxX, maxX: 0 },
        inertia: true,
        snap: {
          x: (value) => Math.round(value / cardWidth) * cardWidth,
        },
        onDrag: function () {
          currentX = this.x;
        },
      });

      // Auto-play (optional)
      const autoPlay = gsap.to(track, {
        x: `-=${cardWidth}`,
        duration: 0.6,
        ease: "power2.inOut",
        repeat: -1,
        repeatDelay: 3,
        paused: true,
        modifiers: {
          x: (x) => {
            const val = parseFloat(x);
            return (val < maxX ? 0 : val) + "px";
          },
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <section ref={containerRef} className="py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">What People Say</h2>
        <div
          ref={trackRef}
          className="flex gap-8 cursor-grab active:cursor-grabbing"
        >
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="testimonial-card flex-shrink-0 w-[350px] p-6 bg-white rounded-xl shadow-sm"
            >
              <p className="text-gray-700 italic">"{t.quote}"</p>
              <div className="mt-4 flex items-center gap-3">
                <img
                  src={t.avatar}
                  className="w-10 h-10 rounded-full object-cover"
                  alt={t.name}
                />
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Note:** Requires `gsap/Draggable` plugin: `import { Draggable } from "gsap/Draggable"` and `gsap.registerPlugin(Draggable)`.

---

## Stats / Counter Section

Number counting animation on scroll-enter + animated progress bars.

### Code

```tsx
function StatsSection({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Stagger reveal the stat cards
      gsap.from(".stat-card", {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 75%",
        },
      });

      // Animate each counter number
      gsap.utils.toArray<HTMLElement>(".stat-number").forEach((el) => {
        const target = parseInt(el.dataset.target || "0", 10);

        gsap.fromTo(
          el,
          { innerText: 0 },
          {
            innerText: target,
            duration: 2,
            ease: "power1.out",
            snap: { innerText: 1 },
            scrollTrigger: {
              trigger: el,
              start: "top 80%",
            },
          }
        );
      });

      // Animate progress bars
      gsap.utils.toArray<HTMLElement>(".progress-fill").forEach((el) => {
        const width = el.dataset.width || "0%";

        gsap.fromTo(
          el,
          { width: "0%" },
          {
            width,
            duration: 1.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el.parentElement,
              start: "top 80%",
            },
          }
        );
      });
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.id} className="stat-card text-center">
            <div className="text-4xl font-bold text-blue-600">
              <span className="stat-number" data-target={stat.value}>
                0
              </span>
              {stat.suffix}
            </div>
            <p className="mt-2 text-gray-600">{stat.label}</p>
            {stat.progress && (
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="progress-fill h-full bg-blue-600 rounded-full"
                  data-width={`${stat.progress}%`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## Image Gallery / Portfolio

Masonry reveal with stagger, hover zoom with smooth transition.

### Code

```tsx
function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".gallery-item", {
        y: 80,
        opacity: 0,
        scale: 0.9,
        duration: 0.7,
        ease: "power2.out",
        stagger: {
          amount: 0.8,
          from: "random",
        },
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
        },
      });
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-6xl mx-auto columns-1 md:columns-2 lg:columns-3 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="gallery-item mb-6 break-inside-avoid group cursor-pointer"
          >
            <div className="relative overflow-hidden rounded-xl">
              <img
                src={item.image}
                alt={item.title}
                className="w-full transition-transform duration-500 ease-out group-hover:scale-110"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex items-end">
                <div className="p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                  <h3 className="text-white font-semibold">{item.title}</h3>
                  <p className="text-white/70 text-sm">{item.category}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## Pricing Table

Toggle animation between monthly/yearly, card highlight on popular plan.

### Code

```tsx
function PricingSection({ plans }: { plans: Plan[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isYearly, setIsYearly] = useState(false);

  useGSAP(
    () => {
      // Stagger reveal
      gsap.from(".pricing-card", {
        y: 60,
        opacity: 0,
        scale: 0.95,
        stagger: 0.15,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 75%",
        },
      });

      // Popular card subtle float
      gsap.to(".pricing-card.popular", {
        y: -4,
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    },
    { scope: ref }
  );

  // Animate price change on toggle
  const handleToggle = () => {
    gsap.to(".price-value", {
      opacity: 0,
      y: -10,
      duration: 0.2,
      onComplete: () => {
        setIsYearly(!isYearly);
        gsap.fromTo(
          ".price-value",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
        );
      },
    });
  };

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={!isYearly ? "font-semibold" : "text-gray-500"}>Monthly</span>
          <button
            onClick={handleToggle}
            className="relative w-14 h-7 bg-blue-600 rounded-full transition-colors"
          >
            <div
              className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300"
              style={{ transform: isYearly ? "translateX(28px)" : "translateX(0)" }}
            />
          </button>
          <span className={isYearly ? "font-semibold" : "text-gray-500"}>
            Yearly <span className="text-green-600 text-sm">Save 20%</span>
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card p-8 rounded-2xl ${
                plan.popular
                  ? "popular bg-blue-600 text-white shadow-xl scale-105"
                  : "bg-white shadow-sm border"
              }`}
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <div className="mt-4">
                <span className="price-value text-4xl font-bold">
                  ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                </span>
                <span className="text-sm opacity-70">
                  /{isYearly ? "year" : "month"}
                </span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-8 w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-blue-600 text-white hover:bg-blue-500"
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## Timeline / History

Alternating left-right reveal on scroll, connecting line drawing animation.

### Code

```tsx
function TimelineSection({ events }: { events: TimelineEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Draw the connecting line
      gsap.fromTo(
        ".timeline-line",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 60%",
            end: "bottom 40%",
            scrub: true,
          },
        }
      );

      // Reveal each event alternating from left/right
      gsap.utils.toArray<HTMLElement>(".timeline-event").forEach((el, i) => {
        const fromLeft = i % 2 === 0;

        gsap.from(el, {
          x: fromLeft ? -60 : 60,
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
          },
        });
      });

      // Pop in the dots
      gsap.from(".timeline-dot", {
        scale: 0,
        stagger: 0.2,
        duration: 0.4,
        ease: "back.out(2)",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 70%",
        },
      });
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-3xl mx-auto relative">
        {/* Connecting line */}
        <div className="timeline-line absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-200 origin-top" />

        {events.map((event, i) => (
          <div
            key={event.id}
            className={`timeline-event relative flex items-center mb-12 ${
              i % 2 === 0 ? "flex-row" : "flex-row-reverse"
            }`}
          >
            <div className={`w-5/12 ${i % 2 === 0 ? "text-right pr-8" : "text-left pl-8"}`}>
              <span className="text-sm text-blue-600 font-semibold">{event.date}</span>
              <h3 className="text-lg font-bold mt-1">{event.title}</h3>
              <p className="text-gray-600 mt-1 text-sm">{event.description}</p>
            </div>

            {/* Center dot */}
            <div className="timeline-dot absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow z-10" />

            <div className="w-5/12" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## Scroll-to-Top

Smooth scroll with circular progress indicator showing page scroll progress.

### Code

```tsx
function ScrollToTop() {
  const ref = useRef<HTMLButtonElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);

  useGSAP(() => {
    // Show/hide based on scroll position
    gsap.set(ref.current, { opacity: 0, scale: 0.8 });

    ScrollTrigger.create({
      start: "300px top",
      onEnter: () => gsap.to(ref.current, { opacity: 1, scale: 1, duration: 0.3 }),
      onLeaveBack: () => gsap.to(ref.current, { opacity: 0, scale: 0.8, duration: 0.3 }),
    });

    // Progress circle
    const circumference = 2 * Math.PI * 18; // r=18
    gsap.set(circleRef.current, {
      strokeDasharray: circumference,
      strokeDashoffset: circumference,
    });

    ScrollTrigger.create({
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const offset = circumference * (1 - self.progress);
        gsap.set(circleRef.current, { strokeDashoffset: offset });
      },
    });
  });

  const handleClick = () => {
    gsap.to(window, { scrollTo: { y: 0 }, duration: 0.8, ease: "power2.inOut" });
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
      aria-label="Scroll to top"
    >
      <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 40 40">
        <circle
          ref={circleRef}
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="hsl(220, 90%, 56%)"
          strokeWidth="2"
        />
      </svg>
      <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7" />
      </svg>
    </button>
  );
}
```

**Note:** Requires `gsap/ScrollToPlugin`: `import { ScrollToPlugin } from "gsap/ScrollToPlugin"` and `gsap.registerPlugin(ScrollToPlugin)`.

---

## Navigation

Scroll-aware sticky nav with background blur transition and mobile menu slide.

### Code

```tsx
function Navigation() {
  const navRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useGSAP(() => {
    // Nav background transition on scroll
    ScrollTrigger.create({
      start: "50px top",
      onEnter: () => {
        gsap.to(navRef.current, {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          duration: 0.3,
        });
      },
      onLeaveBack: () => {
        gsap.to(navRef.current, {
          backgroundColor: "rgba(255, 255, 255, 0)",
          backdropFilter: "blur(0px)",
          boxShadow: "none",
          duration: 0.3,
        });
      },
    });

    // Hide nav on scroll down, show on scroll up
    let lastScroll = 0;
    ScrollTrigger.create({
      start: "200px top",
      onUpdate: (self) => {
        const scrollY = self.scroll();
        const direction = scrollY > lastScroll ? "down" : "up";
        lastScroll = scrollY;

        if (direction === "down" && scrollY > 200) {
          gsap.to(navRef.current, { y: -100, duration: 0.3, ease: "power2.in" });
        } else {
          gsap.to(navRef.current, { y: 0, duration: 0.3, ease: "power2.out" });
        }
      },
    });
  });

  // Mobile menu animation
  useGSAP(() => {
    if (mobileOpen) {
      gsap.fromTo(
        ".mobile-menu",
        { x: "100%" },
        { x: "0%", duration: 0.4, ease: "power3.out" }
      );
      gsap.from(".mobile-link", {
        x: 40,
        opacity: 0,
        stagger: 0.08,
        duration: 0.4,
        delay: 0.2,
        ease: "power2.out",
      });
    }
  }, [mobileOpen]);

  const handleClose = () => {
    gsap.to(".mobile-menu", {
      x: "100%",
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => setMobileOpen(false),
    });
  };

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-none"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold">Logo</a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm hover:text-blue-600 transition-colors">Features</a>
            <a href="#pricing" className="text-sm hover:text-blue-600 transition-colors">Pricing</a>
            <a href="#about" className="text-sm hover:text-blue-600 transition-colors">About</a>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">
              Get Started
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen(true)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="mobile-menu fixed inset-0 z-[60] bg-white">
          <div className="p-6">
            <button onClick={handleClose} className="ml-auto block">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mt-12 space-y-6">
              <a href="#features" className="mobile-link block text-2xl font-semibold">Features</a>
              <a href="#pricing" className="mobile-link block text-2xl font-semibold">Pricing</a>
              <a href="#about" className="mobile-link block text-2xl font-semibold">About</a>
              <button className="mobile-link block w-full py-4 bg-blue-600 text-white text-lg rounded-lg font-semibold">
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## Footer

Stagger reveal of footer columns on scroll.

### Code

```tsx
function Footer() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Divider line draw
      gsap.from(".footer-divider", {
        scaleX: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 90%",
        },
      });

      // Stagger columns
      gsap.from(".footer-col", {
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
        },
      });

      // Links within each column
      gsap.from(".footer-link", {
        y: 20,
        opacity: 0,
        stagger: 0.03,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
        },
      });

      // Bottom bar
      gsap.from(".footer-bottom", {
        opacity: 0,
        duration: 0.5,
        delay: 0.4,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
        },
      });
    },
    { scope: ref }
  );

  return (
    <footer ref={ref} className="bg-gray-900 text-white pt-16 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="footer-divider h-px bg-gray-700 mb-12 origin-left" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="footer-col">
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Features</a></li>
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Pricing</a></li>
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Changelog</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">About</a></li>
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Blog</a></li>
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Careers</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Docs</a></li>
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Help</a></li>
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Community</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Privacy</a></li>
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Terms</a></li>
              <li><a href="#" className="footer-link text-gray-400 hover:text-white transition-colors text-sm">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          &copy; 2025 Company. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

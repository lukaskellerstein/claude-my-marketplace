# Component Design Recipes

These are **design recipes**, not just code snippets. Each recipe is an opinionated pattern that pairs HTML structure with CSS styling and explains *why* the design works -- the visual reasoning, the interaction logic, and the psychological cues that make each component effective. Every recipe uses CSS custom properties so it slots into any theme system. Copy-paste them as starting points, then adapt to your project.

Assumed theme variables (define these on `:root` or a parent scope):

```css
:root {
  --color-primary: #6366f1;
  --color-primary-light: #818cf8;
  --color-primary-dark: #4f46e5;
  --color-surface: #ffffff;
  --color-surface-alt: #f8fafc;
  --color-background: #f1f5f9;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-border: #e2e8f0;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.12);
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Inter', system-ui, -apple-system, sans-serif;
  --transition-base: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### 1. Hero with Staggered Reveal

**When to use:** The first thing visitors see -- use it to establish brand presence and drive a single primary action.

**Design reasoning:** Staggered entrance animations create a sense of choreography that feels intentional and premium. Each element arrives in reading order (badge, heading, subtext, CTA), which guides the eye naturally. The gradient mesh background adds depth without competing with the text. A full-viewport height signals confidence and keeps focus on the message.

```html
<section class="hero">
  <div class="hero__bg"></div>
  <div class="hero__content">
    <span class="hero__badge">Launching Summer 2026</span>
    <h1 class="hero__title">Build interfaces that <em>feel</em> right</h1>
    <p class="hero__subtitle">
      Design-first component system with real reasoning behind every pixel.
    </p>
    <div class="hero__actions">
      <a href="#" class="hero__cta hero__cta--primary">Get Started</a>
      <a href="#" class="hero__cta hero__cta--secondary">Watch Demo</a>
    </div>
  </div>
</section>
```

```css
@keyframes heroReveal {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: var(--font-sans);
}

.hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 40%, rgba(99,102,241,0.15), transparent),
    radial-gradient(ellipse 60% 80% at 80% 60%, rgba(168,85,247,0.12), transparent),
    var(--color-background);
  z-index: 0;
}

.hero__content {
  position: relative;
  z-index: 1;
  max-width: 720px;
  text-align: center;
  padding: 2rem;
}

.hero__badge {
  display: inline-block;
  padding: 0.35em 1em;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-primary);
  background: rgba(99,102,241,0.1);
  border-radius: 999px;
  opacity: 0;
  animation: heroReveal 0.7s ease-out 0.1s forwards;
}

.hero__title {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-text);
  margin: 1.2rem 0 0;
  opacity: 0;
  animation: heroReveal 0.7s ease-out 0.3s forwards;
}

.hero__title em {
  font-style: normal;
  background: linear-gradient(135deg, var(--color-primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero__subtitle {
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--color-text-muted);
  margin: 1rem 0 0;
  opacity: 0;
  animation: heroReveal 0.7s ease-out 0.5s forwards;
}

.hero__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 2rem;
  opacity: 0;
  animation: heroReveal 0.7s ease-out 0.7s forwards;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  padding: 0.8em 1.8em;
  font-size: 1rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.hero__cta--primary {
  color: #fff;
  background: var(--color-primary);
  box-shadow: 0 4px 14px rgba(99,102,241,0.35);
}

.hero__cta--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99,102,241,0.45);
}

.hero__cta--secondary {
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.hero__cta--secondary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

**Variations:**

- **Video background:** Replace `.hero__bg` with a `<video>` element set to `object-fit: cover; opacity: 0.15;` for cinematic feel. Add a dark overlay for text contrast.
- **Split hero:** Use `display: grid; grid-template-columns: 1fr 1fr;` on `.hero__content` to place text left and an illustration right. Stagger the right side with an extra 0.3s delay.

---

### 2. Feature Card with Icon Accent

**When to use:** Displaying 3-6 product features or benefits in a grid, each needing to feel like a distinct, interactive unit.

**Design reasoning:** The colored accent bar at the top creates a visual anchor that draws the eye downward into the card content. The hover lift (translateY) combined with accent bar expansion signals interactivity and reward -- the user feels the card respond. Keeping the icon inside a tinted circle creates visual hierarchy: color accent > icon > title > description.

```html
<article class="feature-card">
  <div class="feature-card__accent"></div>
  <div class="feature-card__icon">
    <!-- Replace with your SVG icon -->
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  </div>
  <h3 class="feature-card__title">Layered Architecture</h3>
  <p class="feature-card__desc">
    Build on composable primitives that stack cleanly, from tokens to full layouts.
  </p>
</article>
```

```css
.feature-card {
  position: relative;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 2rem 1.5rem 1.5rem;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base);
  font-family: var(--font-sans);
}

.feature-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 4px;
  background: var(--color-primary);
  border-radius: 0 0 4px 0;
  transition: width var(--transition-base);
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}

.feature-card:hover .feature-card__accent {
  width: 100%;
}

.feature-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  background: rgba(99,102,241,0.08);
  color: var(--color-primary);
  margin-bottom: 1rem;
}

.feature-card__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.5rem;
}

.feature-card__desc {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-muted);
  margin: 0;
}
```

**Variations:**

- **Full-width accent on idle:** Start the accent at `width: 100%; height: 3px;` and on hover change to `height: 6px; background: linear-gradient(90deg, var(--color-primary), #a855f7);` for a bolder feel.
- **Icon outside the card:** Position the icon with `margin-top: -28px;` so it overlaps the card top edge, creating a "floating badge" look. Add a white border ring around the icon circle.

---

### 3. Testimonial Pull-Quote

**When to use:** Showcasing a single powerful customer quote to build trust -- works well in landing pages between feature sections.

**Design reasoning:** The oversized decorative quotation mark creates instant visual recognition of "this is a quote" without needing a border or card background. Large, slightly italicized text at a generous line-height feels editorial and premium. The avatar + attribution anchors the quote to a real person, which is the entire point of social proof. The subtle scale on hover gives the testimonial a sense of weight and importance.

```html
<figure class="testimonial">
  <div class="testimonial__mark" aria-hidden="true">"</div>
  <blockquote class="testimonial__quote">
    This changed how our entire team thinks about frontend. It is not a library --
    it is a way of seeing interfaces.
  </blockquote>
  <figcaption class="testimonial__attribution">
    <img
      class="testimonial__avatar"
      src="avatar.jpg"
      alt="Sarah Chen"
      width="48"
      height="48"
    />
    <div>
      <cite class="testimonial__name">Sarah Chen</cite>
      <span class="testimonial__role">VP of Design, Acme Corp</span>
    </div>
  </figcaption>
</figure>
```

```css
.testimonial {
  position: relative;
  max-width: 640px;
  margin: 0 auto;
  padding: 3rem 2rem 2rem;
  text-align: center;
  font-family: var(--font-sans);
  transition: transform var(--transition-base);
}

.testimonial:hover {
  transform: scale(1.02);
}

.testimonial__mark {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 6rem;
  line-height: 1;
  color: var(--color-primary);
  opacity: 0.15;
  position: absolute;
  top: -0.1em;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
}

.testimonial__quote {
  font-size: 1.35rem;
  font-style: italic;
  font-weight: 400;
  line-height: 1.7;
  color: var(--color-text);
  margin: 0;
  padding: 0;
  border: none;
}

.testimonial__attribution {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  text-align: left;
}

.testimonial__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}

.testimonial__name {
  display: block;
  font-style: normal;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text);
}

.testimonial__role {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
```

**Variations:**

- **Card-style:** Wrap the entire component in a card with `background: var(--color-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); padding: 3rem;`. Move the quotation mark to the top-left corner for an asymmetric layout.
- **Star rating:** Add a row of SVG stars between the quote and attribution with `color: var(--color-warning);` for e-commerce contexts.

---

### 4. Pricing Table with Highlight

**When to use:** Presenting 2-4 pricing tiers where you want to steer users toward a recommended plan.

**Design reasoning:** The three-column layout exploits the "center stage effect" -- people naturally focus on the middle item. Elevating the recommended plan with scale, a colored border, and a badge creates an unmistakable visual hierarchy that says "most people pick this." Keeping the non-recommended plans visually quiet (muted border, no badge) makes the comparison effortless. The CTA button color change on the highlighted plan reinforces the nudge.

```html
<div class="pricing">
  <article class="pricing__plan">
    <h3 class="pricing__name">Starter</h3>
    <div class="pricing__price">
      <span class="pricing__amount">$9</span>
      <span class="pricing__period">/month</span>
    </div>
    <ul class="pricing__features">
      <li>5 projects</li>
      <li>Basic analytics</li>
      <li>Email support</li>
    </ul>
    <a href="#" class="pricing__cta">Get Started</a>
  </article>

  <article class="pricing__plan pricing__plan--recommended">
    <span class="pricing__badge">Most Popular</span>
    <h3 class="pricing__name">Pro</h3>
    <div class="pricing__price">
      <span class="pricing__amount">$29</span>
      <span class="pricing__period">/month</span>
    </div>
    <ul class="pricing__features">
      <li>Unlimited projects</li>
      <li>Advanced analytics</li>
      <li>Priority support</li>
      <li>Custom domains</li>
    </ul>
    <a href="#" class="pricing__cta">Get Started</a>
  </article>

  <article class="pricing__plan">
    <h3 class="pricing__name">Enterprise</h3>
    <div class="pricing__price">
      <span class="pricing__amount">$99</span>
      <span class="pricing__period">/month</span>
    </div>
    <ul class="pricing__features">
      <li>Everything in Pro</li>
      <li>SSO & SAML</li>
      <li>Dedicated manager</li>
      <li>SLA guarantee</li>
    </ul>
    <a href="#" class="pricing__cta">Contact Sales</a>
  </article>
</div>
```

```css
.pricing {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
  align-items: center;
  font-family: var(--font-sans);
}

@media (max-width: 768px) {
  .pricing {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
}

.pricing__plan {
  position: relative;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2rem 1.5rem;
  text-align: center;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.pricing__plan:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.pricing__plan--recommended {
  border-color: var(--color-primary);
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
  z-index: 1;
}

.pricing__plan--recommended:hover {
  transform: scale(1.05) translateY(-4px);
  box-shadow: 0 16px 48px rgba(99,102,241,0.18);
}

.pricing__badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0.3em 1.2em;
  border-radius: 999px;
  white-space: nowrap;
}

.pricing__name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin: 0 0 0.75rem;
}

.pricing__price {
  margin-bottom: 1.5rem;
}

.pricing__amount {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}

.pricing__period {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.pricing__features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  text-align: left;
}

.pricing__features li {
  padding: 0.5em 0;
  font-size: 0.9rem;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.pricing__features li:last-child {
  border-bottom: none;
}

.pricing__cta {
  display: block;
  padding: 0.75em 1.5em;
  font-size: 0.95rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  border-radius: var(--radius-md);
  background: var(--color-surface-alt);
  color: var(--color-text);
  border: 2px solid var(--color-border);
  transition: background var(--transition-base), color var(--transition-base);
}

.pricing__plan--recommended .pricing__cta {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.pricing__cta:hover {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
```

**Variations:**

- **Toggle billing cycle:** Add a monthly/annual toggle above the grid. Use a CSS class swap to animate `.pricing__amount` with a quick fade: `transition: opacity 0.2s;` and update the number via JS.
- **Two-column layout:** For only two plans, use `grid-template-columns: repeat(2, 1fr); max-width: 640px;` and highlight the right plan with a top border instead of scale.

---

### 5. Dashboard Stat Card

**When to use:** Displaying KPIs in a dashboard header row -- revenue, users, conversion rate, etc.

**Design reasoning:** The compact card packs four data layers into a small space: label (context), number (primary data), trend (change), and sparkline (trajectory). The trend indicator uses color coding (green up, red down) for instant emotional reading -- you know if the metric is healthy before reading the number. The subtle sparkline adds temporal context without demanding attention.

```html
<div class="stat-card">
  <div class="stat-card__header">
    <span class="stat-card__label">Monthly Revenue</span>
    <span class="stat-card__trend stat-card__trend--up">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
      12.5%
    </span>
  </div>
  <div class="stat-card__value">$48,290</div>
  <div class="stat-card__sparkline">
    <svg viewBox="0 0 120 32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path
        d="M0 28 L15 22 L30 25 L45 18 L60 20 L75 12 L90 8 L105 10 L120 4 L120 32 L0 32Z"
        fill="url(#sparkFill)"
      />
      <polyline
        points="0,28 15,22 30,25 45,18 60,20 75,12 90,8 105,10 120,4"
        fill="none"
        stroke="var(--color-primary)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</div>
```

```css
.stat-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  box-shadow: var(--shadow-sm);
  font-family: var(--font-sans);
  overflow: hidden;
}

.stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.stat-card__label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-card__trend {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.stat-card__trend--up {
  color: var(--color-success);
}

.stat-card__trend--down {
  color: var(--color-danger);
}

.stat-card__value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
  margin-bottom: 0.75rem;
}

.stat-card__sparkline {
  height: 32px;
  margin: 0 -1.5rem -1.25rem;
}

.stat-card__sparkline svg {
  display: block;
  width: 100%;
  height: 100%;
}
```

**Variations:**

- **With icon:** Add a tinted icon circle to the top-left (same pattern as the feature card icon) and shift the label + trend row to the right for a more visual layout.
- **Dark variant:** Set `background: var(--color-text); .stat-card__value color: #fff; .stat-card__label color: rgba(255,255,255,0.6);` for a high-contrast dashboard.

---

### 6. Scroll-Aware Navigation

**When to use:** Any page where the navbar should feel "part of the hero" at the top but become a distinct, anchored element once the user scrolls.

**Design reasoning:** A transparent navbar at the top merges with the hero, maximizing visual real estate and creating an immersive first impression. Adding backdrop blur and shadow on scroll maintains the immersive feel (you can still see content through it) while clearly separating the nav from the page. The transition between states must be smooth -- an abrupt switch feels broken. A small amount of JS toggles a class; all visual changes are CSS-driven.

```html
<nav class="nav" id="mainNav">
  <a href="/" class="nav__logo">Brand</a>
  <ul class="nav__links">
    <li><a href="#">Features</a></li>
    <li><a href="#">Pricing</a></li>
    <li><a href="#">Docs</a></li>
  </ul>
  <a href="#" class="nav__cta">Sign Up</a>
</nav>
```

```css
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  font-family: var(--font-sans);
  background: transparent;
  transition:
    background var(--transition-base),
    box-shadow var(--transition-base),
    padding var(--transition-base);
}

.nav--scrolled {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
  padding: 0.65rem 2rem;
}

.nav__logo {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-text);
  text-decoration: none;
}

.nav__links {
  display: flex;
  list-style: none;
  gap: 2rem;
  margin: 0;
  padding: 0;
}

.nav__links a {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color var(--transition-base);
}

.nav__links a:hover {
  color: var(--color-text);
}

.nav__cta {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5em 1.2em;
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: opacity var(--transition-base);
}

.nav__cta:hover {
  opacity: 0.9;
}
```

```html
<script>
  const nav = document.getElementById('mainNav');
  const onScroll = () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
</script>
```

**Variations:**

- **Dark-mode aware:** Use `background: rgba(15, 23, 42, 0.82);` for the scrolled state in dark mode. Wrap the color swap in a `@media (prefers-color-scheme: dark)` or a `.dark &` class.
- **Hide on scroll down, show on scroll up:** Track `lastScrollY` in JS and toggle a `.nav--hidden { transform: translateY(-100%); }` class. Add `transition: transform 0.3s;` for smooth slide.

---

### 7. Newsletter Footer CTA

**When to use:** End of a page or a section break where you want to capture email signups without a full landing page.

**Design reasoning:** The contrasting background color separates this from content and signals "this is a different kind of section -- it wants your attention." The input + button inline layout reduces perceived effort (one field, one action). The subtle dot pattern in the background adds texture that makes the section feel designed rather than plain, without distracting from the form.

```html
<section class="newsletter">
  <div class="newsletter__pattern"></div>
  <div class="newsletter__content">
    <h2 class="newsletter__title">Stay in the loop</h2>
    <p class="newsletter__desc">
      One email per week. No spam, just the good stuff.
    </p>
    <form class="newsletter__form" action="#" method="post">
      <input
        class="newsletter__input"
        type="email"
        placeholder="you@example.com"
        required
      />
      <button class="newsletter__btn" type="submit">Subscribe</button>
    </form>
  </div>
</section>
```

```css
.newsletter {
  position: relative;
  padding: 4rem 2rem;
  background: var(--color-text);
  overflow: hidden;
  font-family: var(--font-sans);
}

.newsletter__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
}

.newsletter__content {
  position: relative;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
}

.newsletter__title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 0.5rem;
}

.newsletter__desc {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 1.5rem;
}

.newsletter__form {
  display: flex;
  gap: 0.5rem;
  max-width: 400px;
  margin: 0 auto;
}

@media (max-width: 480px) {
  .newsletter__form {
    flex-direction: column;
  }
}

.newsletter__input {
  flex: 1;
  padding: 0.75em 1em;
  font-size: 0.95rem;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  outline: none;
  transition: border-color var(--transition-base);
  font-family: var(--font-sans);
}

.newsletter__input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.newsletter__input:focus {
  border-color: var(--color-primary-light);
}

.newsletter__btn {
  padding: 0.75em 1.5em;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-base);
  font-family: var(--font-sans);
}

.newsletter__btn:hover {
  background: var(--color-primary-light);
}
```

**Variations:**

- **Light version:** Swap to `background: var(--color-surface-alt);` with dark text and a primary-tinted dot pattern `rgba(99,102,241,0.06)`. Good for mid-page placement.
- **With social proof:** Add a row of small avatar circles below the form with text like "Join 2,400+ subscribers" using `display: flex; align-items: center;` and stacked avatar images with `margin-left: -8px;`.

---

### 8. Diagonal Section Divider

**When to use:** Between two sections of different background colors to break the horizontal monotony and create visual flow.

**Design reasoning:** Clip-path diagonals create a sense of motion and forward progress -- the angled line leads the eye downward. This feels more dynamic than a flat color boundary or a simple border. By applying the clip to the bottom of the top section and adjusting the top padding of the next section, you avoid content being clipped. The angle should be subtle (2-4% of viewport height) -- too steep looks chaotic.

```html
<section class="section section--light section--diagonal-bottom">
  <div class="section__content">
    <h2>Section One</h2>
    <p>Content above the diagonal edge.</p>
  </div>
</section>

<section class="section section--dark">
  <div class="section__content">
    <h2>Section Two</h2>
    <p>Content below the diagonal edge.</p>
  </div>
</section>
```

```css
.section {
  position: relative;
  padding: 5rem 2rem;
  font-family: var(--font-sans);
}

.section__content {
  max-width: 800px;
  margin: 0 auto;
}

.section--light {
  background: var(--color-surface);
  color: var(--color-text);
}

.section--dark {
  background: var(--color-text);
  color: #fff;
  padding-top: 7rem; /* extra top padding to compensate for the diagonal overlap */
}

.section--diagonal-bottom {
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 4vw), 0 100%);
  margin-bottom: -4vw;
  position: relative;
  z-index: 1;
}

/* Alternative: diagonal top (the receiving section has the angle) */
.section--diagonal-top {
  clip-path: polygon(0 4vw, 100% 0, 100% 100%, 0 100%);
  padding-top: calc(5rem + 4vw);
}
```

**Variations:**

- **Curved divider:** Replace the polygon with an SVG `<path>` element positioned absolutely at the bottom of the section. Use a quadratic bezier for a wave: `<path d="M0,64 Q480,0 960,64 L960,64 L0,64Z"/>`. This feels softer and more organic.
- **Double angle:** Use `clip-path: polygon(0 0, 100% 0, 100% calc(100% - 4vw), 50% 100%, 0 calc(100% - 4vw));` to create an arrow/chevron shape pointing down. Good for hero-to-content transitions.

---

### 9. Bento Grid Layout

**When to use:** Feature showcases or dashboards where items have varying importance -- some deserve more visual weight than others.

**Design reasoning:** The bento grid (inspired by Japanese bento boxes) assigns different visual weights to content by varying card sizes. A 2x2 card naturally draws the eye first, making it the hero item. The asymmetry creates visual interest that a uniform grid cannot -- it feels curated rather than templated. Using `grid-auto-flow: dense` ensures no gaps when cards are reordered responsively.

```html
<div class="bento">
  <article class="bento__item bento__item--2x2">
    <h3>Primary Feature</h3>
    <p>This gets the most visual weight in the grid.</p>
  </article>
  <article class="bento__item">
    <h3>Feature B</h3>
    <p>Standard item.</p>
  </article>
  <article class="bento__item">
    <h3>Feature C</h3>
    <p>Standard item.</p>
  </article>
  <article class="bento__item bento__item--2x1">
    <h3>Wide Feature</h3>
    <p>Spans two columns for medium emphasis.</p>
  </article>
  <article class="bento__item">
    <h3>Feature E</h3>
    <p>Standard item.</p>
  </article>
  <article class="bento__item bento__item--1x2">
    <h3>Tall Feature</h3>
    <p>Spans two rows.</p>
  </article>
  <article class="bento__item">
    <h3>Feature G</h3>
    <p>Standard item.</p>
  </article>
</div>
```

```css
.bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  gap: 1rem;
  max-width: 1080px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: var(--font-sans);
  grid-auto-flow: dense;
}

@media (max-width: 768px) {
  .bento {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 180px;
  }
}

@media (max-width: 480px) {
  .bento {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
  }
  .bento__item--2x2,
  .bento__item--2x1,
  .bento__item--1x2 {
    grid-column: span 1 !important;
    grid-row: span 1 !important;
  }
}

.bento__item {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow var(--transition-base), transform var(--transition-base);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.bento__item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.bento__item h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.35rem;
}

.bento__item p {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
}

.bento__item--2x2 {
  grid-column: span 2;
  grid-row: span 2;
}

.bento__item--2x2 h3 {
  font-size: 1.4rem;
}

.bento__item--2x2 p {
  font-size: 1rem;
}

.bento__item--2x1 {
  grid-column: span 2;
}

.bento__item--1x2 {
  grid-row: span 2;
}
```

**Variations:**

- **With background images:** Add `background-image: url(...); background-size: cover;` to individual items and use a gradient overlay `background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);` with white text for a magazine-style layout.
- **Interactive reorder:** Add `cursor: grab;` and a JS drag-and-drop library. On drag, apply `transform: scale(1.04); box-shadow: var(--shadow-lg); z-index: 10;` to the dragged item.

---

### 10. Floating Action Panel

**When to use:** Persistent actions (save, undo, formatting tools) that should stay accessible as the user scrolls through content.

**Design reasoning:** The glass-morphism effect (translucent background + blur) keeps the panel visually distinct from content without feeling heavy or opaque. It says "I'm on top of the page, but I'm not blocking your view." The sticky positioning ensures constant access. Grouping actions in a compact row with icon-only buttons and tooltips minimizes the panel's footprint while keeping every action one click away.

```html
<div class="action-panel">
  <button class="action-panel__btn action-panel__btn--primary" title="Save changes">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  </button>
  <button class="action-panel__btn" title="Undo">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
    </svg>
  </button>
  <div class="action-panel__divider"></div>
  <button class="action-panel__btn" title="Preview">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  </button>
  <button class="action-panel__btn" title="Settings">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  </button>
</div>
```

```css
.action-panel {
  position: sticky;
  bottom: 1.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.65rem;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 100;
  font-family: var(--font-sans);
  /* center horizontally */
  margin-left: auto;
  margin-right: auto;
  width: fit-content;
}

.action-panel__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background var(--transition-base),
    color var(--transition-base);
}

.action-panel__btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--color-text);
}

.action-panel__btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.action-panel__btn--primary:hover {
  background: var(--color-primary-dark);
  color: #fff;
}

.action-panel__divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
  margin: 0 0.25rem;
}
```

**Variations:**

- **Bottom sheet (mobile):** On narrow viewports, switch to `position: fixed; bottom: 0; left: 0; right: 0; border-radius: var(--radius-lg) var(--radius-lg) 0 0; justify-content: space-around;` to span the full width like a native bottom bar.
- **Vertical sidebar:** Use `flex-direction: column; position: fixed; right: 1.5rem; top: 50%; transform: translateY(-50%);` for a floating toolbar along the right edge.

---

### 11. Tab Interface with Indicator

**When to use:** Switching between related views (e.g., Monthly/Yearly, Overview/Details) without a full page navigation.

**Design reasoning:** The sliding underline indicator gives spatial continuity -- instead of a sudden visual swap, the indicator travels to the new tab, reinforcing the mental model of "adjacent panels." This animation is cheap (just a CSS transform on a pseudo-element) but high-impact. Keeping tabs left-aligned rather than stretched creates a clear visual group that doesn't depend on the number of tabs.

```html
<div class="tabs">
  <div class="tabs__list" role="tablist">
    <button class="tabs__tab tabs__tab--active" role="tab" data-index="0">
      Overview
    </button>
    <button class="tabs__tab" role="tab" data-index="1">
      Analytics
    </button>
    <button class="tabs__tab" role="tab" data-index="2">
      Settings
    </button>
    <div class="tabs__indicator"></div>
  </div>
  <div class="tabs__panels">
    <div class="tabs__panel tabs__panel--active" role="tabpanel">
      Overview content here.
    </div>
    <div class="tabs__panel" role="tabpanel">
      Analytics content here.
    </div>
    <div class="tabs__panel" role="tabpanel">
      Settings content here.
    </div>
  </div>
</div>
```

```css
.tabs {
  font-family: var(--font-sans);
}

.tabs__list {
  position: relative;
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid var(--color-border);
  padding: 0;
}

.tabs__tab {
  position: relative;
  padding: 0.75em 1.25em;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-base);
  z-index: 1;
  font-family: var(--font-sans);
}

.tabs__tab:hover {
  color: var(--color-text);
}

.tabs__tab--active {
  color: var(--color-primary);
  font-weight: 600;
}

.tabs__indicator {
  position: absolute;
  bottom: -2px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 2px 2px 0 0;
  transition: left var(--transition-base), width var(--transition-base);
  /* Initial position is set via JS */
}

.tabs__panels {
  padding: 1.5rem 0;
}

.tabs__panel {
  display: none;
  animation: tabFadeIn 0.25s ease-out;
}

.tabs__panel--active {
  display: block;
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

```html
<script>
  const tabList = document.querySelector('.tabs__list');
  const tabs = tabList.querySelectorAll('.tabs__tab');
  const indicator = tabList.querySelector('.tabs__indicator');
  const panels = document.querySelectorAll('.tabs__panel');

  function moveIndicator(tab) {
    indicator.style.left = tab.offsetLeft + 'px';
    indicator.style.width = tab.offsetWidth + 'px';
  }

  function activateTab(index) {
    tabs.forEach((t, i) => {
      t.classList.toggle('tabs__tab--active', i === index);
      panels[i].classList.toggle('tabs__panel--active', i === index);
    });
    moveIndicator(tabs[index]);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activateTab(Number(tab.dataset.index));
    });
  });

  // Initialize
  moveIndicator(tabs[0]);
</script>
```

**Variations:**

- **Pill tabs:** Remove the border-bottom on `.tabs__list` and style the indicator as `background: rgba(99,102,241,0.1); border-radius: var(--radius-sm); height: 100%; bottom: 0;` to create a pill that slides behind the active tab.
- **Vertical tabs:** Use `flex-direction: column;` on `.tabs__list` and change the indicator to a left-side bar: `width: 3px; height: auto;` transitioning `top` and `height` instead.

---

### 12. Metric Comparison Bar

**When to use:** Comparing 3-6 metrics visually, such as skill proficiency, project progress, or A/B test results.

**Design reasoning:** Horizontal bars outperform vertical charts for labeled comparisons because the label reads left-to-right into the bar -- no head-tilting or axis-reading required. The animated fill on load creates a "reveal" moment that draws attention. Showing the percentage number at the end of the bar anchors the precise value to the visual length, combining analog and digital readouts.

```html
<div class="metric-bars">
  <div class="metric-bar">
    <div class="metric-bar__header">
      <span class="metric-bar__label">Conversion Rate</span>
      <span class="metric-bar__value">78%</span>
    </div>
    <div class="metric-bar__track">
      <div class="metric-bar__fill" style="--fill-width: 78%"></div>
    </div>
  </div>
  <div class="metric-bar">
    <div class="metric-bar__header">
      <span class="metric-bar__label">Bounce Rate</span>
      <span class="metric-bar__value">34%</span>
    </div>
    <div class="metric-bar__track">
      <div class="metric-bar__fill metric-bar__fill--warning" style="--fill-width: 34%"></div>
    </div>
  </div>
  <div class="metric-bar">
    <div class="metric-bar__header">
      <span class="metric-bar__label">Customer Satisfaction</span>
      <span class="metric-bar__value">92%</span>
    </div>
    <div class="metric-bar__track">
      <div class="metric-bar__fill metric-bar__fill--success" style="--fill-width: 92%"></div>
    </div>
  </div>
</div>
```

```css
@keyframes barFillGrow {
  from {
    width: 0%;
  }
  to {
    width: var(--fill-width);
  }
}

.metric-bars {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 560px;
  font-family: var(--font-sans);
}

.metric-bar__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.4rem;
}

.metric-bar__label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.metric-bar__value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
}

.metric-bar__track {
  height: 10px;
  background: var(--color-background);
  border-radius: 999px;
  overflow: hidden;
}

.metric-bar__fill {
  height: 100%;
  width: var(--fill-width);
  background: var(--color-primary);
  border-radius: 999px;
  animation: barFillGrow 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.metric-bar__fill--success {
  background: var(--color-success);
}

.metric-bar__fill--warning {
  background: var(--color-warning);
}

.metric-bar__fill--danger {
  background: var(--color-danger);
}
```

**Variations:**

- **Stacked bar:** Show multiple segments per row using multiple `.metric-bar__fill` divs inside the track with different colors and no border-radius on internal edges. Good for budget allocation or category breakdown.
- **With threshold marker:** Add a pseudo-element on `.metric-bar__track` positioned at (e.g.) 75% width with `border-left: 2px dashed var(--color-text-muted);` to show a target line.

---

### 13. Timeline / Steps Component

**When to use:** Showing a sequence of events, onboarding steps, or a process flow where order matters.

**Design reasoning:** The vertical line connecting nodes creates an unbreakable visual thread -- the user sees this is a sequence, not a list. Alternating sides on desktop creates rhythm and prevents the layout from feeling like a one-sided wall of text. The connected dots act as progress markers; filling them with the primary color up to the current step shows progress at a glance. Scroll-reveal animation reinforces the temporal nature -- each step "arrives" as you reach it.

```html
<div class="timeline">
  <div class="timeline__item timeline__item--completed">
    <div class="timeline__dot"></div>
    <div class="timeline__card">
      <time class="timeline__date">Jan 2026</time>
      <h3 class="timeline__title">Project Kickoff</h3>
      <p class="timeline__desc">Initial planning and team formation.</p>
    </div>
  </div>
  <div class="timeline__item timeline__item--completed">
    <div class="timeline__dot"></div>
    <div class="timeline__card">
      <time class="timeline__date">Feb 2026</time>
      <h3 class="timeline__title">Design Phase</h3>
      <p class="timeline__desc">Wireframes, prototyping, and user testing.</p>
    </div>
  </div>
  <div class="timeline__item timeline__item--active">
    <div class="timeline__dot"></div>
    <div class="timeline__card">
      <time class="timeline__date">Mar 2026</time>
      <h3 class="timeline__title">Development</h3>
      <p class="timeline__desc">Building components and core features.</p>
    </div>
  </div>
  <div class="timeline__item">
    <div class="timeline__dot"></div>
    <div class="timeline__card">
      <time class="timeline__date">Apr 2026</time>
      <h3 class="timeline__title">Launch</h3>
      <p class="timeline__desc">Public release and onboarding support.</p>
    </div>
  </div>
</div>
```

```css
@keyframes timelineReveal {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: var(--font-sans);
}

/* The vertical connecting line */
.timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: var(--color-border);
  transform: translateX(-50%);
}

@media (max-width: 640px) {
  .timeline::before {
    left: 20px;
  }
}

.timeline__item {
  position: relative;
  display: flex;
  justify-content: flex-end;
  width: 50%;
  padding-right: 2.5rem;
  padding-bottom: 2rem;
  margin-left: auto;
  /* Scroll reveal */
  opacity: 0;
  animation: timelineReveal 0.5s ease-out forwards;
}

.timeline__item:nth-child(odd) {
  justify-content: flex-start;
  padding-right: 0;
  padding-left: 2.5rem;
  margin-left: 0;
  margin-right: auto;
}

/* Stagger animation by child index */
.timeline__item:nth-child(1) { animation-delay: 0.1s; }
.timeline__item:nth-child(2) { animation-delay: 0.25s; }
.timeline__item:nth-child(3) { animation-delay: 0.4s; }
.timeline__item:nth-child(4) { animation-delay: 0.55s; }

@media (max-width: 640px) {
  .timeline__item,
  .timeline__item:nth-child(odd) {
    width: 100%;
    padding-left: 3rem;
    padding-right: 0;
    margin-left: 0;
    justify-content: flex-start;
  }
}

.timeline__dot {
  position: absolute;
  top: 0.25rem;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  z-index: 1;
}

/* Position dot on the center line */
.timeline__item:nth-child(odd) .timeline__dot {
  right: -7px;
}

.timeline__item:nth-child(even) .timeline__dot {
  left: -7px;
}

@media (max-width: 640px) {
  .timeline__item .timeline__dot,
  .timeline__item:nth-child(odd) .timeline__dot,
  .timeline__item:nth-child(even) .timeline__dot {
    left: 13px;
    right: auto;
  }
}

.timeline__item--completed .timeline__dot {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.timeline__item--active .timeline__dot {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
}

.timeline__card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
}

.timeline__date {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.35rem;
}

.timeline__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.3rem;
}

.timeline__desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}
```

**Variations:**

- **Single-sided (always):** Remove the alternating logic and keep all items left-aligned. Simpler and works better for content-heavy steps like documentation changelogs.
- **Numbered steps:** Replace the dot with a counter using `counter-increment: timeline;` and `content: counter(timeline);` inside the dot, styled as a small numbered circle. Good for onboarding flows.

---

### 14. Image Gallery with Lightbox Trigger

**When to use:** Showcasing portfolio work, product photos, or any visual collection where users will want to view images at full size.

**Design reasoning:** The grid creates a scannable overview that respects all images equally. The hover overlay with an "expand" hint signals interactivity without cluttering the default state. The slight scale-up on hover creates a "reaching toward you" effect that implies depth and clickability. Keeping the overlay dark with white text/icons ensures the hint is readable regardless of image content.

```html
<div class="gallery">
  <figure class="gallery__item">
    <img class="gallery__img" src="photo-1.jpg" alt="Description" loading="lazy" />
    <figcaption class="gallery__overlay">
      <svg class="gallery__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 3 21 3 21 9"/>
        <polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/>
        <line x1="3" y1="21" x2="10" y2="14"/>
      </svg>
      <span class="gallery__label">View full size</span>
    </figcaption>
  </figure>
  <figure class="gallery__item">
    <img class="gallery__img" src="photo-2.jpg" alt="Description" loading="lazy" />
    <figcaption class="gallery__overlay">
      <svg class="gallery__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 3 21 3 21 9"/>
        <polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/>
        <line x1="3" y1="21" x2="10" y2="14"/>
      </svg>
      <span class="gallery__label">View full size</span>
    </figcaption>
  </figure>
  <!-- Repeat for more images -->
</div>
```

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
  font-family: var(--font-sans);
}

.gallery__item {
  position: relative;
  margin: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 4 / 3;
}

.gallery__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.gallery__item:hover .gallery__img {
  transform: scale(1.06);
}

.gallery__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0);
  transition: background 0.3s ease;
}

.gallery__item:hover .gallery__overlay {
  background: rgba(0, 0, 0, 0.45);
}

.gallery__icon,
.gallery__label {
  color: #fff;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.gallery__item:hover .gallery__icon,
.gallery__item:hover .gallery__label {
  opacity: 1;
  transform: translateY(0);
}

.gallery__label {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}
```

**Variations:**

- **Masonry layout:** Replace the grid with CSS columns: `column-count: 3; column-gap: 0.75rem;` and set `.gallery__item { break-inside: avoid; margin-bottom: 0.75rem; aspect-ratio: auto; }` for Pinterest-style staggered rows.
- **With category filters:** Add a row of filter buttons above the grid that toggle `display: none` on items. Apply `transition: opacity 0.3s, transform 0.3s;` for a smooth filter animation.

---

### 15. Toast / Notification

**When to use:** Transient feedback messages -- success confirmations, error alerts, or info notices that should not block the user flow.

**Design reasoning:** Slide-in from the top-right (or bottom-right) places the notification in the peripheral vision zone -- noticeable but not interrupting. The auto-dismiss progress bar sets an expectation of "this will go away on its own," reducing the cognitive burden of "do I need to act on this?" The icon provides instant categorization (green check = success, red circle = error) before the user reads the text.

```html
<div class="toast-container" id="toastContainer">
  <!-- Toasts are injected here -->
</div>

<!-- Example toast markup (generated via JS): -->
<div class="toast toast--success">
  <div class="toast__icon">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  </div>
  <div class="toast__body">
    <p class="toast__message">Changes saved successfully.</p>
  </div>
  <button class="toast__close" aria-label="Dismiss">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
  <div class="toast__progress"></div>
</div>
```

```css
@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toastSlideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

@keyframes toastProgressShrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-container {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  z-index: 9999;
  pointer-events: none;
  max-width: 380px;
  width: 100%;
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  pointer-events: auto;
  font-family: var(--font-sans);
  animation: toastSlideIn 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
}

.toast--dismissing {
  animation: toastSlideOut 0.3s ease-in forwards;
}

.toast__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  margin-top: 1px;
}

.toast--success .toast__icon {
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-success);
}

.toast--error .toast__icon {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-danger);
}

.toast--warning .toast__icon {
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning);
}

.toast--info .toast__icon {
  background: rgba(99, 102, 241, 0.12);
  color: var(--color-primary);
}

.toast__body {
  flex: 1;
  min-width: 0;
}

.toast__message {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text);
  margin: 0;
  line-height: 1.45;
}

.toast__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background var(--transition-base);
}

.toast__close:hover {
  background: rgba(0, 0, 0, 0.06);
}

.toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 0 0 0 var(--radius-md);
  animation: toastProgressShrink 5s linear forwards;
}

.toast--success .toast__progress {
  background: var(--color-success);
}

.toast--error .toast__progress {
  background: var(--color-danger);
}

.toast--warning .toast__progress {
  background: var(--color-warning);
}

.toast--info .toast__progress {
  background: var(--color-primary);
}
```

```html
<script>
  function showToast(type, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = {
      success: '<polyline points="20 6 9 17 4 12"/>',
      error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
    };

    toast.innerHTML = `
      <div class="toast__icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">${icons[type]}</svg>
      </div>
      <div class="toast__body">
        <p class="toast__message">${message}</p>
      </div>
      <button class="toast__close" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="toast__progress" style="animation-duration: ${duration}ms"></div>
    `;

    toast.querySelector('.toast__close').addEventListener('click', () => dismiss(toast));
    container.appendChild(toast);

    const timer = setTimeout(() => dismiss(toast), duration);

    function dismiss(el) {
      clearTimeout(timer);
      el.classList.add('toast--dismissing');
      el.addEventListener('animationend', () => el.remove());
    }
  }

  // Usage:
  // showToast('success', 'Changes saved successfully.');
  // showToast('error', 'Something went wrong. Please try again.');
</script>
```

**Variations:**

- **Bottom-left placement:** Change `.toast-container` to `bottom: 1.25rem; left: 1.25rem; top: auto;` and reverse the slide direction to `translateX(-100%)` for apps where the primary action area is in the top-right.
- **Stacking with count:** When more than 3 toasts stack, collapse older ones behind the newest with `transform: scale(0.95) translateY(-8px); opacity: 0.7;` and show a "+N more" indicator. This prevents the toast stack from overwhelming the screen.

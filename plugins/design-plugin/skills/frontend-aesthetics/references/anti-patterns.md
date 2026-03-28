# Design Anti-Patterns Catalog

This catalog documents the most common visual anti-patterns that make AI-generated frontends look generic, lifeless, and immediately recognizable as "AI slop." Use it as a checklist when reviewing generated UI code -- if you spot any of these patterns, apply the corresponding fix before shipping.

---

### 1. The Gray Void

**What it is:** A flat `#f5f5f5` or `#fafafa` background applied everywhere with no texture, gradient, or tonal variation. The page feels like an empty room with fluorescent lighting.

**Why it's bad:** Flat neutral backgrounds strip away all spatial depth and atmosphere. The eye has nothing to anchor on, and the design feels cheap and unfinished.

**The Fix:** Introduce subtle gradients, noise textures, or tonal shifts between sections. Even a barely-perceptible warm or cool tint gives the background life.

**Before:**
```css
/* Generic AI output */
body {
  background-color: #f5f5f5;
}

section {
  background-color: #ffffff;
}
```

**After:**
```css
/* Layered, intentional background */
body {
  background-color: #faf9f7;
  background-image:
    radial-gradient(ellipse at 20% 0%, rgba(255, 228, 200, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 100%, rgba(200, 210, 255, 0.1) 0%, transparent 50%);
}

section:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.015);
}

/* Optional: subtle noise texture overlay */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  pointer-events: none;
  z-index: 9999;
}
```

---

### 2. Font Soup

**What it is:** Three or more typefaces mixed together with arbitrary font-weight values -- bold here, semibold there, light somewhere else -- with no governing typographic scale.

**Why it's bad:** Random font pairings and weight choices create visual noise. The reader's eye cannot establish a rhythm, and the page feels assembled by committee rather than designed.

**The Fix:** Limit yourself to two typefaces maximum (one for headings, one for body). Define a strict weight palette (e.g., 400 for body, 500 for emphasis, 700 for headings) and stick to it.

**Before:**
```css
/* Font chaos */
h1 { font-family: 'Playfair Display', serif; font-weight: 800; }
h2 { font-family: 'Montserrat', sans-serif; font-weight: 600; }
h3 { font-family: 'Poppins', sans-serif; font-weight: 500; }
p  { font-family: 'Open Sans', sans-serif; font-weight: 300; }
.caption { font-family: 'Lato', sans-serif; font-weight: 400; }
.label { font-family: 'Roboto', sans-serif; font-weight: 700; }
```

**After:**
```css
/* Disciplined type system */
:root {
  --font-heading: 'Instrument Serif', serif;
  --font-body: 'Inter', sans-serif;
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-bold: 700;
}

h1, h2, h3 { font-family: var(--font-heading); font-weight: var(--weight-bold); }
p, li, td  { font-family: var(--font-body); font-weight: var(--weight-normal); }
strong, .label { font-weight: var(--weight-medium); }
```

---

### 3. The System Font Default

**What it is:** Using Inter, Roboto, or system sans-serif for everything, even when the product has a distinct brand personality -- a craft bakery site that reads like a Google settings page.

**Why it's bad:** These fonts are excellent defaults, but they are defaults. When every AI-generated page uses them, the result is an ocean of sameness. Typography is the single fastest way to inject personality.

**The Fix:** Choose a typeface that matches the brand's character. Serif for editorial gravitas, geometric sans for tech precision, humanist sans for warmth, display faces for boldness.

**Before:**
```html
<!-- Every AI landing page ever -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { font-family: 'Inter', sans-serif; }
  h1 { font-weight: 700; font-size: 48px; }
</style>
<h1>Elevate Your Workflow</h1>
```

**After:**
```html
<!-- A personality-driven choice for, say, a creative agency -->
<link href="https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@700;800&family=Satoshi:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --font-display: 'Cabinet Grotesk', sans-serif;
    --font-body: 'Satoshi', sans-serif;
  }
  h1 {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    letter-spacing: -0.03em;
    line-height: 1.05;
  }
  body { font-family: var(--font-body); }
</style>
<h1>We make brands impossible to ignore.</h1>
```

---

### 4. The Floating Card

**What it is:** Cards that sit on the page with a box shadow but have no visual connection to surrounding content -- isolated rectangles floating in space with no grouping logic.

**Why it's bad:** Cards should serve a structural purpose: grouping related content and creating scannable units. When every piece of content is wrapped in an identical card, the card becomes noise rather than signal.

**The Fix:** Use cards only when content genuinely needs grouping. Connect cards to their context through shared backgrounds, borders that touch, or visual anchoring to a parent container.

**Before:**
```html
<!-- Isolated floating cards -->
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 40px;">
  <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h3>Feature One</h3>
    <p>Description text here.</p>
  </div>
  <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h3>Feature Two</h3>
    <p>Description text here.</p>
  </div>
  <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h3>Feature Three</h3>
    <p>Description text here.</p>
  </div>
</div>
```

**After:**
```html
<!-- Cards anchored to a shared container with visual context -->
<section style="background: #1a1a2e; border-radius: 24px; padding: 64px 48px; margin: 0 auto; max-width: 1100px;">
  <h2 style="color: #fff; margin-bottom: 48px;">What we do</h2>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden;">
    <div style="background: rgba(255,255,255,0.04); padding: 40px 32px;">
      <h3 style="color: #fff;">Feature One</h3>
      <p style="color: rgba(255,255,255,0.6);">Description text here.</p>
    </div>
    <div style="background: rgba(255,255,255,0.04); padding: 40px 32px;">
      <h3 style="color: #fff;">Feature Two</h3>
      <p style="color: rgba(255,255,255,0.6);">Description text here.</p>
    </div>
    <div style="background: rgba(255,255,255,0.04); padding: 40px 32px;">
      <h3 style="color: #fff;">Feature Three</h3>
      <p style="color: rgba(255,255,255,0.6);">Description text here.</p>
    </div>
  </div>
</section>
```

---

### 5. The Monotone Grid

**What it is:** A perfectly uniform grid of identically sized, identically styled cards with no variation in size, emphasis, or visual weight. Three cards, then three more, then three more.

**Why it's bad:** Uniform grids destroy hierarchy. When everything is the same size, nothing is important. The layout communicates "I couldn't decide what matters" and the user's eye wanders aimlessly.

**The Fix:** Break the grid. Make one card span two columns, vary heights, use a featured/hero card, or alternate layout patterns between rows.

**Before:**
```css
/* Monotone grid */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.grid .card {
  padding: 24px;
  background: white;
  border-radius: 8px;
}
```

**After:**
```css
/* Grid with hierarchy and variation */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 20px;
}

.grid .card:first-child {
  grid-column: 1 / 3;     /* Featured card spans two columns */
  grid-row: 1 / 3;        /* And two rows */
  padding: 48px;
  background: #0f172a;
  color: #fff;
  border-radius: 16px;
  font-size: 1.25rem;
}

.grid .card:not(:first-child) {
  padding: 28px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
}
```

---

### 6. The Shy CTA

**What it is:** Call-to-action buttons that use muted colors, small sizes, thin borders, or ghost-button styling, making them blend into the surrounding content instead of demanding a click.

**Why it's bad:** The CTA is the entire point of most pages. A shy CTA is a conversion killer -- users literally do not see it, or they see it but feel no urgency to interact.

**The Fix:** Make the primary CTA the most visually dominant element in its section. Use size, color contrast, weight, and whitespace to make it impossible to miss.

**Before:**
```css
/* Timid CTA */
.cta-button {
  padding: 10px 20px;
  font-size: 14px;
  color: #6366f1;
  background: transparent;
  border: 1px solid #6366f1;
  border-radius: 6px;
  cursor: pointer;
}
```

**After:**
```css
/* Commanding CTA */
.cta-button {
  padding: 18px 40px;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  background: #0f172a;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 8px 24px rgba(15, 23, 42, 0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  position: relative;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 12px 32px rgba(15, 23, 42, 0.3);
}

.cta-button:active {
  transform: translateY(0);
}
```

---

### 7. The Naked Section

**What it is:** Content sections that flow directly into each other with no spatial definition -- no background shifts, no dividers, no breathing room. One block of text ends and the next begins with only a margin for separation.

**Why it's bad:** Without visual rhythm, the page becomes an undifferentiated stream. Users cannot tell where one idea ends and another begins, and the design feels unstructured.

**The Fix:** Give each section its own spatial identity using alternating backgrounds, generous vertical padding, subtle dividers, or container shifts.

**Before:**
```css
/* No section definition */
section {
  padding: 40px 20px;
}

section h2 {
  margin-bottom: 16px;
}
```

**After:**
```css
/* Defined spatial rhythm */
section {
  padding: 96px 24px;
  position: relative;
}

section:nth-child(odd) {
  background-color: #fafaf8;
}

section:nth-child(even) {
  background-color: #fff;
}

/* Subtle top border as divider */
section + section::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(90%, 1000px);
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 0, 0, 0.06) 20%,
    rgba(0, 0, 0, 0.06) 80%,
    transparent
  );
}
```

---

### 8. Purple Gradient Syndrome

**What it is:** The ubiquitous purple-to-blue (or purple-to-pink) gradient used for hero backgrounds, buttons, and accent elements. Often paired with white text and a glassmorphism card.

**Why it's bad:** This gradient has become the universal fingerprint of AI-generated design. It is the Comic Sans of 2024-2026 -- the moment a user sees it, they know a human did not design this.

**The Fix:** Derive your color palette from the brand, the content, or an intentional mood. If you must use a gradient, pick unexpected color stops and skew the angle.

**Before:**
```css
/* The AI gradient */
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 120px 20px;
}

.hero-button {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px 32px;
  border-radius: 50px;
}
```

**After:**
```css
/* Intentional, brand-rooted palette */
.hero {
  background-color: #0c1220;
  background-image:
    radial-gradient(ellipse at 10% 90%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 10%, rgba(251, 191, 36, 0.08) 0%, transparent 40%);
  color: #f1f5f9;
  padding: 140px 24px 120px;
}

.hero-button {
  background: #10b981;
  color: #022c22;
  font-weight: 600;
  padding: 16px 36px;
  border: none;
  border-radius: 10px;
}
```

---

### 9. The Padding Desert

**What it is:** Every element on the page uses the same tight padding (often 16px or 20px) regardless of content type or container size. Headers, cards, sections, inputs -- all crammed into the same small box.

**Why it's bad:** Uniform tight padding makes the design feel suffocating and cheap. Generous, varied spacing is the single most reliable indicator of professional design work.

**The Fix:** Create a spacing scale and apply it with intent -- larger containers get more breathing room, smaller elements stay compact, and whitespace is treated as a design element.

**Before:**
```css
/* Everything gets the same crammed padding */
.hero { padding: 20px; }
.section { padding: 20px; }
.card { padding: 20px; }
.card h3 { margin-bottom: 8px; }
.footer { padding: 20px; }
```

**After:**
```css
/* Intentional spacing scale */
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 32px;
  --space-xl: 64px;
  --space-2xl: 96px;
  --space-3xl: 128px;
}

.hero { padding: var(--space-3xl) var(--space-lg); }
.section { padding: var(--space-2xl) var(--space-lg); }
.card { padding: var(--space-lg) var(--space-lg); }
.card h3 { margin-bottom: var(--space-md); }
.footer { padding: var(--space-xl) var(--space-lg); }
```

---

### 10. The Shadow Stack

**What it is:** Every card, button, and container has a `box-shadow`, but each one uses a different arbitrary value. Some are harsh and dark, others are barely visible, and none relate to a coherent elevation system.

**Why it's bad:** Random shadows create visual chaos. Instead of communicating depth and hierarchy, they add noise. The page looks like a collage of components pulled from different templates.

**The Fix:** Define a shadow scale (like an elevation system) with 3-5 levels, and apply them consistently based on an element's role and interactive state.

**Before:**
```css
/* Random shadow values */
.card { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
.button { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15); }
.modal { box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); }
.dropdown { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
.navbar { box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12); }
.tooltip { box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2); }
```

**After:**
```css
/* Systematic elevation scale */
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.04), 0 12px 40px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 8px 16px rgba(0, 0, 0, 0.06), 0 24px 64px rgba(0, 0, 0, 0.14);
}

.tooltip { box-shadow: var(--shadow-sm); }
.card { box-shadow: var(--shadow-md); }
.dropdown, .navbar { box-shadow: var(--shadow-lg); }
.modal { box-shadow: var(--shadow-xl); }

/* Interactive lift on hover */
.card { transition: box-shadow 0.2s ease; }
.card:hover { box-shadow: var(--shadow-lg); }
```

---

### 11. The Infinite Scroll of Same

**What it is:** A long-scroll landing page where every section uses the same layout -- centered heading, short paragraph, three-column card grid. Repeat five to eight times until the footer.

**Why it's bad:** Repetition without variation is monotony. The user stops scrolling because each new section looks like the one above. Visual rhythm requires contrast between sections, not just within them.

**The Fix:** Alternate layout structures between sections: a wide image section, then a two-column text block, then a single spotlight card, then a testimonial with a different background treatment.

**Before:**
```html
<!-- Section 1 -->
<section>
  <h2 style="text-align: center;">Features</h2>
  <p style="text-align: center;">We offer the best features.</p>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
    <div class="card">...</div><div class="card">...</div><div class="card">...</div>
  </div>
</section>
<!-- Section 2: identical layout -->
<section>
  <h2 style="text-align: center;">Benefits</h2>
  <p style="text-align: center;">Here are the benefits.</p>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
    <div class="card">...</div><div class="card">...</div><div class="card">...</div>
  </div>
</section>
```

**After:**
```html
<!-- Section 1: Asymmetric two-column -->
<section style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 80px; align-items: center; padding: 96px 48px;">
  <div>
    <h2>Features that matter</h2>
    <p>A focused description of the core value.</p>
    <a href="#" class="cta-button">Explore</a>
  </div>
  <div>
    <img src="feature-visual.jpg" alt="" style="border-radius: 16px; width: 100%;" />
  </div>
</section>

<!-- Section 2: Full-width spotlight with centered content -->
<section style="background: #0f172a; color: white; padding: 120px 48px; text-align: center;">
  <blockquote style="font-size: 2rem; max-width: 700px; margin: 0 auto; font-style: italic; line-height: 1.4;">
    "This changed how our entire team works."
  </blockquote>
  <cite style="display: block; margin-top: 24px; opacity: 0.6;">-- J. Smith, Acme Corp</cite>
</section>

<!-- Section 3: Numbered list, left-aligned -->
<section style="max-width: 680px; margin: 0 auto; padding: 96px 24px;">
  <h2>How it works</h2>
  <ol style="list-style: none; counter-reset: step; padding: 0;">
    <li style="counter-increment: step; padding: 24px 0; border-bottom: 1px solid #e5e5e5;">
      <strong style="font-size: 1.5rem; color: #a3a3a3; margin-right: 16px;">01</strong>
      Sign up and connect your tools.
    </li>
    <li style="counter-increment: step; padding: 24px 0; border-bottom: 1px solid #e5e5e5;">
      <strong style="font-size: 1.5rem; color: #a3a3a3; margin-right: 16px;">02</strong>
      Configure your first workflow.
    </li>
    <li style="counter-increment: step; padding: 24px 0;">
      <strong style="font-size: 1.5rem; color: #a3a3a3; margin-right: 16px;">03</strong>
      Watch your productivity soar.
    </li>
  </ol>
</section>
```

---

### 12. The Orphaned Icon

**What it is:** Decorative icons scattered throughout the page with no functional purpose -- a random lightning bolt next to "Fast," a generic globe next to "Global," a shield next to "Secure." Often mixing icon libraries or styles (outlined, filled, duotone all at once).

**Why it's bad:** Icons used as filler add visual clutter without aiding comprehension. Mixed icon styles break consistency and look amateurish. The user's eye is drawn to meaningless decorations.

**The Fix:** Either use icons functionally (navigation, status indicators, interactive affordances) or remove them. If you keep them, enforce a single icon style and ensure each icon communicates something the text alone does not.

**Before:**
```html
<!-- Random decorative icons -->
<div class="feature">
  <svg><!-- some outlined lightning bolt --></svg>
  <h3>Blazing Fast</h3>
  <p>Our platform is incredibly fast.</p>
</div>
<div class="feature">
  <svg><!-- filled shield icon from a different library --></svg>
  <h3>Secure</h3>
  <p>Your data is safe with us.</p>
</div>
<div class="feature">
  <svg><!-- duotone globe icon --></svg>
  <h3>Global</h3>
  <p>Available worldwide.</p>
</div>
```

**After:**
```html
<!-- Icons removed; replaced with meaningful visual markers -->
<div class="feature">
  <span class="feature-number" aria-hidden="true">01</span>
  <h3>Sub-50ms responses</h3>
  <p>P95 latency under 50 milliseconds, measured across all regions.</p>
</div>
<div class="feature">
  <span class="feature-number" aria-hidden="true">02</span>
  <h3>SOC 2 Type II certified</h3>
  <p>Independently audited. Your data never leaves your VPC.</p>
</div>
<div class="feature">
  <span class="feature-number" aria-hidden="true">03</span>
  <h3>28 edge locations</h3>
  <p>Deployed to every major continent with automatic failover.</p>
</div>

<style>
  .feature-number {
    font-size: 0.875rem;
    font-weight: 600;
    color: #a1a1aa;
    letter-spacing: 0.05em;
    display: block;
    margin-bottom: 12px;
  }
</style>
```

---

### 13. The Fake Dashboard

**What it is:** A screenshot or mockup of a "dashboard" with meaningless numbers ("$12,345 Revenue," "+24% Growth"), generic donut charts, and placeholder bar graphs. Used as a hero image or feature illustration.

**Why it's bad:** Users instantly recognize fake data. It communicates that the product either does not exist yet or that the builder could not be bothered to show the real thing. It destroys credibility.

**The Fix:** Show real UI (even a simplified version), use realistic data ranges, or replace the fake dashboard with an abstract representation of the value proposition. If you must show a dashboard, populate it with contextually plausible data and realistic labels.

**Before:**
```html
<!-- Generic dashboard mockup -->
<div class="dashboard-mock">
  <div class="stat-card">
    <span class="label">Revenue</span>
    <span class="value">$12,345</span>
    <span class="change positive">+24%</span>
  </div>
  <div class="stat-card">
    <span class="label">Users</span>
    <span class="value">1,234</span>
    <span class="change positive">+12%</span>
  </div>
  <div class="chart-placeholder" style="height: 200px; background: #f0f0f0; border-radius: 8px;">
    <!-- empty chart area -->
  </div>
</div>
```

**After:**
```html
<!-- Focused, believable product preview -->
<div class="product-preview" role="img" aria-label="Application interface preview">
  <div class="preview-toolbar">
    <span class="preview-dot"></span>
    <span class="preview-dot"></span>
    <span class="preview-dot"></span>
  </div>
  <div class="preview-body">
    <div class="preview-sidebar">
      <div class="sidebar-item active">Campaign Q1 launch</div>
      <div class="sidebar-item">Onboarding flow v2</div>
      <div class="sidebar-item">Support ticket triage</div>
    </div>
    <div class="preview-main">
      <h4 style="margin: 0 0 8px;">Campaign Q1 launch</h4>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">3 of 5 steps completed -- last edited 2h ago</p>
      <div class="progress-track">
        <div class="progress-fill" style="width: 60%;"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .product-preview {
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    overflow: hidden;
    max-width: 600px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  }
  .preview-toolbar {
    display: flex; gap: 6px;
    padding: 12px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }
  .preview-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: #d1d5db;
  }
  .preview-body { display: flex; min-height: 200px; }
  .preview-sidebar {
    width: 200px; padding: 16px;
    border-right: 1px solid #e5e7eb;
    font-size: 13px;
  }
  .sidebar-item { padding: 8px 12px; border-radius: 6px; color: #6b7280; }
  .sidebar-item.active { background: #f0fdf4; color: #166534; font-weight: 500; }
  .preview-main { padding: 24px; flex: 1; }
  .progress-track {
    height: 6px; background: #e5e7eb;
    border-radius: 3px; overflow: hidden;
  }
  .progress-fill { height: 100%; background: #22c55e; border-radius: 3px; }
</style>
```

---

### 14. The Limp Hover

**What it is:** Interactive elements (buttons, cards, links) that either have no hover state at all or change so subtly (e.g., opacity goes from 1 to 0.95) that the user cannot perceive any feedback.

**Why it's bad:** Hover states are a critical affordance signal. They tell the user "this is interactive" and create a sense of direct manipulation. Without them, the interface feels dead and unresponsive.

**The Fix:** Design hover states that are visually obvious but tasteful: color shifts, elevation changes, underline animations, or background fills. The change should be perceptible within 100ms.

**Before:**
```css
/* Imperceptible hover */
.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  transition: all 0.3s;
}

.card:hover {
  opacity: 0.95;
}

.link {
  color: #6366f1;
}

.link:hover {
  color: #5558e6; /* nearly identical shade */
}
```

**After:**
```css
/* Clear, satisfying hover states */
.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
  transform: translateY(-2px);
}

.link {
  color: #0f172a;
  text-decoration: none;
  background-image: linear-gradient(#0f172a, #0f172a);
  background-size: 0% 2px;
  background-position: 0 100%;
  background-repeat: no-repeat;
  transition: background-size 0.25s ease;
}

.link:hover {
  background-size: 100% 2px;
}
```

---

### 15. The Cookie Banner Hero

**What it is:** A hero section that follows the exact SaaS template: centered headline with gradient text, subtitle underneath, two buttons side by side ("Get Started" primary, "Learn More" ghost), abstract blob or gradient in the background.

**Why it's bad:** This layout has been generated so many millions of times that it is now anti-persuasive. Users pattern-match it instantly as template/AI-generated and bounce. It communicates zero uniqueness about the product.

**The Fix:** Break the template. Use asymmetric layouts, put the CTA somewhere unexpected, lead with a visual instead of text, use a single bold statement instead of headline + subtitle + buttons.

**Before:**
```html
<section class="hero">
  <h1>The <span style="background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Future</span> of Productivity</h1>
  <p>Streamline your workflow with our AI-powered platform that helps teams collaborate better.</p>
  <div class="hero-buttons">
    <button class="btn-primary">Get Started Free</button>
    <button class="btn-ghost">Learn More</button>
  </div>
</section>
```

**After:**
```html
<section class="hero" style="display: grid; grid-template-columns: 1.1fr 1fr; min-height: 90vh; align-items: center;">
  <div style="padding: 80px 64px;">
    <p style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.1em; color: #10b981; font-weight: 600; margin-bottom: 24px;">
      Now in public beta
    </p>
    <h1 style="font-size: clamp(2.5rem, 4vw, 4rem); line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 32px;">
      Stop managing projects.<br/>Start finishing them.
    </h1>
    <button style="background: #0f172a; color: #fff; padding: 18px 44px; font-size: 1rem; font-weight: 600; border: none; border-radius: 12px; cursor: pointer;">
      Try it now -- no signup
    </button>
  </div>
  <div style="background: #f8fafc; height: 100%; display: flex; align-items: center; justify-content: center; padding: 48px;">
    <!-- Real product screenshot or demo video, not a gradient blob -->
    <video autoplay muted loop playsinline style="border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.1); max-width: 100%;">
      <source src="demo.mp4" type="video/mp4" />
    </video>
  </div>
</section>
```

---

### 16. Border Radius Roulette

**What it is:** Inconsistent border-radius values sprinkled throughout the page -- buttons with 4px, cards with 12px, avatars with 50%, modals with 16px, inputs with 8px -- with no governing scale.

**Why it's bad:** Inconsistent rounding creates a subtle but persistent feeling that the design was assembled from parts that do not belong together. It is one of the fastest ways to make a polished page look like a prototype.

**The Fix:** Define a radius scale (typically 3-4 values) and assign them by role: small for inputs and chips, medium for cards and buttons, large for modals and containers.

**Before:**
```css
/* Radius chaos */
.button { border-radius: 4px; }
.card { border-radius: 12px; }
.input { border-radius: 8px; }
.avatar { border-radius: 50%; }
.modal { border-radius: 16px; }
.badge { border-radius: 999px; }
.dropdown { border-radius: 6px; }
.tooltip { border-radius: 10px; }
```

**After:**
```css
/* Consistent radius scale */
:root {
  --radius-sm: 6px;   /* Inputs, badges, tooltips, chips */
  --radius-md: 12px;  /* Buttons, cards, dropdowns */
  --radius-lg: 20px;  /* Modals, sections, large containers */
  --radius-full: 9999px; /* Pills, avatars */
}

.button { border-radius: var(--radius-md); }
.card { border-radius: var(--radius-md); }
.input { border-radius: var(--radius-sm); }
.avatar { border-radius: var(--radius-full); }
.modal { border-radius: var(--radius-lg); }
.badge { border-radius: var(--radius-full); }
.dropdown { border-radius: var(--radius-md); }
.tooltip { border-radius: var(--radius-sm); }
```

---

### 17. The Text Wall

**What it is:** Large blocks of body text -- four or more paragraphs -- presented as an unbroken column with no pull quotes, no images, no subheadings, and no typographic variation. Just a gray rectangle of words.

**Why it's bad:** Nobody reads text walls on the web. Users scan. Without visual entry points (bolded phrases, pull quotes, subheadings, images), the content is effectively invisible no matter how good the writing is.

**The Fix:** Break long text into scannable chunks. Add subheadings every 2-3 paragraphs, use pull quotes for key insights, vary paragraph width, and introduce visual markers.

**Before:**
```html
<article style="max-width: 700px; margin: 0 auto;">
  <h1>Our Approach to Design</h1>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
  <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
  <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
  <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
</article>
```

**After:**
```html
<article style="max-width: 700px; margin: 0 auto;">
  <h1 style="font-size: 2.5rem; line-height: 1.15; margin-bottom: 24px;">Our Approach to Design</h1>
  <p class="lede" style="font-size: 1.25rem; line-height: 1.6; color: #4b5563; margin-bottom: 40px;">
    We believe great design starts with restraint -- knowing what to leave out is harder than knowing what to add.
  </p>

  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.</p>

  <figure style="margin: 48px -80px; padding: 32px 80px; border-left: 3px solid #0f172a;">
    <blockquote style="font-size: 1.5rem; line-height: 1.4; font-style: italic; margin: 0;">
      "Restraint is the single hardest design skill to teach."
    </blockquote>
  </figure>

  <h2 style="font-size: 1.25rem; margin-top: 48px; margin-bottom: 16px;">Starting with structure</h2>
  <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p>
  <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.</p>

  <h2 style="font-size: 1.25rem; margin-top: 48px; margin-bottom: 16px;">The details that compound</h2>
  <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
</article>
```

---

### 18. Motion Sickness

**What it is:** Every element on the page has an entrance animation -- cards slide in from the left, headings fade up, icons bounce, buttons pulse -- and they all fire simultaneously or in rapid succession when the section scrolls into view.

**Why it's bad:** Excessive simultaneous animation overwhelms the senses and actually makes the page harder to read. Instead of guiding attention, it scatters it. The result feels like a PowerPoint presentation from 2007.

**The Fix:** Animate sparingly and choreograph deliberately. Only animate elements that benefit from staged reveal, use consistent easing, stagger timings, and keep durations short (200-400ms).

**Before:**
```css
/* Everything animates at once */
.fade-in {
  opacity: 0;
  transform: translateY(30px);
  animation: fadeInUp 0.8s ease forwards;
}

@keyframes fadeInUp {
  to { opacity: 1; transform: translateY(0); }
}

/* Applied to literally everything */
h2.fade-in { animation-delay: 0s; }
p.fade-in { animation-delay: 0.1s; }
.card:nth-child(1).fade-in { animation-delay: 0.2s; }
.card:nth-child(2).fade-in { animation-delay: 0.3s; }
.card:nth-child(3).fade-in { animation-delay: 0.4s; }
.icon.fade-in { animation: bounce 1s infinite; }
.button.fade-in { animation: pulse 2s infinite; }
```

**After:**
```css
/* Minimal, choreographed motion */
@media (prefers-reduced-motion: no-preference) {
  .reveal {
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.4s ease, transform 0.4s ease;
  }

  .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Stagger only direct children that benefit from it */
  .stagger > .reveal:nth-child(2) { transition-delay: 80ms; }
  .stagger > .reveal:nth-child(3) { transition-delay: 160ms; }
}

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

```javascript
/* Trigger with IntersectionObserver -- fires once, not repeatedly */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); /* animate once only */
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
```

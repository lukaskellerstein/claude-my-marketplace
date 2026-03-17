# HTML/CSS Slide Templates

Templates for complete slides with real text content. Text elements use `data-pptx-*` attributes for extraction into editable PptxGenJS text. The HTML layout engine (flexbox/grid) sizes all containers around the actual text, ensuring proper fit.

## Workflow Recap

1. Design slides in HTML with `data-pptx-*` text elements
2. Preview in Playwright (see complete slides with text)
3. Extract text positions via `browser_evaluate` (`getBoundingClientRect`)
4. Hide text (`visibility: hidden` — preserves container sizes)
5. Screenshot visual-only layer for PPTX backgrounds
6. Place editable text in PPTX at extracted coordinates

## Shared CSS Foundation

Every presentation HTML file should start with this shared CSS:

```css
:root {
  /* Swap these to change the entire deck's look */
  --primary: #1E2761;
  --primary-dark: #0D1333;
  --secondary: #CADCFC;
  --accent: #F96167;
  --bg-light: #F5F5F5;
  --bg-white: #FFFFFF;
  --text-dark: #1A1A1A;
  --text-muted: #666666;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; font-family: sans-serif; }

.slide {
  width: 1920px;
  height: 1080px;
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;
}

/* Text styling — match PptxGenJS output visually */
[data-pptx-text] {
  /* Ensure text elements are positioned and extractable */
  position: relative;
  z-index: 1;
}
```

## Shared CSS Patterns

### Gradient Backgrounds

```css
.gradient-vertical {
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%);
}

.gradient-diagonal {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 60%, var(--accent) 100%);
}

.gradient-radial {
  background: radial-gradient(ellipse at 30% 40%, var(--primary) 0%, var(--primary-dark) 70%);
}

.gradient-rich {
  background: linear-gradient(160deg, var(--primary-dark) 0%, var(--primary) 40%, color-mix(in srgb, var(--accent) 20%, var(--primary)) 100%);
}
```

### Photo Backgrounds with Dark Overlay

```css
.photo-bg {
  background-size: cover;
  background-position: center;
}

.photo-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 0;
}
```

### Decorative Geometric Shapes

```css
.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.12;
  z-index: 0;
}

.accent-bar {
  position: absolute;
  background: var(--accent);
  z-index: 0;
}

.deco-diagonal {
  position: absolute;
  background: var(--accent);
  opacity: 0.3;
  transform: rotate(-3deg);
  z-index: 0;
}
```

### Elevated Cards

```css
.card {
  background: var(--bg-white);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.card-subtle {
  background: var(--bg-white);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.card-glass {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

---

## Layout Templates

### 1. Title Slide (Photo Background)

Photo/gradient background with decorative circles. Text is positioned absolutely over the overlay.

```html
<section class="slide photo-bg" id="slide-1"
         style="background-image: url('title-photo.jpg');">
  <!-- Dark overlay -->
  <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45); z-index: 0;"></div>

  <!-- Decorative circles -->
  <div class="deco-circle" style="width: 600px; height: 600px; top: -150px; right: -100px;"></div>
  <div class="deco-circle" style="width: 400px; height: 400px; bottom: -100px; left: -80px; opacity: 0.08;"></div>

  <!-- Accent bar -->
  <div class="accent-bar" style="left: 154px; top: 250px; width: 200px; height: 6px; z-index: 1;"></div>

  <!-- Text content -->
  <div style="position: absolute; left: 154px; top: 288px; width: 1612px; z-index: 1;">
    <h1 data-pptx-text="s1-title"
        data-font-size="44" data-font-face="Georgia" data-color="FFFFFF"
        data-bold="true" data-align="left"
        style="font-size: 44px; font-family: Georgia, serif; color: #FFFFFF; font-weight: bold;">
      Presentation Title Here
    </h1>
    <p data-pptx-text="s1-subtitle"
       data-font-size="18" data-font-face="Calibri" data-color="EEEEEE"
       data-align="left"
       style="font-size: 18px; font-family: Calibri, sans-serif; color: #EEEEEE; margin-top: 24px;">
      Subtitle or tagline goes here
    </p>
  </div>
</section>
```

**Gradient fallback (no photo):**

```html
<section class="slide gradient-diagonal" id="slide-1">
  <div class="deco-circle" style="width: 700px; height: 700px; top: -200px; right: -150px;"></div>
  <div class="deco-circle" style="width: 500px; height: 500px; bottom: -150px; left: -100px; opacity: 0.08;"></div>
  <div class="accent-bar" style="left: 154px; top: 250px; width: 200px; height: 6px; z-index: 1;"></div>

  <div style="position: absolute; left: 154px; top: 288px; width: 1612px; z-index: 1;">
    <h1 data-pptx-text="s1-title"
        data-font-size="44" data-font-face="Georgia" data-color="FFFFFF"
        data-bold="true" data-align="left"
        style="font-size: 44px; font-family: Georgia, serif; color: #FFFFFF; font-weight: bold;">
      Presentation Title Here
    </h1>
    <p data-pptx-text="s1-subtitle"
       data-font-size="18" data-font-face="Calibri" data-color="EEEEEE"
       data-align="left"
       style="font-size: 18px; font-family: Calibri, sans-serif; color: #EEEEEE; margin-top: 24px;">
      Subtitle or tagline goes here
    </p>
  </div>
</section>
```

---

### 2. Split-Image Slide (Text + Full-Height Photo)

CSS grid splits the slide in half. Photo on one side, text content on the other. Flexbox auto-sizes the content area.

```html
<section class="slide" id="slide-2" style="display: grid; grid-template-columns: 1fr 1fr;">
  <!-- Photo side (left) -->
  <div style="background-image: url('split-photo.jpg'); background-size: cover; background-position: center;"></div>

  <!-- Content side (right) -->
  <div style="position: relative; background: var(--bg-white); display: flex; flex-direction: column; justify-content: center; padding: 96px;">
    <!-- Vertical accent strip at the seam -->
    <div class="accent-bar" style="left: 0; top: 0; width: 6px; height: 100%;"></div>

    <h2 data-pptx-text="s2-title"
        data-font-size="28" data-font-face="Georgia" data-color="1E2761"
        data-bold="true" data-align="left"
        style="font-size: 28px; font-family: Georgia, serif; color: var(--primary); font-weight: bold;">
      Feature Overview
    </h2>

    <p data-pptx-text="s2-body"
       data-font-size="15" data-font-face="Calibri" data-color="333333"
       data-align="left" data-valign="top"
       style="font-size: 15px; font-family: Calibri, sans-serif; color: #333333; margin-top: 24px; line-height: 1.6;">
      Body text goes here. The flexbox container automatically
      centers and sizes around this content, so the text
      always fits within the available space.
    </p>
  </div>
</section>
```

To swap photo to the right side, reverse the grid columns: `grid-template-columns: 1fr 1fr` with photo div second.

---

### 3. Stat Callout Cards

Light background with elevated cards. **Flexbox auto-sizes cards equally** — no hardcoded pixel heights. Cards grow to fit their content.

```html
<section class="slide" id="slide-3" style="background: var(--bg-light);">
  <!-- Decorative background circle -->
  <div class="deco-circle" style="width: 500px; height: 500px; bottom: -100px; left: -150px; background: var(--primary); opacity: 0.06;"></div>

  <!-- Slide title -->
  <h2 data-pptx-text="s3-title"
      data-font-size="28" data-font-face="Georgia" data-color="1E2761"
      data-bold="true" data-align="left"
      style="position: absolute; left: 96px; top: 58px; font-size: 28px; font-family: Georgia, serif; color: var(--primary); font-weight: bold; z-index: 1;">
    Key Metrics
  </h2>

  <!-- Cards container — flexbox handles equal sizing -->
  <div style="position: absolute; left: 96px; right: 96px; top: 180px; bottom: 96px; display: flex; gap: 40px; z-index: 1;">

    <!-- Card 1 -->
    <div class="card" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px;">
      <!-- Icon circle -->
      <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--accent); opacity: 0.85;"></div>

      <span data-pptx-text="s3-stat1-value"
            data-font-size="48" data-font-face="Georgia" data-color="1E2761"
            data-bold="true" data-align="center"
            style="font-size: 48px; font-family: Georgia, serif; color: var(--primary); font-weight: bold; margin-top: 24px; display: block; text-align: center;">
        42%
      </span>
      <span data-pptx-text="s3-stat1-label"
            data-font-size="13" data-font-face="Calibri" data-color="666666"
            data-align="center"
            style="font-size: 13px; font-family: Calibri, sans-serif; color: var(--text-muted); margin-top: 12px; display: block; text-align: center;">
        Conversion Rate
      </span>
    </div>

    <!-- Card 2 -->
    <div class="card" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px;">
      <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--accent); opacity: 0.85;"></div>

      <span data-pptx-text="s3-stat2-value"
            data-font-size="48" data-font-face="Georgia" data-color="1E2761"
            data-bold="true" data-align="center"
            style="font-size: 48px; font-family: Georgia, serif; color: var(--primary); font-weight: bold; margin-top: 24px; display: block; text-align: center;">
        3.2M
      </span>
      <span data-pptx-text="s3-stat2-label"
            data-font-size="13" data-font-face="Calibri" data-color="666666"
            data-align="center"
            style="font-size: 13px; font-family: Calibri, sans-serif; color: var(--text-muted); margin-top: 12px; display: block; text-align: center;">
        Active Users
      </span>
    </div>

    <!-- Card 3 -->
    <div class="card" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px;">
      <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--accent); opacity: 0.85;"></div>

      <span data-pptx-text="s3-stat3-value"
            data-font-size="48" data-font-face="Georgia" data-color="1E2761"
            data-bold="true" data-align="center"
            style="font-size: 48px; font-family: Georgia, serif; color: var(--primary); font-weight: bold; margin-top: 24px; display: block; text-align: center;">
        98%
      </span>
      <span data-pptx-text="s3-stat3-label"
            data-font-size="13" data-font-face="Calibri" data-color="666666"
            data-align="center"
            style="font-size: 13px; font-family: Calibri, sans-serif; color: var(--text-muted); margin-top: 12px; display: block; text-align: center;">
        Customer Satisfaction
      </span>
    </div>
  </div>
</section>
```

**Key:** `flex: 1` on each card ensures equal widths. `display: flex; flex-direction: column; align-items: center; justify-content: center;` on each card centers content vertically. Cards grow in height together because they share the same flex container.

---

### 4. Content Grid (2x2)

Four content blocks in a grid. CSS Grid auto-sizes each cell.

```html
<section class="slide" id="slide-4" style="background: var(--bg-light);">
  <!-- Accent bar at top -->
  <div class="accent-bar" style="left: 0; top: 0; width: 100%; height: 4px;"></div>

  <!-- Slide title -->
  <h2 data-pptx-text="s4-title"
      data-font-size="28" data-font-face="Georgia" data-color="1E2761"
      data-bold="true" data-align="left"
      style="position: absolute; left: 96px; top: 58px; font-size: 28px; font-family: Georgia, serif; color: var(--primary); font-weight: bold; z-index: 1;">
    Our Four Pillars
  </h2>

  <!-- 2x2 grid -->
  <div style="position: absolute; left: 96px; right: 96px; top: 180px; bottom: 96px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 24px; z-index: 1;">

    <!-- Block 1 -->
    <div class="card-subtle" style="padding: 32px;">
      <h3 data-pptx-text="s4-block1-title"
          data-font-size="16" data-font-face="Georgia" data-color="1E2761"
          data-bold="true" data-align="left"
          style="font-size: 16px; font-family: Georgia, serif; color: var(--primary); font-weight: bold;">
        Block Heading 1
      </h3>
      <p data-pptx-text="s4-block1-body"
         data-font-size="13" data-font-face="Calibri" data-color="444444"
         data-align="left" data-valign="top"
         style="font-size: 13px; font-family: Calibri, sans-serif; color: #444; margin-top: 12px; line-height: 1.5;">
        Description text for this block. The grid cell auto-sizes
        to fit this content along with the heading above.
      </p>
    </div>

    <!-- Block 2 -->
    <div class="card-subtle" style="padding: 32px;">
      <h3 data-pptx-text="s4-block2-title"
          data-font-size="16" data-font-face="Georgia" data-color="1E2761"
          data-bold="true" data-align="left"
          style="font-size: 16px; font-family: Georgia, serif; color: var(--primary); font-weight: bold;">
        Block Heading 2
      </h3>
      <p data-pptx-text="s4-block2-body"
         data-font-size="13" data-font-face="Calibri" data-color="444444"
         data-align="left" data-valign="top"
         style="font-size: 13px; font-family: Calibri, sans-serif; color: #444; margin-top: 12px; line-height: 1.5;">
        Description text for block two.
      </p>
    </div>

    <!-- Block 3 -->
    <div class="card-subtle" style="padding: 32px;">
      <h3 data-pptx-text="s4-block3-title"
          data-font-size="16" data-font-face="Georgia" data-color="1E2761"
          data-bold="true" data-align="left"
          style="font-size: 16px; font-family: Georgia, serif; color: var(--primary); font-weight: bold;">
        Block Heading 3
      </h3>
      <p data-pptx-text="s4-block3-body"
         data-font-size="13" data-font-face="Calibri" data-color="444444"
         data-align="left" data-valign="top"
         style="font-size: 13px; font-family: Calibri, sans-serif; color: #444; margin-top: 12px; line-height: 1.5;">
        Description text for block three.
      </p>
    </div>

    <!-- Block 4 -->
    <div class="card-subtle" style="padding: 32px;">
      <h3 data-pptx-text="s4-block4-title"
          data-font-size="16" data-font-face="Georgia" data-color="1E2761"
          data-bold="true" data-align="left"
          style="font-size: 16px; font-family: Georgia, serif; color: var(--primary); font-weight: bold;">
        Block Heading 4
      </h3>
      <p data-pptx-text="s4-block4-body"
         data-font-size="13" data-font-face="Calibri" data-color="444444"
         data-align="left" data-valign="top"
         style="font-size: 13px; font-family: Calibri, sans-serif; color: #444; margin-top: 12px; line-height: 1.5;">
        Description text for block four.
      </p>
    </div>
  </div>
</section>
```

---

### 5. Icon + Text Rows

Rows of icon + label + description. Each row auto-sizes to its content.

```html
<section class="slide" id="slide-5" style="background: var(--bg-white);">
  <!-- Decorative circle -->
  <div class="deco-circle" style="width: 400px; height: 400px; bottom: -120px; right: -120px; background: var(--secondary); opacity: 0.3;"></div>
  <!-- Accent line at top -->
  <div class="accent-bar" style="left: 0; top: 0; width: 100%; height: 4px;"></div>

  <!-- Title -->
  <h2 data-pptx-text="s5-title"
      data-font-size="28" data-font-face="Georgia" data-color="1E2761"
      data-bold="true" data-align="left"
      style="position: absolute; left: 96px; top: 58px; font-size: 28px; font-family: Georgia, serif; color: var(--primary); font-weight: bold; z-index: 1;">
    Key Features
  </h2>

  <!-- Rows container -->
  <div style="position: absolute; left: 96px; right: 96px; top: 180px; display: flex; flex-direction: column; gap: 24px; z-index: 1;">

    <!-- Row 1 -->
    <div style="display: flex; align-items: center; gap: 24px;">
      <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--primary); flex-shrink: 0;"></div>
      <div>
        <span data-pptx-text="s5-row1-label"
              data-font-size="16" data-font-face="Calibri" data-color="1E2761"
              data-bold="true" data-align="left"
              style="font-size: 16px; font-family: Calibri, sans-serif; color: var(--primary); font-weight: bold; display: block;">
          Feature Name
        </span>
        <span data-pptx-text="s5-row1-desc"
              data-font-size="13" data-font-face="Calibri" data-color="555555"
              data-align="left"
              style="font-size: 13px; font-family: Calibri, sans-serif; color: #555; display: block; margin-top: 4px;">
          Brief description of this feature and what it does.
        </span>
      </div>
    </div>

    <!-- Row 2 -->
    <div style="display: flex; align-items: center; gap: 24px;">
      <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--primary); flex-shrink: 0;"></div>
      <div>
        <span data-pptx-text="s5-row2-label"
              data-font-size="16" data-font-face="Calibri" data-color="1E2761"
              data-bold="true" data-align="left"
              style="font-size: 16px; font-family: Calibri, sans-serif; color: var(--primary); font-weight: bold; display: block;">
          Second Feature
        </span>
        <span data-pptx-text="s5-row2-desc"
              data-font-size="13" data-font-face="Calibri" data-color="555555"
              data-align="left"
              style="font-size: 13px; font-family: Calibri, sans-serif; color: #555; display: block; margin-top: 4px;">
          Description of the second feature.
        </span>
      </div>
    </div>

    <!-- Row 3 -->
    <div style="display: flex; align-items: center; gap: 24px;">
      <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--primary); flex-shrink: 0;"></div>
      <div>
        <span data-pptx-text="s5-row3-label"
              data-font-size="16" data-font-face="Calibri" data-color="1E2761"
              data-bold="true" data-align="left"
              style="font-size: 16px; font-family: Calibri, sans-serif; color: var(--primary); font-weight: bold; display: block;">
          Third Feature
        </span>
        <span data-pptx-text="s5-row3-desc"
              data-font-size="13" data-font-face="Calibri" data-color="555555"
              data-align="left"
              style="font-size: 13px; font-family: Calibri, sans-serif; color: #555; display: block; margin-top: 4px;">
          Description of the third feature.
        </span>
      </div>
    </div>
  </div>
</section>
```

---

### 6. Quote / Testimonial (Photo Background)

Photo background with dark overlay and a large quote.

```html
<section class="slide photo-bg" id="slide-6"
         style="background-image: url('quote-photo.jpg');">
  <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.40); z-index: 0;"></div>

  <!-- Vertical accent bar -->
  <div class="accent-bar" style="left: 230px; top: 250px; width: 6px; height: 480px; z-index: 1;"></div>

  <!-- Large decorative quote mark -->
  <div style="position: absolute; left: 58px; top: 58px; font-size: 200px; font-family: Georgia, serif; color: rgba(255,255,255,0.15); line-height: 1; z-index: 0;">&ldquo;</div>

  <!-- Quote text -->
  <div style="position: absolute; left: 307px; top: 288px; width: 1382px; z-index: 1;">
    <p data-pptx-text="s6-quote"
       data-font-size="22" data-font-face="Georgia" data-color="FFFFFF"
       data-italic="true" data-align="left" data-valign="middle"
       style="font-size: 22px; font-family: Georgia, serif; color: #FFFFFF; font-style: italic; line-height: 1.6;">
      "The best way to predict the future is to invent it."
    </p>

    <div style="margin-top: 48px;">
      <span data-pptx-text="s6-author"
            data-font-size="16" data-font-face="Calibri" data-color="FFFFFF"
            data-bold="true" data-align="left"
            style="font-size: 16px; font-family: Calibri, sans-serif; color: #FFFFFF; font-weight: bold; display: block;">
        Alan Kay
      </span>
      <span data-pptx-text="s6-role"
            data-font-size="13" data-font-face="Calibri" data-color="DDDDDD"
            data-align="left"
            style="font-size: 13px; font-family: Calibri, sans-serif; color: #DDDDDD; display: block; margin-top: 4px;">
        Computer Scientist
      </span>
    </div>
  </div>
</section>
```

---

### 7. Content Slide with Photo Background + Glass Cards

Full-bleed photo with dark overlay and glass-morphism cards containing content. Great for "why" or "value proposition" slides.

```html
<section class="slide photo-bg" id="slide-7"
         style="background-image: url('content-photo.jpg');">
  <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.50); z-index: 0;"></div>

  <!-- Title -->
  <h2 data-pptx-text="s7-title"
      data-font-size="36" data-font-face="Georgia" data-color="FFFFFF"
      data-bold="true" data-align="left"
      style="position: absolute; left: 96px; top: 58px; font-size: 36px; font-family: Georgia, serif; color: #FFFFFF; font-weight: bold; z-index: 1;">
    Why AI Training Now?
  </h2>

  <p data-pptx-text="s7-subtitle"
     data-font-size="16" data-font-face="Calibri" data-color="EEEEEE"
     data-align="left"
     style="position: absolute; left: 96px; top: 130px; width: 1200px; font-size: 16px; font-family: Calibri, sans-serif; color: #EEEEEE; z-index: 1; line-height: 1.5;">
    The AI landscape is evolving faster than ever. Teams that invest in practical AI skills today will lead tomorrow.
  </p>

  <!-- Glass cards — flexbox for equal sizing -->
  <div style="position: absolute; left: 96px; right: 96px; top: 280px; bottom: 96px; display: flex; gap: 32px; z-index: 1;">

    <div class="card-glass" style="flex: 1; padding: 32px; display: flex; flex-direction: column;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #4FC3F7, #1E88E5);"></div>
      <h3 data-pptx-text="s7-card1-title"
          data-font-size="18" data-font-face="Georgia" data-color="FFFFFF"
          data-bold="true" data-align="left"
          style="font-size: 18px; font-family: Georgia, serif; color: #FFFFFF; font-weight: bold; margin-top: 16px;">
        Industry Transformation
      </h3>
      <p data-pptx-text="s7-card1-body"
         data-font-size="13" data-font-face="Calibri" data-color="DDDDDD"
         data-align="left" data-valign="top"
         style="font-size: 13px; font-family: Calibri, sans-serif; color: #DDDDDD; margin-top: 12px; line-height: 1.5;">
        AI is reshaping every sector. Companies without AI capabilities risk falling behind competitors who automate and innovate faster.
      </p>
    </div>

    <div class="card-glass" style="flex: 1; padding: 32px; display: flex; flex-direction: column;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #B39DDB, #7E57C2);"></div>
      <h3 data-pptx-text="s7-card2-title"
          data-font-size="18" data-font-face="Georgia" data-color="FFFFFF"
          data-bold="true" data-align="left"
          style="font-size: 18px; font-family: Georgia, serif; color: #FFFFFF; font-weight: bold; margin-top: 16px;">
        Competitive Advantage
      </h3>
      <p data-pptx-text="s7-card2-body"
         data-font-size="13" data-font-face="Calibri" data-color="DDDDDD"
         data-align="left" data-valign="top"
         style="font-size: 13px; font-family: Calibri, sans-serif; color: #DDDDDD; margin-top: 12px; line-height: 1.5;">
        Early adopters gain significant edge. Teams trained in AI agents and automation deliver 3-5x more value from AI investments.
      </p>
    </div>

    <div class="card-glass" style="flex: 1; padding: 32px; display: flex; flex-direction: column;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #4DB6AC, #00897B);"></div>
      <h3 data-pptx-text="s7-card3-title"
          data-font-size="18" data-font-face="Georgia" data-color="FFFFFF"
          data-bold="true" data-align="left"
          style="font-size: 18px; font-family: Georgia, serif; color: #FFFFFF; font-weight: bold; margin-top: 16px;">
        Practical > Theoretical
      </h3>
      <p data-pptx-text="s7-card3-body"
         data-font-size="13" data-font-face="Calibri" data-color="DDDDDD"
         data-align="left" data-valign="top"
         style="font-size: 13px; font-family: Calibri, sans-serif; color: #DDDDDD; margin-top: 12px; line-height: 1.5;">
        Real-world skills with production tools and patterns. Your team builds actual agents and workflows, not just reads about them.
      </p>
    </div>
  </div>
</section>
```

---

### 8. Closing Slide (Gradient + CTA)

Gradient background with decorative circles and centered call-to-action.

```html
<section class="slide gradient-rich" id="slide-8">
  <div class="deco-circle" style="width: 800px; height: 800px; top: -250px; left: -250px; opacity: 0.1;"></div>
  <div class="deco-circle" style="width: 600px; height: 600px; bottom: -150px; right: -150px; opacity: 0.08;"></div>

  <!-- Centered accent bar -->
  <div class="accent-bar" style="left: 50%; transform: translateX(-50%); top: 307px; width: 200px; height: 5px; z-index: 1;"></div>

  <!-- Centered text -->
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1;">
    <h2 data-pptx-text="s8-headline"
        data-font-size="36" data-font-face="Georgia" data-color="FFFFFF"
        data-bold="true" data-align="center"
        style="font-size: 36px; font-family: Georgia, serif; color: #FFFFFF; font-weight: bold; text-align: center;">
      Ready to Get Started?
    </h2>
    <p data-pptx-text="s8-subtext"
       data-font-size="16" data-font-face="Calibri" data-color="EEEEEE"
       data-align="center"
       style="font-size: 16px; font-family: Calibri, sans-serif; color: #EEEEEE; text-align: center; margin-top: 24px;">
      Contact us to schedule a consultation
    </p>
    <p data-pptx-text="s8-contact"
       data-font-size="14" data-font-face="Calibri" data-color="DDDDDD"
       data-align="center"
       style="font-size: 14px; font-family: Calibri, sans-serif; color: #DDDDDD; text-align: center; margin-top: 16px;">
      hello@company.com | www.company.com
    </p>
  </div>
</section>
```

---

## Coordinate Conversion Reference

The extraction script (Step 6a in SKILL.md) handles coordinate conversion automatically. For manual reference:

| Conversion | Formula |
|---|---|
| HTML pixels → PptxGenJS inches | `px / 192` |
| PptxGenJS inches → HTML pixels | `inches * 192` |

**Conversion factor: 1920px / 10" = 192px per inch**

---

## Playwright Workflow

### Preview (fast iteration loop)

```
1. mcp__docs-playwright__browser_resize → width: 1920, height: 1080, deviceScaleFactor: 1
2. mcp__docs-playwright__browser_navigate → file:///absolute/path/to/slides.html
3. mcp__docs-playwright__browser_take_screenshot
```

Now you see **complete slides with text**. Iterate: edit HTML/CSS → reload → screenshot → inspect → repeat.

### Extract + Hide + Screenshot Pipeline

After preview is satisfactory:

```
1. mcp__docs-playwright__browser_evaluate → [extraction script from SKILL.md Step 6a]
   → save result as slide-metadata.json

2. mcp__docs-playwright__browser_evaluate → [hide script from SKILL.md Step 6b]

3. For each slide:
   a. mcp__docs-playwright__browser_evaluate → document.querySelector('#slide-N').scrollIntoView()
   b. mcp__docs-playwright__browser_take_screenshot → save as slide-N-bg.png
```

The saved screenshots + metadata become the inputs for the PptxGenJS generation script.

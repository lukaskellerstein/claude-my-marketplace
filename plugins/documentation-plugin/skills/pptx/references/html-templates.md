# HTML/CSS Visual Layer Templates

Templates for the visual/decorative layer of each slide layout. These are screenshotted at 1920×1080 with Playwright and used as PPTX slide backgrounds. **No text goes in the HTML** — all editable text is added with PptxGenJS on top.

## Shared CSS Foundation

Every presentation HTML file should start with this shared CSS. Use CSS custom properties so the whole deck's palette can be changed by editing a few variables.

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
```

## Shared CSS Patterns

### Gradient Backgrounds

```css
/* Linear gradient (top to bottom) */
.gradient-vertical {
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%);
}

/* Diagonal gradient */
.gradient-diagonal {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 60%, var(--accent) 100%);
}

/* Radial gradient (spotlight effect) */
.gradient-radial {
  background: radial-gradient(ellipse at 30% 40%, var(--primary) 0%, var(--primary-dark) 70%);
}

/* Multi-stop gradient */
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
}
```

### Decorative Geometric Shapes

```css
/* Large transparent circle (partially off-slide) */
.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.12;
}

/* Accent bar */
.accent-bar {
  position: absolute;
  background: var(--accent);
}

/* Diagonal strip */
.deco-diagonal {
  position: absolute;
  background: var(--accent);
  opacity: 0.3;
  transform: rotate(-3deg);
}

/* Dot pattern */
.dot-pattern {
  position: absolute;
  display: grid;
  grid-template-columns: repeat(5, 12px);
  gap: 16px;
}
.dot-pattern span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.4;
}
```

### Elevated Cards

```css
.card {
  background: var(--bg-white);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  position: absolute;
}

.card-subtle {
  background: var(--bg-white);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  position: absolute;
}

/* Glass-morphism card */
.card-glass {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: absolute;
}
```

### Color Block Sections

```css
/* Top band (dark header area) */
.top-band {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 240px;
  background: var(--primary);
}

/* Side panel */
.side-panel {
  position: absolute;
  top: 0; bottom: 0;
  width: 960px;
  background: var(--primary);
}
```

---

## Layout Templates

### 1. Title Slide (Photo Background)

CSS gradient background + decorative circles + photo overlay. The Playwright screenshot captures the gradient/shapes/overlay. PptxGenJS adds the title and subtitle text on top.

```html
<section class="slide" id="slide-title" style="background-image: url('title-photo.jpg'); background-size: cover; background-position: center;">
  <!-- Dark overlay -->
  <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45);"></div>

  <!-- Decorative circle (top-right, partially off-slide) -->
  <div class="deco-circle" style="width: 600px; height: 600px; top: -150px; right: -100px;"></div>

  <!-- Decorative circle (bottom-left) -->
  <div class="deco-circle" style="width: 400px; height: 400px; bottom: -100px; left: -80px; opacity: 0.08;"></div>

  <!-- Accent bar (where title will go) -->
  <div class="accent-bar" style="left: 154px; top: 250px; width: 200px; height: 6px;"></div>
</section>
```

**Fallback (no photo) — gradient version:**

```html
<section class="slide gradient-diagonal" id="slide-title">
  <div class="deco-circle" style="width: 700px; height: 700px; top: -200px; right: -150px;"></div>
  <div class="deco-circle" style="width: 500px; height: 500px; bottom: -150px; left: -100px; opacity: 0.08;"></div>
  <div class="accent-bar" style="left: 154px; top: 250px; width: 200px; height: 6px;"></div>
</section>
```

**PptxGenJS text on top** (from layouts.md Title Slide):
```javascript
slide.addText(title, { x: 0.8, y: 1.5, w: 8.4, h: 1.5, fontSize: 44, fontFace: "Georgia", color: "FFFFFF", bold: true, align: "left" });
slide.addText(subtitle, { x: 0.8, y: 3.2, w: 8.4, h: 0.8, fontSize: 18, fontFace: "Calibri", color: "EEEEEE", align: "left" });
```

---

### 2. Split-Image Slide

CSS grid with photo on one side, styled content area on the other. The HTML handles the photo placement, accent strip, and content area background.

```html
<section class="slide" id="slide-split" style="display: grid; grid-template-columns: 1fr 1fr;">
  <!-- Photo side (left) -->
  <div style="background-image: url('split-photo.jpg'); background-size: cover; background-position: center;"></div>

  <!-- Content side (right) with accent strip -->
  <div style="position: relative; background: var(--bg-white);">
    <!-- Vertical accent strip at the seam -->
    <div class="accent-bar" style="left: 0; top: 0; width: 6px; height: 100%;"></div>
  </div>
</section>
```

**PptxGenJS text on top** (from layouts.md Split-Image):
```javascript
slide.addText(title, { x: 5.4, y: 0.5, w: 4.2, h: 0.8, fontSize: 28, fontFace: "Georgia", color: primary, bold: true });
slide.addText(bodyText, { x: 5.4, y: 1.5, w: 4.2, h: 3.5, fontSize: 15, fontFace: "Calibri", color: "333333", valign: "top" });
```

---

### 3. Icon + Text Rows

Light background with subtle decorative elements. The HTML provides the background treatment; PptxGenJS handles icons, text rows, and title.

```html
<section class="slide" id="slide-icon-rows" style="background: var(--bg-white);">
  <!-- Subtle decorative circle in corner -->
  <div class="deco-circle" style="width: 400px; height: 400px; bottom: -120px; right: -120px; background: var(--secondary); opacity: 0.3;"></div>

  <!-- Thin accent line at top -->
  <div class="accent-bar" style="left: 0; top: 0; width: 100%; height: 4px;"></div>
</section>
```

**Note:** For simple icon-row slides, PptxGenJS-only may be sufficient. Use the HTML layer when you want gradient accents, decorative shapes, or a more complex background.

**PptxGenJS text on top** — uses the Icon + Text Rows layout from layouts.md (unchanged).

---

### 4. Stat Callout Cards

Light background with elevated cards. The HTML creates the card shapes with proper `box-shadow` and `border-radius` that PptxGenJS can't produce well. The cards are placed at the exact coordinates matching the PptxGenJS text positions.

```html
<section class="slide" id="slide-stats" style="background: var(--bg-light);">
  <!-- Decorative background circle -->
  <div class="deco-circle" style="width: 500px; height: 500px; bottom: -100px; left: -150px; background: var(--primary); opacity: 0.06;"></div>

  <!-- Stat cards (positions match PptxGenJS text coordinates) -->
  <!-- For 3 cards: each ~2.73" wide = ~262px at 192dpi, but at 1920px/10" = 192px/inch -->
  <!-- Card 1 -->
  <div class="card" style="left: 96px; top: 269px; width: 524px; height: 576px;">
    <!-- Colored circle at top of card -->
    <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--accent); opacity: 0.85; margin: 50px auto 0;"></div>
  </div>

  <!-- Card 2 -->
  <div class="card" style="left: 698px; top: 269px; width: 524px; height: 576px;">
    <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--accent); opacity: 0.85; margin: 50px auto 0;"></div>
  </div>

  <!-- Card 3 -->
  <div class="card" style="left: 1300px; top: 269px; width: 524px; height: 576px;">
    <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--accent); opacity: 0.85; margin: 50px auto 0;"></div>
  </div>
</section>
```

**Coordinate conversion:** 1920px = 10 inches → 192px per inch. So `x: 0.5"` = `96px`, `y: 1.4"` = `269px`, etc.

**PptxGenJS text on top** (from layouts.md Stat Cards):
```javascript
// Big number
slide.addText(stats[i].value, { x, y: 2.5, w: cardW, h: 1.0, fontSize: 48, fontFace: "Georgia", color: primary, bold: true, align: "center", valign: "middle" });
// Label
slide.addText(stats[i].label, { x: x + 0.2, y: 3.5, w: cardW - 0.4, h: 0.7, fontSize: 13, fontFace: "Calibri", color: "666666", align: "center", valign: "top" });
```

---

### 5. Content Grid (2×2)

Four content blocks in a grid with elevated card styling.

```html
<section class="slide" id="slide-grid" style="background: var(--bg-light);">
  <!-- Four elevated cards in a 2×2 grid -->
  <!-- Positions: (0.5, 1.3), (5.1, 1.3), (0.5, 3.4), (5.1, 3.4) in inches -->
  <div class="card-subtle" style="left: 96px; top: 250px; width: 826px; height: 346px;"></div>
  <div class="card-subtle" style="left: 979px; top: 250px; width: 826px; height: 346px;"></div>
  <div class="card-subtle" style="left: 96px; top: 653px; width: 826px; height: 346px;"></div>
  <div class="card-subtle" style="left: 979px; top: 653px; width: 826px; height: 346px;"></div>

  <!-- Accent bar at top -->
  <div class="accent-bar" style="left: 0; top: 0; width: 100%; height: 4px;"></div>
</section>
```

**PptxGenJS text on top** — uses the Content Grid layout from layouts.md (title + block headings + block body text, unchanged).

---

### 6. Timeline / Process Flow

Horizontal connected steps. The HTML creates the connecting line, step circles, and any gradient background.

```html
<section class="slide" id="slide-timeline" style="background: var(--bg-white);">
  <!-- Connecting line -->
  <div style="position: absolute; top: 536px; left: 230px; width: 1460px; height: 3px; background: #CCCCCC;"></div>

  <!-- Step circles (5 steps example) -->
  <div style="position: absolute; left: 182px; top: 488px; width: 96px; height: 96px; border-radius: 50%; background: var(--primary);"></div>
  <div style="position: absolute; left: 547px; top: 488px; width: 96px; height: 96px; border-radius: 50%; background: var(--primary);"></div>
  <div style="position: absolute; left: 912px; top: 488px; width: 96px; height: 96px; border-radius: 50%; background: var(--primary);"></div>
  <div style="position: absolute; left: 1277px; top: 488px; width: 96px; height: 96px; border-radius: 50%; background: var(--primary);"></div>
  <div style="position: absolute; left: 1642px; top: 488px; width: 96px; height: 96px; border-radius: 50%; background: var(--primary);"></div>

  <!-- Decorative accent -->
  <div class="deco-circle" style="width: 300px; height: 300px; top: -80px; right: -80px; background: var(--secondary); opacity: 0.2;"></div>
</section>
```

**Note:** For simple timelines, PptxGenJS-only is often sufficient. Use the HTML layer when you want gradient backgrounds or complex decorative elements around the timeline.

**PptxGenJS text on top** — uses the Timeline layout from layouts.md (step numbers + labels, unchanged).

---

### 7. Quote / Testimonial (Photo Background)

Photo background with CSS `backdrop-filter` overlay for a frosted-glass effect.

```html
<section class="slide" id="slide-quote" style="background-image: url('quote-photo.jpg'); background-size: cover; background-position: center;">
  <!-- Dark overlay with blur -->
  <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.40);"></div>

  <!-- Vertical accent bar (where quote will be) -->
  <div class="accent-bar" style="left: 230px; top: 250px; width: 6px; height: 480px;"></div>

  <!-- Large decorative quote mark -->
  <div style="position: absolute; left: 58px; top: 58px; font-size: 200px; font-family: Georgia, serif; color: rgba(255,255,255,0.15); line-height: 1;">&ldquo;</div>
</section>
```

**PptxGenJS text on top** (from layouts.md Quote Slide):
```javascript
slide.addText(quote, { x: 1.6, y: 1.5, w: 7.2, h: 2.5, fontSize: 22, fontFace: "Georgia", color: "FFFFFF", italic: true, align: "left", valign: "middle" });
slide.addText([
  { text: author, options: { bold: true, fontSize: 16, color: "FFFFFF", breakLine: true } },
  { text: role, options: { fontSize: 13, color: "DDDDDD" } }
], { x: 1.6, y: 4.2, w: 7.2, h: 0.8, align: "left" });
```

---

### 8. Closing Slide (Gradient + Decorative Elements)

Gradient background with decorative circles, mirroring the title slide for visual bookending.

```html
<section class="slide gradient-rich" id="slide-closing">
  <!-- Decorative circles -->
  <div class="deco-circle" style="width: 800px; height: 800px; top: -250px; left: -250px; opacity: 0.1;"></div>
  <div class="deco-circle" style="width: 600px; height: 600px; bottom: -150px; right: -150px; opacity: 0.08;"></div>

  <!-- Centered accent bar -->
  <div class="accent-bar" style="left: 50%; transform: translateX(-50%); top: 307px; width: 200px; height: 5px;"></div>
</section>
```

**Photo background variant:**

```html
<section class="slide" id="slide-closing" style="background-image: url('closing-photo.jpg'); background-size: cover; background-position: center;">
  <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.50);"></div>
  <div class="deco-circle" style="width: 800px; height: 800px; top: -250px; left: -250px; opacity: 0.1;"></div>
  <div class="deco-circle" style="width: 600px; height: 600px; bottom: -150px; right: -150px; opacity: 0.08;"></div>
  <div class="accent-bar" style="left: 50%; transform: translateX(-50%); top: 307px; width: 200px; height: 5px;"></div>
</section>
```

**PptxGenJS text on top** (from layouts.md Closing Slide):
```javascript
slide.addText(headline, { x: 1, y: 1.8, w: 8, h: 1, fontSize: 36, fontFace: "Georgia", color: "FFFFFF", bold: true, align: "center", valign: "middle" });
slide.addText(subtext, { x: 1, y: 3.0, w: 8, h: 0.6, fontSize: 16, fontFace: "Calibri", color: "EEEEEE", align: "center" });
slide.addText(contactInfo, { x: 1, y: 4.0, w: 8, h: 0.6, fontSize: 14, fontFace: "Calibri", color: "DDDDDD", align: "center" });
```

---

## Coordinate Conversion Reference

To position HTML elements to match PptxGenJS text coordinates:

| PptxGenJS (inches) | HTML (pixels at 1920×1080) | Formula |
|---|---|---|
| x: 0.5 | left: 96px | `x * 192` |
| y: 1.3 | top: 250px | `y * 192` |
| w: 4.3 | width: 826px | `w * 192` |
| h: 3.0 | height: 576px | `h * 192` |

**Conversion factor: 1920px / 10" = 192px per inch**

This ensures visual elements in the HTML (cards, shapes, accent lines) align precisely with the PptxGenJS text that will be placed on top.

---

## Playwright Workflow

### Preview (fast iteration loop)

```
1. mcp__docs-playwright__browser_resize → width: 1920, height: 1080, deviceScaleFactor: 1
2. mcp__docs-playwright__browser_navigate → file:///absolute/path/to/slides.html
3. mcp__docs-playwright__browser_take_screenshot
```

Iterate: edit HTML/CSS → reload → screenshot → inspect → repeat.

### Final screenshots for PPTX backgrounds

For production screenshots, screenshot each slide section individually at exactly 1920×1080. Either:

**Option A: Separate HTML files per slide** — simplest approach, one file per slide section.

**Option B: Single HTML file** — use Playwright's `browser_evaluate` to isolate each section:
```
1. mcp__docs-playwright__browser_resize → width: 1920, height: 1080, deviceScaleFactor: 1
2. mcp__docs-playwright__browser_navigate → file:///path/to/slides.html
3. For each slide:
   a. mcp__docs-playwright__browser_evaluate → document.querySelector('#slide-N').scrollIntoView()
   b. mcp__docs-playwright__browser_take_screenshot
```

The saved screenshots become the `slide.background = { data: base64png }` in the PptxGenJS script.

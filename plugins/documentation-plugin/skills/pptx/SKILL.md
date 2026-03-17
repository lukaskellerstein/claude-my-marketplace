---
name: pptx-presentations
description: "This skill should be activated when the user asks to make a presentation, slide deck, pitch deck, or anything involving .pptx output. Also triggers when the user says 'make me slides', 'create a deck', 'presentation about X', or mentions PowerPoint. Creates polished PowerPoint (.pptx) presentations from scratch using a hybrid HTML/CSS + PptxGenJS workflow: complete slides are designed in HTML/CSS with real text, then text positions are extracted, text is hidden, backgrounds are screenshotted, and PptxGenJS adds editable text at the extracted coordinates. Activates even for simple 'make a quick 3-slide deck' requests — the skill ensures quality output every time."
---

# PPTX Presentation Skill

Create professional PowerPoint presentations using a hybrid workflow: **HTML/CSS for complete slide design** (gradients, shadows, decorative elements, layout with real text) + **PptxGenJS for editable text** (coordinates extracted from the HTML layout).

## Why Hybrid?

PptxGenJS has severe visual limitations — no gradients, no CSS filters, limited typography, manual x/y positioning only. HTML/CSS can produce Canva-level designs but can't create editable PPTX files. The hybrid approach:

1. Design each slide **completely** in HTML/CSS — including all text content, using flexbox/grid for layout
2. Extract text element positions from the DOM via Playwright
3. Hide text elements (`visibility: hidden` — preserves container sizing)
4. Screenshot the text-free visual layer at 1920x1080
5. Use screenshots as full-bleed PPTX slide backgrounds
6. Add **editable text** on top with PptxGenJS at the extracted coordinates

This solves the core problem of the old approach: containers (cards, columns) are sized **with** the actual text content, so layouts always fit.

## Workflow Overview

1. **Structure** — Define narrative arc and slide sequence
2. **Content** — Fill in text, data, images per slide
3. **Design complete slides in HTML/CSS** — Write slides with real text, using `data-pptx-*` attributes
4. **Preview with Playwright** — See the real slides, iterate on visuals
5. **Extract, hide, screenshot, generate PPTX** — Automated pipeline
6. **QA** — LibreOffice conversion + structural check

## Step 1: Setup

```bash
# Install dependencies (first time only)
npm install -g pptxgenjs react react-dom react-icons sharp
pip install "markitdown[pptx]" --break-system-packages

# Verify LibreOffice is available
which soffice || echo "LibreOffice not installed — install with: sudo apt install libreoffice"

# Verify pdftoppm is available
which pdftoppm || echo "pdftoppm not installed — install with: sudo apt install poppler-utils"
```

If LibreOffice or poppler-utils are not installed, tell the user they are needed for visual QA and ask if they'd like to install them. If the user declines or installation is not possible, skip visual QA and rely on structural checks (Step 6).

## Step 2: Structure

Define the high-level narrative arc. What story does this deck tell? Output: an ordered list of slide titles and their purpose.

Example:
1. Slide 1: Title — hook the audience
2. Slide 2: Problem — establish the pain point
3. Slide 3: Solution — introduce our approach
4. Slide 4: Key Metrics — prove traction
5. ...

This step is about the **skeleton** — no content details yet.

## Step 3: Content

For each slide in the structure, define the specific information:

1. **Text content** — title, subtitle, bullet points, quotes, data points
2. **Layout type** — pick from the layout catalog (see [references/layouts.md](references/layouts.md))
3. **Image plan** — which slides need images and at what aspect ratio. **Prefer sourcing real photos from Unsplash/Pexels/Pixabay first** (use the `image-sourcing` skill); only generate images via AI when no suitable stock photo can be found
4. **Color palette** — pick a palette matching the topic (see [references/design.md](references/design.md))
5. **Font pairing** — pick a header + body font combo (see [references/design.md](references/design.md))

Vary slide layouts. Monotonous decks with the same layout repeated are the most common failure. Use at least 3 different layout types across a deck.

**Gather all planned images BEFORE writing any code.** First, try to source real photos from Unsplash/Pexels/Pixabay using the `image-sourcing` skill. Only fall back to AI image generation when no suitable stock photo exists for the topic. This avoids mid-script interruptions and ensures images are ready when needed.

### Design Quality Target

Aim for Canva-level presentation quality. Read the Premium Design Techniques section in [references/design.md](references/design.md). Key requirements:
- At least 3 slides with full-bleed photo backgrounds + dark overlay
- CSS gradient backgrounds on non-photo slides
- Elevated rounded cards with soft shadows instead of flat rectangles
- Decorative geometric shapes for visual interest
- Never more than 2 consecutive plain-background slides
- Topic-specific images — prefer real photos from Unsplash/Pexels/Pixabay; only AI-generate when no suitable stock photo exists

## Step 4: Design Complete Slides in HTML/CSS (with text)

Write a single HTML file with one `<section class="slide">` per slide, each 1920x1080px. **Include all text content** in the HTML — the layout engine sizes containers around real text.

See [references/html-templates.md](references/html-templates.md) for templates per layout type.

### The `data-pptx-*` Attribute System

Every text element that should become editable in the PPTX gets `data-pptx-*` attributes:

```html
<h2 data-pptx-text="slide3-title"
    data-font-size="28"
    data-font-face="Georgia"
    data-color="1E2761"
    data-bold="true"
    data-align="left">
  Why AI Training Now?
</h2>
```

Required attributes:
- `data-pptx-text` — unique ID for this text element (used for extraction)

Optional styling attributes (used in PptxGenJS):
- `data-font-size` — font size in points
- `data-font-face` — font family name
- `data-color` — hex color WITHOUT `#` prefix (e.g., `"FFFFFF"`)
- `data-bold` — `"true"` or `"false"`
- `data-italic` — `"true"` or `"false"`
- `data-align` — `"left"`, `"center"`, or `"right"`
- `data-valign` — `"top"`, `"middle"`, or `"bottom"`
- `data-shrink` — `"true"` to enable auto-shrink (safety net for overflow)

### HTML Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    :root {
      --primary: #1E2761;
      --secondary: #CADCFC;
      --accent: #F96167;
      --bg-light: #F5F5F5;
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
  </style>
</head>
<body>
  <section class="slide" id="slide-1">
    <!-- Full slide content: visuals + text with data-pptx-* attributes -->
  </section>

  <section class="slide" id="slide-2">
    <!-- ... -->
  </section>
</body>
</html>
```

### Key Rules

- **Text IS included in the HTML** — this is what makes containers size correctly
- Every text element gets `data-pptx-text` + styling attributes
- Use **CSS flexbox/grid** to auto-size containers around text — avoid hardcoded pixel heights for content areas
- Use **CSS custom properties** for the color palette
- Each `<section class="slide">` is exactly 1920x1080px
- Style text in CSS to visually match the PptxGenJS output (same font, size, color)
- Load images via `<img>` tags or `background-image` CSS

### When to Use HTML Visual Layer vs PptxGenJS-Only

| Slide Type | Use HTML Visual Layer | Stay PptxGenJS-Only |
|---|---|---|
| Gradient backgrounds | Yes | |
| Decorative shapes (circles, diagonal strips) | Yes | |
| Photo + dark overlay | Yes | |
| Complex cards with shadows | Yes | |
| Dot patterns, accent lines | Yes | |
| Blur/backdrop-filter effects | Yes | |
| Chart slides | | Yes — native charts |
| Simple solid-color background | | Yes — just `slide.background` |
| Table slides | | Yes — native tables |

## Step 5: Preview with Playwright

Use the Playwright MCP to preview the HTML file. This is the fast iteration loop — you see the **complete slides** with real text.

### Playwright Commands for Slide Preview

```
1. mcp__docs-playwright__browser_resize → width: 1920, height: 1080, deviceScaleFactor: 1
2. mcp__docs-playwright__browser_navigate → file:///absolute/path/to/slides.html
3. mcp__docs-playwright__browser_take_screenshot
```

**Important settings:**
- `deviceScaleFactor: 1` — the HTML is already at 1920x1080, no scaling needed
- `width: 1920, height: 1080` — viewport matches slide dimensions

Visually inspect each slide. Look for:
- Text fits within its containers (cards, columns)
- Card heights adapt to content — no overflow or excessive whitespace
- Gradient colors and direction look good
- Decorative shapes are positioned correctly
- Photo overlays have correct opacity
- Overall visual hierarchy is clear

Iterate on HTML/CSS until slides look professional. This loop is fast — edit HTML, reload, screenshot.

## Step 6: Extract, Hide, Screenshot, Generate PPTX

This is the automated pipeline that turns the HTML presentation into an editable PPTX.

### 6a: Extract Text Positions from the DOM

Use Playwright's `browser_evaluate` to extract bounding rectangles for every `[data-pptx-text]` element:

```javascript
// Run via mcp__docs-playwright__browser_evaluate
const slides = document.querySelectorAll('.slide');
const allSlideData = [];

slides.forEach((slide, slideIndex) => {
  const slideRect = slide.getBoundingClientRect();
  const textElements = slide.querySelectorAll('[data-pptx-text]');

  const texts = Array.from(textElements).map(el => {
    const rect = el.getBoundingClientRect();
    return {
      id: el.dataset.pptxText,
      text: el.innerText,
      // Convert px to inches (1920px = 10 inches = 192px/inch)
      x: Math.round(((rect.left - slideRect.left) / 192) * 100) / 100,
      y: Math.round(((rect.top - slideRect.top) / 192) * 100) / 100,
      w: Math.round((rect.width / 192) * 100) / 100,
      h: Math.round(((rect.height / 192) * 1.1) * 100) / 100, // +10% height buffer
      // PptxGenJS styling from data attributes
      fontSize: parseInt(el.dataset.fontSize) || 14,
      fontFace: el.dataset.fontFace || "Calibri",
      color: el.dataset.color || "333333",
      bold: el.dataset.bold === "true",
      italic: el.dataset.italic === "true",
      align: el.dataset.align || "left",
      valign: el.dataset.valign || "top",
      shrinkText: el.dataset.shrink === "true"
    };
  });

  allSlideData.push({ slideIndex, texts });
});

JSON.stringify(allSlideData);
```

**Key details:**
- The `* 1.1` on height adds a 10% buffer to prevent text overflow in PowerPoint (browser and PowerPoint render text slightly differently)
- Coordinates are rounded to 2 decimal places for cleaner PptxGenJS values

### 6b: Hide Text Elements

After extraction, hide all text so the screenshot captures only the visual layer:

```javascript
// Run via mcp__docs-playwright__browser_evaluate
document.querySelectorAll('[data-pptx-text]').forEach(el => {
  el.style.visibility = 'hidden';
});
'done';
```

**Important:** Use `visibility: hidden`, NOT `display: none`. `visibility: hidden` keeps the element's space in the layout, so containers (cards, columns) retain their correct dimensions.

### 6c: Screenshot Each Slide's Visual Layer

Screenshot each slide section as a PNG at 1920x1080:

```
1. mcp__docs-playwright__browser_resize → width: 1920, height: 1080, deviceScaleFactor: 1
2. For each slide:
   a. mcp__docs-playwright__browser_evaluate → document.querySelector('#slide-N').scrollIntoView()
   b. mcp__docs-playwright__browser_take_screenshot → save as slide-N-bg.png
```

### 6d: Generate the PPTX

Read [references/pptxgenjs-api.md](references/pptxgenjs-api.md) for the full PptxGenJS API reference.

Write a Node.js script that generates the .pptx using the extracted metadata:

```javascript
const pptxgen = require("pptxgenjs");
const fs = require("fs");

// Load extracted metadata (from step 6a)
const slideData = JSON.parse(fs.readFileSync("slide-metadata.json", "utf-8"));

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10" x 5.625"
  pres.author = "Claude";
  pres.title = "Presentation Title";

  for (const { slideIndex, texts } of slideData) {
    const slide = pres.addSlide();

    // Load HTML-generated background
    const bgPath = `slide-${slideIndex + 1}-bg.png`;
    if (fs.existsSync(bgPath)) {
      const bg = fs.readFileSync(bgPath);
      slide.background = { data: "image/png;base64," + bg.toString("base64") };
    }

    // Add editable text at extracted coordinates
    for (const t of texts) {
      const opts = {
        x: t.x, y: t.y, w: t.w, h: t.h,
        fontSize: t.fontSize,
        fontFace: t.fontFace,
        color: t.color,
        bold: t.bold,
        italic: t.italic,
        align: t.align,
        valign: t.valign,
        margin: 0
      };

      if (t.shrinkText) {
        opts.shrinkText = true;
      }

      slide.addText(t.text, opts);
    }
  }

  await pres.writeFile({ fileName: "output.pptx" });
  console.log("Done: output.pptx");
}

main().catch(console.error);
```

### 6e: Save HTML Presentation (dual output)

Save the complete HTML file (with text visible) to an `html-presentation/` folder alongside the PPTX. This gives users two outputs:
- **`html-presentation/`** — pixel-perfect preview, viewable in any browser
- **`output.pptx`** — editable in PowerPoint

```bash
mkdir -p html-presentation
cp slides.html html-presentation/index.html
cp *.jpg *.png html-presentation/ 2>/dev/null || true
```

### Critical Rules (violating these corrupts the PPTX file)

- NEVER use `#` prefix on hex colors — `"FF0000"` not `"#FF0000"`
- NEVER encode opacity in hex strings — use the `opacity` property instead
- NEVER reuse option objects across multiple `addShape`/`addText` calls — PptxGenJS mutates them in place. Use factory functions instead.
- Use `bullet: true`, never unicode bullet characters
- Use `breakLine: true` between text array items

## Image Sizing Rules

When using images (sourced or AI-generated) in the presentation, **always match the image aspect ratio to its placement dimensions on the slide**. Mismatched aspect ratios cause distortion.

### Common placement sizes and their aspect ratios

| Placement | w x h (inches) | Aspect Ratio | Generate At |
|-----------|----------------|--------------|-------------|
| Full-bleed background | 10 x 5.625 | 16:9 | 1920x1080 or 16:9 |
| HTML visual layer backgrounds | 10 x 5.625 | 16:9 | Always 1920x1080 |
| Half-slide (left/right column) | 4.3 x 3.5 | ~1.23:1 | 1230x1000 or 5:4 |
| Half-slide (tall) | 5 x 5.625 | ~0.89:1 | 890x1000 or 9:10 |
| Quarter block (2x2 grid) | 4.3 x 1.8 | ~2.4:1 | 2400x1000 or 12:5 |
| Hero image (wide strip) | 9 x 3.0 | 3:1 | 2700x900 or 3:1 |
| Square icon/photo | 2 x 2 | 1:1 | 1:1 |

### Rules

- **NEVER generate all images at 16:9 by default** — only use 16:9 for full-bleed backgrounds
- **Use `sizing: { type: "cover", w: W, h: H }`** on every `addImage` call so images fill their box without distortion
- If the exact ratio doesn't match a standard option, pick the closest standard aspect ratio (1:1, 4:3, 3:2, 16:9, 9:16, etc.)
- For AI-generated images, include the target aspect ratio in the generation prompt/parameters
- **HTML background screenshots are always 1920x1080** — no aspect ratio calculation needed

## Step 7: QA

### 7a: Visual QA (LibreOffice)

After generating the .pptx, convert to images and inspect:

```bash
# Convert PPTX -> PDF -> JPG
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/soffice_convert.py output.pptx output.pdf
rm -f slide-*.jpg
pdftoppm -jpeg -r 150 output.pdf slide
ls -1 "$PWD"/slide-*.jpg
```

Then visually inspect each slide image. Look for:
- Text overflowing its extracted box (if so, increase the height buffer in step 6a)
- Text cut off at edges
- Low contrast (light text on light background, dark on dark)
- Uneven spacing or misaligned elements
- Elements too close to slide edges (< 0.5" margins)
- Inconsistent styling between slides
- HTML background and PptxGenJS text are properly aligned

**Final visual fidelity check:** Compare the Playwright HTML preview (with text) against the LibreOffice-rendered PPTX slides to verify the text positions match.

If any issues are found: fix the HTML or the generation script, re-run, re-convert, re-inspect. Repeat until clean.

### 7b: Structural QA (Always Do This)

Even with visual QA, also verify content:

```bash
# markitdown already installed in Step 1
python -m markitdown output.pptx
```

Check for: missing text, wrong slide order, typos, placeholder text left in.

### 7c: Structural QA Without LibreOffice

If LibreOffice is unavailable, perform mathematical layout validation in the generation script:

```javascript
// Add validation before writeFile:
function validateNoOverlap(elements) {
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i], b = elements[j];
      const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
      const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
      if (overlapX && overlapY) {
        console.warn(`Overlap: "${a.id}" and "${b.id}"`);
      }
    }
  }
}

function validateMargins(elements, slideW = 10, slideH = 5.625, margin = 0.5) {
  for (const el of elements) {
    if (el.x < margin) console.warn(`"${el.id}" too close to left edge`);
    if (el.y < margin) console.warn(`"${el.id}" too close to top edge`);
    if (el.x + el.w > slideW - margin) console.warn(`"${el.id}" too close to right edge`);
    if (el.y + el.h > slideH - margin) console.warn(`"${el.id}" too close to bottom edge`);
  }
}
```

## Scripts

### scripts/soffice_convert.py

A lightweight LibreOffice wrapper for converting PPTX to PDF. Handles sandboxed environments where AF_UNIX sockets may be blocked.

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/soffice_convert.py input.pptx output.pdf
```

## Reference Files

| File | When to Read |
|------|-------------|
| [references/pptxgenjs-api.md](references/pptxgenjs-api.md) | Always — full API reference for PptxGenJS |
| [references/design.md](references/design.md) | Always — color palettes, fonts, typography, spacing, CSS techniques |
| [references/layouts.md](references/layouts.md) | Always — slide layout catalog with HTML templates and PptxGenJS-only fallbacks |
| [references/html-templates.md](references/html-templates.md) | Always — HTML/CSS templates with `data-pptx-*` text attributes, shared CSS foundation |

Read all four reference files before generating any presentation.

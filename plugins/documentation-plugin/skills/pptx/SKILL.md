---
name: pptx-presentations
description: "This skill should be activated when the user asks to make a presentation, slide deck, pitch deck, or anything involving .pptx output. Also triggers when the user says 'make me slides', 'create a deck', 'presentation about X', or mentions PowerPoint. Creates polished PowerPoint (.pptx) presentations from scratch using a hybrid HTML/CSS + PptxGenJS workflow: visual layers are designed in HTML/CSS and screenshotted with Playwright, then used as PPTX slide backgrounds with editable text on top. Activates even for simple 'make a quick 3-slide deck' requests — the skill ensures quality output every time."
---

# PPTX Presentation Skill

Create professional PowerPoint presentations using a hybrid workflow: **HTML/CSS for visual design** (gradients, shadows, decorative elements) + **PptxGenJS for editable text and native elements** (charts, tables).

## Why Hybrid?

PptxGenJS has severe visual limitations — no gradients, no CSS filters, limited typography, manual x/y positioning only. HTML/CSS can produce Canva-level designs but can't create editable PPTX files. The hybrid approach:

1. Design each slide's **visual layer** in HTML/CSS (gradients, decorative shapes, photo overlays, shadows) — **no text**
2. Screenshot at 1920×1080 with Playwright
3. Use screenshots as full-bleed PPTX slide backgrounds
4. Add **editable text** on top with PptxGenJS layout functions (coordinates already defined)

## Workflow Overview

1. **Structure** — Define narrative arc and slide sequence
2. **Content** — Fill in text, data, images per slide
3. **Design visual layers** — Write HTML/CSS for each slide's background
4. **Preview with Playwright** — Screenshot and iterate on visuals
5. **Generate PPTX** — Screenshot backgrounds + PptxGenJS text on top
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

If LibreOffice or poppler-utils are not installed, tell the user they are needed for visual QA and ask if they'd like to install them. If the user declines or installation is not possible, skip visual QA and rely on structural checks (Step 6b).

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
3. **Image plan** — which slides need generated images and at what aspect ratio
4. **Color palette** — pick a palette matching the topic (see [references/design.md](references/design.md))
5. **Font pairing** — pick a header + body font combo (see [references/design.md](references/design.md))

Vary slide layouts. Monotonous decks with the same layout repeated are the most common failure. Use at least 3 different layout types across a deck.

**Generate all planned images BEFORE writing any code.** This avoids mid-script interruptions and ensures images are ready when needed.

### Design Quality Target

Aim for Canva-level presentation quality. Read the Premium Design Techniques section in [references/design.md](references/design.md). Key requirements:
- At least 3 slides with full-bleed photo backgrounds + dark overlay
- CSS gradient backgrounds on non-photo slides
- Elevated rounded cards with soft shadows instead of flat rectangles
- Decorative geometric shapes for visual interest
- Never more than 2 consecutive plain-background slides
- Topic-specific AI-generated images, not generic abstractions

## Step 4: Design Visual Layers in HTML/CSS

Write a single HTML file with one `<section class="slide">` per slide, each 1920×1080px. The HTML contains **only the visual/decorative layer** — no editable text.

See [references/html-templates.md](references/html-templates.md) for templates per layout type.

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
    body { background: #000; }

    .slide {
      width: 1920px;
      height: 1080px;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px; /* gap between slides for preview */
    }
  </style>
</head>
<body>
  <section class="slide" id="slide-1">
    <!-- Visual layer only: gradients, shapes, photo overlays -->
  </section>

  <section class="slide" id="slide-2">
    <!-- ... -->
  </section>

  <!-- One section per slide -->
</body>
</html>
```

### Key Rules

- **No text in the HTML** — text goes in PptxGenJS (editable in PowerPoint)
- Use **CSS custom properties** for the color palette so the whole deck's look can be tuned by changing a few variables
- Each `<section class="slide">` is exactly 1920×1080px
- Use absolute positioning within each slide section for decorative elements
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

Use the Playwright MCP to preview the HTML file. This is the fast iteration loop — no LibreOffice or PPTX generation needed.

### Playwright Commands for Slide Preview

```
1. mcp__playwright__browser_resize → width: 1920, height: 1080, deviceScaleFactor: 1
2. mcp__playwright__browser_navigate → file:///absolute/path/to/slides.html
3. mcp__playwright__browser_take_screenshot
```

**Important settings:**
- `deviceScaleFactor: 1` — the HTML is already at 1920×1080, no scaling needed
- `width: 1920, height: 1080` — viewport matches slide dimensions

To preview individual slides, scroll to each `<section>` or use fragment navigation (`#slide-1`).

Visually inspect each slide. Look for:
- Gradient colors and direction look good
- Decorative shapes are positioned correctly
- Photo overlays have correct opacity
- Card shadows are visible
- Overall visual hierarchy is clear

Iterate on HTML/CSS until the visual layer looks professional. This loop is fast — just edit HTML, reload, screenshot.

## Step 6: Generate PPTX

### 6a: Screenshot Each Slide's Visual Layer

For each slide that uses an HTML visual layer, screenshot it as a PNG:

```javascript
const fs = require("fs");

// After Playwright screenshots each slide section to individual PNGs:
// slide-1-bg.png, slide-2-bg.png, etc.
// Read them as base64 for use in PptxGenJS:
function loadSlideBackground(path) {
  const buf = fs.readFileSync(path);
  return "image/png;base64," + buf.toString("base64");
}
```

To screenshot individual slide sections from the HTML file, use Playwright to:
1. Navigate to the HTML file
2. For each slide, evaluate JS to scroll to / isolate that section
3. Screenshot at 1920×1080

Alternatively, write separate HTML files per slide, each with a single `<section>`.

### 6b: Generate the PPTX

Read [references/pptxgenjs-api.md](references/pptxgenjs-api.md) for the full PptxGenJS API reference.

Write a Node.js script that generates the .pptx:

```javascript
const pptxgen = require("pptxgenjs");
const fs = require("fs");

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10" × 5.625"
  pres.author = "Claude";
  pres.title = "Presentation Title";

  // --- Slide 1: Title (HTML visual background) ---
  const slide1 = pres.addSlide();
  const bg1 = fs.readFileSync("slide-1-bg.png");
  slide1.background = { data: "image/png;base64," + bg1.toString("base64") };
  // Add editable text on top — coordinates from layouts.md
  slide1.addText("Title Here", {
    x: 0.8, y: 1.5, w: 8.4, h: 1.5,
    fontSize: 44, fontFace: "Georgia", color: "FFFFFF",
    bold: true, align: "left"
  });

  // --- Slide 2: Content (PptxGenJS-only, simple background) ---
  const slide2 = pres.addSlide();
  slide2.background = { color: "FFFFFF" };
  // ... add text, shapes as usual ...

  // --- Slide 3: Chart (PptxGenJS-only, native chart) ---
  const slide3 = pres.addSlide();
  slide3.background = { color: "FFFFFF" };
  // ... slide.addChart(...) ...

  await pres.writeFile({ fileName: "/path/to/output.pptx" });
  console.log("Done: output.pptx");
}

main().catch(console.error);
```

### Critical Rules (violating these corrupts the file)

- NEVER use `#` prefix on hex colors — `"FF0000"` not `"#FF0000"`
- NEVER encode opacity in hex strings — use the `opacity` property instead
- NEVER reuse option objects across multiple `addShape`/`addText` calls — PptxGenJS mutates them in place. Use factory functions instead.
- Use `bullet: true`, never unicode `•` characters
- Use `breakLine: true` between text array items

## Image Sizing Rules

When generating images (via AI image generation or any other source) for use in the presentation, **always match the image aspect ratio to its placement dimensions on the slide**. Mismatched aspect ratios cause distortion.

### Common placement sizes and their aspect ratios

| Placement | w × h (inches) | Aspect Ratio | Generate At |
|-----------|----------------|--------------|-------------|
| Full-bleed background | 10 × 5.625 | 16:9 | 1920×1080 or 16:9 |
| HTML visual layer backgrounds | 10 × 5.625 | 16:9 | Always 1920×1080 |
| Half-slide (left/right column) | 4.3 × 3.5 | ~1.23:1 | 1230×1000 or 5:4 |
| Half-slide (tall) | 5 × 5.625 | ~0.89:1 | 890×1000 or 9:10 |
| Quarter block (2×2 grid) | 4.3 × 1.8 | ~2.4:1 | 2400×1000 or 12:5 |
| Hero image (wide strip) | 9 × 3.0 | 3:1 | 2700×900 or 3:1 |
| Square icon/photo | 2 × 2 | 1:1 | 1:1 |

### Rules

- **NEVER generate all images at 16:9 by default** — only use 16:9 for full-bleed backgrounds
- **Use `sizing: { type: "cover", w: W, h: H }`** on every `addImage` call so images fill their box without distortion
- If the exact ratio doesn't match a standard option, pick the closest standard aspect ratio (1:1, 4:3, 3:2, 16:9, 9:16, etc.)
- For AI-generated images, include the target aspect ratio in the generation prompt/parameters
- **HTML background screenshots are always 1920×1080** — no aspect ratio calculation needed

## Step 7: QA

### 7a: Visual QA (LibreOffice)

After generating the .pptx, convert to images and inspect:

```bash
# Convert PPTX → PDF → JPG
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/soffice_convert.py output.pptx output.pdf
rm -f slide-*.jpg
pdftoppm -jpeg -r 150 output.pdf slide
ls -1 "$PWD"/slide-*.jpg
```

Then visually inspect each slide image. Look for:
- Overlapping text or shapes
- Text cut off at edges or overflowing boxes
- Low contrast (light text on light background, dark on dark)
- Uneven spacing or misaligned elements
- Elements too close to slide edges (< 0.5" margins)
- Inconsistent styling between slides
- HTML background and PptxGenJS text are properly aligned

**Final visual fidelity check:** Compare the Playwright HTML preview screenshots with the LibreOffice-rendered PPTX slides to verify the backgrounds look correct after PPTX embedding.

If any issues are found: fix the generation script, re-run, re-convert, re-inspect. Repeat until clean.

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
        console.warn(`Overlap: "${a.name}" and "${b.name}"`);
      }
    }
  }
}

function validateMargins(elements, slideW = 10, slideH = 5.625, margin = 0.5) {
  for (const el of elements) {
    if (el.x < margin) console.warn(`"${el.name}" too close to left edge`);
    if (el.y < margin) console.warn(`"${el.name}" too close to top edge`);
    if (el.x + el.w > slideW - margin) console.warn(`"${el.name}" too close to right edge`);
    if (el.y + el.h > slideH - margin) console.warn(`"${el.name}" too close to bottom edge`);
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
| [references/layouts.md](references/layouts.md) | Always — slide layout catalog with code examples |
| [references/html-templates.md](references/html-templates.md) | Always — HTML/CSS templates for visual layers |

Read all four reference files before generating any presentation.

---
name: pptx-presentations
description: "This skill should be activated when the user asks to make a presentation, slide deck, pitch deck, or anything involving .pptx output. Also triggers when the user says 'make me slides', 'create a deck', 'presentation about X', or mentions PowerPoint. Creates polished PowerPoint (.pptx) presentations from scratch using PptxGenJS. Covers the full workflow: generating slides with PptxGenJS, converting to images with LibreOffice for visual QA, and iterating until the result looks professional. Activates even for simple 'make a quick 3-slide deck' requests — the skill ensures quality output every time."
---

# PPTX Presentation Skill

Create professional PowerPoint presentations using PptxGenJS (Node.js) with visual QA via LibreOffice.

## Workflow Overview

1. **Plan** the deck (content outline, slide types, color palette)
2. **Generate** the .pptx using PptxGenJS
3. **Convert** to images (LibreOffice → PDF → JPG)
4. **Visually inspect** the rendered slides
5. **Fix** any issues and re-render
6. **Deliver** the final .pptx

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

If LibreOffice or poppler-utils are not installed, tell the user they are needed for visual QA and ask if they'd like to install them. If the user declines or installation is not possible, skip visual QA and rely on structural checks (Step 5b).

## Step 2: Plan the Deck

Before writing any code, plan:

1. **Content outline** — one line per slide describing what goes on it
2. **Slide types** — pick from the layout catalog (see [references/layouts.md](references/layouts.md))
3. **Color palette** — pick a palette that matches the topic (see [references/design.md](references/design.md))
4. **Font pairing** — pick a header + body font combo (see [references/design.md](references/design.md))
5. **Image plan** — decide which slides need generated images (at minimum: title, one section divider, and closing). For each image, note:
   - What the image should depict (specific to the topic, not generic)
   - The aspect ratio matching its placement (see Image Sizing Rules above)
   - Whether it's a full-bleed background (16:9) or a half-slide photo (9:10 / 1:1)

Vary slide layouts. Monotonous decks with the same layout repeated are the most common failure. Use at least 3 different layout types across a deck.

**Generate all planned images BEFORE writing the PptxGenJS script.** This avoids mid-script interruptions and ensures images are ready when needed.

### Design Quality Target

Aim for Canva-level presentation quality. Read the Premium Design Techniques section in [references/design.md](references/design.md). Key requirements:
- At least 3 slides with full-bleed photo backgrounds + dark overlay
- Elevated rounded cards with soft shadows instead of flat rectangles
- Decorative geometric shapes for visual interest
- Never more than 2 consecutive plain-background slides
- Topic-specific AI-generated images, not generic abstractions

## Image Sizing Rules

When generating images (via AI image generation or any other source) for use in the presentation, **always match the image aspect ratio to its placement dimensions on the slide**. Mismatched aspect ratios cause distortion.

### How to calculate

1. Determine the placement box dimensions from the layout code (the `w` and `h` values in `addImage`)
2. Calculate the aspect ratio: `w / h`
3. Generate the image at that aspect ratio

### Common placement sizes and their aspect ratios

| Placement | w × h (inches) | Aspect Ratio | Generate At |
|-----------|----------------|--------------|-------------|
| Full-bleed background | 10 × 5.625 | 16:9 | 1920×1080 or 16:9 |
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

## Step 3: Generate the Presentation

Read [references/pptxgenjs-api.md](references/pptxgenjs-api.md) for the full PptxGenJS API reference.

Write a Node.js script that generates the .pptx. The script structure:

```javascript
const pptxgen = require("pptxgenjs");

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10" × 5.625"
  pres.author = "Claude";
  pres.title = "Presentation Title";

  // --- Slide 1: Title ---
  // --- Slide 2: Content ---
  // ... etc ...

  await pres.writeFile({ fileName: "/path/to/output.pptx" });
  console.log("Done: output.pptx");
}

main().catch(console.error);
```

Critical rules (violating these corrupts the file):
- NEVER use `#` prefix on hex colors — `"FF0000"` not `"#FF0000"`
- NEVER encode opacity in hex strings — use the `opacity` property instead
- NEVER reuse option objects across multiple `addShape`/`addText` calls — PptxGenJS mutates them in place. Use factory functions instead.
- Use `bullet: true`, never unicode `•` characters
- Use `breakLine: true` between text array items

## Step 4: Visual QA (LibreOffice)

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

If any issues are found: fix the generation script, re-run, re-convert, re-inspect. Repeat until clean.

## Step 5: Structural QA (Always Do This)

Even with visual QA, also verify content:

```bash
# markitdown already installed in Step 1
python -m markitdown output.pptx
```

Check for: missing text, wrong slide order, typos, placeholder text left in.

### Step 5b: Structural QA Without LibreOffice

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
| [references/design.md](references/design.md) | Always — color palettes, fonts, typography, spacing |
| [references/layouts.md](references/layouts.md) | Always — slide layout catalog with code examples |

Read all three reference files before generating any presentation.

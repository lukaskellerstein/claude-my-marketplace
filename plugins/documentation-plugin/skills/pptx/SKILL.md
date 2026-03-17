---
name: pptx-presentations
description: "This skill should be activated when the user asks to make a presentation, slide deck, pitch deck, or anything involving .pptx output. Also triggers when the user says 'make me slides', 'create a deck', 'presentation about X', or mentions PowerPoint. Creates polished PowerPoint (.pptx) presentations using PptxGenJS for all slide generation and the media-plugin for sourcing/generating images. Can also edit existing PPTX templates. Activates even for simple 'make a quick 3-slide deck' requests — the skill ensures quality output every time."
---

# PPTX Presentation Skill

Create professional PowerPoint presentations using **PptxGenJS** for all slide generation and **media-plugin** for sourcing/generating images at correct dimensions.

## Quick Reference

| Task | Go To |
|------|-------|
| Create from scratch | [Creating from Scratch](#creating-from-scratch) below |
| Edit existing template | [editing.md](editing.md) |
| Read content from PPTX | [Reading Content](#reading-content) below |

## Setup

```bash
# Install dependencies (first time only)
npm install -g pptxgenjs react react-dom react-icons sharp
pip install "markitdown[pptx]" Pillow --break-system-packages

# Verify LibreOffice is available
which soffice || echo "LibreOffice not installed — install with: sudo apt install libreoffice"

# Verify pdftoppm is available
which pdftoppm || echo "pdftoppm not installed — install with: sudo apt install poppler-utils"
```

If LibreOffice or poppler-utils are not installed, tell the user they are needed for visual QA and ask if they'd like to install them. If the user declines or installation is not possible, skip visual QA and rely on structural checks.

## Creating from Scratch

### Step 1: Structure

Define the high-level narrative arc. What story does this deck tell? Output: an ordered list of slide titles and their purpose.

Example:
1. Slide 1: Title — hook the audience
2. Slide 2: Problem — establish the pain point
3. Slide 3: Solution — introduce our approach
4. Slide 4: Key Metrics — prove traction
5. ...

This step is about the **skeleton** — no content details yet.

### Step 2: Content + Image Plan

For each slide in the structure, define:

1. **Text content** — title, subtitle, bullet points, quotes, data points
2. **Layout type** — pick from the layout catalog (see [references/layouts.md](references/layouts.md))
3. **Image plan** — which slides need images and at what aspect ratio (see [Image Sizing Rules](#image-sizing-rules))
4. **Color palette** — pick a palette matching the topic (see [references/design.md](references/design.md))
5. **Font pairing** — pick a header + body font combo (see [references/design.md](references/design.md))

Vary slide layouts. Monotonous decks with the same layout repeated are the most common failure. Use at least 3 different layout types across a deck.

### Design Quality Target

Read the Premium Design Techniques section in [references/design.md](references/design.md). Key requirements:
- At least 2-3 slides with full-bleed photo backgrounds + dark overlay
- Bold solid color or gradient image backgrounds on non-photo slides
- Elevated rounded cards with soft shadows (`ROUNDED_RECTANGLE` + `shadow`)
- Decorative shapes (OVALs, RECTANGLEs) for visual interest
- Never more than 2 consecutive plain-background slides
- Topic-specific images — prefer real photos from Unsplash; only AI-generate when no suitable stock photo exists

### Step 3: Gather Images

**Gather all planned images BEFORE writing any code.** This avoids mid-script interruptions.

For each image in the plan:

1. **Try Unsplash first** — use the `image-sourcing` skill to search for a real photo. Specify the target aspect ratio (e.g., 16:9 for full-bleed backgrounds, 9:10 for split-image layouts).
2. **Fall back to AI generation** — if no suitable stock photo exists, use the `image-generation` skill. Include the target aspect ratio in the generation parameters.
3. **Save with descriptive names** — e.g., `title-bg-cityscape.jpg`, `split-solar-farm.jpg`

Always match the image aspect ratio to its placement dimensions. See [Image Sizing Rules](#image-sizing-rules).

### Step 4: Generate PPTX

Read [references/pptxgenjs-api.md](references/pptxgenjs-api.md) for the full PptxGenJS API reference and [references/layouts.md](references/layouts.md) for slide layout implementations.

Write a Node.js script that generates the .pptx using PptxGenJS:

```javascript
const pptxgen = require("pptxgenjs");
const fs = require("fs");

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10" x 5.625"
  pres.author = "Claude";
  pres.title = "Presentation Title";

  // --- Slide 1: Title with photo background ---
  const slide1 = pres.addSlide();
  const bgData = fs.readFileSync("title-bg.jpg");
  slide1.background = { data: "image/jpeg;base64," + bgData.toString("base64") };

  // Dark overlay
  slide1.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: "000000", transparency: 45 }
  });

  slide1.addText("Presentation Title", {
    x: 0.8, y: 1.5, w: 8.4, h: 1.5,
    fontSize: 44, fontFace: "Georgia", color: "FFFFFF",
    bold: true, align: "left"
  });

  // --- Add more slides using layout functions from layouts.md ---

  await pres.writeFile({ fileName: "output.pptx" });
  console.log("Done: output.pptx");
}

main().catch(console.error);
```

**Use the layout functions from [references/layouts.md](references/layouts.md)** — copy the relevant functions into your script and call them with your content.

### Critical Rules (violating these corrupts the PPTX file)

- NEVER use `#` prefix on hex colors — `"FF0000"` not `"#FF0000"`
- NEVER encode opacity in hex strings — use the `opacity` property instead
- NEVER reuse option objects across multiple `addShape`/`addText` calls — PptxGenJS mutates them in place. Use factory functions instead.
- Use `bullet: true`, never unicode bullet characters
- Use `breakLine: true` between text array items

### Step 5: QA

After generating the .pptx, verify it with a rigorous QA process.

#### 5a: Visual QA (thumbnail subagent)

Generate thumbnails and visually inspect via a subagent:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/thumbnail.py output.pptx thumbnails
```

Then **launch a subagent** to inspect the generated slide images. The subagent should read each `thumbnails-N.jpg` grid and check for:

- Text overflowing its box or cut off at edges
- Low contrast (light text on light background, dark on dark)
- Uneven spacing or misaligned elements
- Elements too close to slide edges (< 0.5" margins)
- Inconsistent styling between slides
- Images distorted or poorly positioned
- Missing content or placeholder text

#### 5b: Schema Validation

Validate the PPTX against OOXML XSD schemas to catch XML corruption:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/validate.py output.pptx -v
```

If validation fails, use `--auto-repair` to fix common issues automatically, or inspect the errors and fix the generation script.

#### 5c: Structural QA

Check for placeholder text and structural issues:

```bash
# Extract all text content
python -m markitdown output.pptx
```

Review the output for:
- Missing text or wrong slide order
- Placeholder text left in (e.g., "Lorem ipsum", "TODO", "Insert text here")
- Typos
- Data accuracy

#### 5d: Placeholder Grep

Search for common placeholder patterns that should never appear in final output:

```bash
python -m markitdown output.pptx | grep -iE "(lorem|ipsum|placeholder|todo|tbd|insert|example|sample text)"
```

If any matches are found, fix the content and regenerate.

### Step 6: Fix & Re-verify

If QA reveals issues:
1. Fix the generation script
2. Re-run to generate a new .pptx
3. Re-run QA (Step 5)
4. Repeat until clean

## Editing from Template

For editing existing PPTX templates (updating content, adding/removing slides, preserving branding), see [editing.md](editing.md).

## Reading Content

To extract text content from an existing PPTX:

```bash
python -m markitdown output.pptx
```

To generate visual thumbnails:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/thumbnail.py input.pptx thumbnails/
```

## Image Sizing Rules

When using images (sourced or AI-generated) in the presentation, **always match the image aspect ratio to its placement dimensions on the slide**. Mismatched aspect ratios cause distortion.

### Common placement sizes and their aspect ratios

| Placement | w x h (inches) | Aspect Ratio | Generate At |
|-----------|----------------|--------------|-------------|
| Full-bleed background | 10 x 5.625 | 16:9 | 1920x1080 or 16:9 |
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

## Design Ideas

See [references/design.md](references/design.md) for:
- Color palettes (14 curated palettes for different themes)
- Font pairings (10 header + body combinations)
- Typography scale and rules
- Spacing guidelines
- Premium design techniques (photo backgrounds, elevated cards, decorative shapes, visual rhythm)
- Common design mistakes to avoid

## QA

See [Step 5](#step-5-qa) above for the full QA process. Key points:

- **Always generate thumbnails** via `thumbnail.py` and visually inspect
- **Use a subagent** for visual inspection — it can read the slide images and check for issues
- **Always run structural QA** via `markitdown` to catch missing/wrong text
- **Grep for placeholders** to catch any template text left in
- **Fix and re-verify** until clean — never ship a deck without QA

## Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `soffice_convert.py` | Convert PPTX → PDF via LibreOffice | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/soffice_convert.py input.pptx output.pdf` |
| `thumbnail.py` | PPTX → labeled slide grid image | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/thumbnail.py input.pptx [output_prefix] [--cols N]` |
| `validate.py` | XSD schema + structural validation | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/validate.py input.pptx [-v] [--auto-repair]` |
| `unpack.py` | Extract PPTX ZIP, pretty-print XML | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/unpack.py input.pptx [output_dir]` |
| `pack.py` | Repack directory into PPTX ZIP | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/pack.py unpacked_dir [output.pptx]` |
| `add_slide.py` | Duplicate a slide in unpacked PPTX | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/add_slide.py unpacked_dir slide_number` |
| `clean.py` | Remove unreferenced slides/media | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/clean.py unpacked_dir` |

## Reference Files

| File | When to Read |
|------|-------------|
| [references/pptxgenjs-api.md](references/pptxgenjs-api.md) | Always — full API reference for PptxGenJS |
| [references/design.md](references/design.md) | Always — color palettes, fonts, typography, spacing, design techniques |
| [references/layouts.md](references/layouts.md) | Always — slide layout catalog with PptxGenJS implementations and media-plugin integration |
| [editing.md](editing.md) | When editing existing PPTX templates |

Read the three reference files before generating any presentation.

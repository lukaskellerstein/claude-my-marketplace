---
name: docx-documents
description: "This skill should be activated when the user asks to create a Word document, report, memo, letter, proposal, whitepaper, or anything involving .docx output. Also triggers when the user says 'write a report', 'create a document', 'make a Word file', 'draft a proposal', 'generate a whitepaper', or mentions .docx. Creates polished Word documents (.docx) using the docx npm package (docx-js) for all document generation and the media-plugin for sourcing/generating images. Can also edit existing DOCX files. Activates even for simple requests like 'write a one-page memo' — the skill ensures professional output every time."
---

# DOCX Document Skill

Create professional Word documents using **docx** (docx-js npm package) for all document generation, **media-plugin** for sourcing/generating images, and **graph-generation** for charts and diagrams.

## Quick Reference

| Task | Go To |
|------|-------|
| Create from scratch | [Creating from Scratch](#creating-from-scratch) below |
| Edit existing DOCX | [editing.md](editing.md) |
| Read content from DOCX | [Reading Content](#reading-content) below |

## Setup

```bash
# Install dependencies (first time only)
npm install -g docx sharp
pip install "markitdown[docx]" Pillow --break-system-packages

# Verify LibreOffice is available (for thumbnail generation and PDF export)
which soffice || echo "LibreOffice not installed — install with: sudo apt install libreoffice"

# Verify pdftoppm is available (for thumbnail generation)
which pdftoppm || echo "pdftoppm not installed — install with: sudo apt install poppler-utils"
```

If LibreOffice or poppler-utils are not installed, tell the user they are needed for visual QA and ask if they'd like to install them. If the user declines or installation is not possible, skip visual QA and rely on structural checks.

## Creating from Scratch

### Step 1: Structure

Define the document outline — sections, headings, and purpose of each. Output: an ordered list of sections with their role.

Example:
1. Cover Page — title, subtitle, date, author
2. Executive Summary — key findings in 2-3 paragraphs
3. Introduction — background and scope
4. Analysis — data tables, charts, key metrics
5. Recommendations — prioritized action items
6. Appendix — supporting data

This step is about the **skeleton** — no content details yet.

### Step 2: Content + Visual Plan

For each section, define:

1. **Text content** — headings, paragraphs, bullet points, tables, data
2. **Image plan** — which sections need images/charts and at what size
3. **Chart plan** — which data needs D3.js charts or Mermaid diagrams
4. **Color palette** — pick a palette matching the topic (see [references/design.md](references/design.md))
5. **Font pairing** — pick header + body fonts (see [references/design.md](references/design.md))

### Design Quality Target

Read the Design System in [references/design.md](references/design.md). Key requirements:
- Professional cover page with title, subtitle, date, author
- Consistent heading hierarchy (Heading1 for sections, Heading2 for subsections)
- Tables with header row shading and alternating row colors
- Images sized appropriately (full-width, half-width, or quarter-width)
- Page numbers in footer
- Table of Contents for documents > 3 pages

### Step 3: Gather Visuals

**Gather all planned images and charts BEFORE writing any code.**

For each image:
1. **Try Unsplash first** — use the `image-sourcing` skill for real photos
2. **Fall back to AI generation** — use `image-generation` skill if no suitable stock photo exists

For each chart/diagram:
1. **Use `graph-generation` skill** for D3.js charts (bar, line, pie, scatter, area, etc.)
2. **Use `graph-generation` skill** for Mermaid diagrams (flowcharts, sequence, ER, C4, etc.)
3. Charts are rendered as PNG via Playwright, then embedded into the DOCX

### Image Sizing for Documents

| Placement | Width (inches) | DXA Width | Notes |
|-----------|---------------|-----------|-------|
| Full-width | 6.5 | 9360 | Between 1" margins on US Letter |
| Half-width (text wrap) | 3.0-3.25 | 4320-4680 | Float left/right alongside text |
| Quarter-width | 1.5-2.0 | 2160-2880 | Inline icon/thumbnail |
| Header/cover banner | 6.5 x 3.0 | 9360 x 4320 | Wide banner for cover page |

### Step 4: Generate DOCX

Read [references/docx-js-api.md](references/docx-js-api.md) for the full docx-js API reference.

Write a Node.js script that generates the .docx:

```javascript
const docx = require("docx");
const fs = require("fs");

const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table,
        TableRow, TableCell, WidthType, ImageRun, PageBreak,
        AlignmentType, BorderStyle, ShadingType, Header, Footer,
        PageNumber, NumberFormat, TableOfContents } = docx;

async function main() {
  const doc = new Document({
    creator: "Claude",
    title: "Document Title",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 24 }, // 12pt
        },
        heading1: {
          run: { font: "Georgia", size: 36, bold: true, color: "1B3A5C" },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        heading2: {
          run: { font: "Georgia", size: 28, bold: true, color: "2C5F8A" },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1" margins
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({ text: "Document Title", alignment: AlignmentType.RIGHT })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun("Page "),
              new TextRun({ children: [PageNumber.CURRENT] }),
              new TextRun(" of "),
              new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
            ],
          })],
        }),
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          text: "Section Title",
        }),
        new Paragraph({
          children: [new TextRun("Body text content here.")],
        }),
        // ... more content
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("output.docx", buffer);
  console.log("Done: output.docx");
}

main().catch(console.error);
```

### Critical Rules (violating these corrupts or breaks the DOCX)

- **Page dimensions in DXA** — US Letter = 12240 x 15840, A4 = 11906 x 16838 (1 inch = 1440 DXA)
- **Never use `\n` for line breaks** — use separate `Paragraph` elements
- **Tables**: always use `WidthType.DXA`, set both `columnWidths` on Table and `width` on each cell
- **Lists**: use `LevelFormat.BULLET` for bullets, never manual bullet characters
- **Page breaks**: use `PageBreak` inside a Paragraph's children array
- **Images**: always specify `type` parameter (e.g., `ImageRun` with explicit dimensions)
- **Heading IDs**: use "Heading1", "Heading2" + set `outlineLevel` for TOC compatibility

### Step 5: QA

After generating the .docx, verify with a rigorous QA process.

#### 5a: Visual QA (thumbnail subagent)

Generate page thumbnails and visually inspect via a subagent:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/thumbnail.py output.docx thumbnails
```

Then **launch a subagent** to inspect the generated page images. Check for:
- Text overflowing margins
- Tables not fitting the page width
- Images distorted or poorly positioned
- Inconsistent heading styles
- Missing page numbers
- Blank pages (common with page breaks)

#### 5b: Schema Validation

Validate the DOCX against OOXML XSD schemas:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/validate.py output.docx -v
```

If validation fails, use `--auto-repair` to fix common issues, or inspect errors and fix the generation script.

#### 5c: Structural QA

Check for placeholder text and structural issues:

```bash
python -m markitdown output.docx
```

Review for:
- Missing text or wrong section order
- Placeholder text ("Lorem ipsum", "TODO", "Insert text here")
- Typos and data accuracy

#### 5d: Placeholder Grep

```bash
python -m markitdown output.docx | grep -iE "(lorem|ipsum|placeholder|todo|tbd|insert|example|sample text)"
```

### Step 6: Fix & Re-verify

If QA reveals issues:
1. Fix the generation script
2. Re-run to generate a new .docx
3. Re-run QA (Step 5)
4. Repeat until clean

## Editing from Template

For editing existing DOCX files (updating content, tracked changes, comments), see [editing.md](editing.md).

## Reading Content

To extract text content from an existing DOCX:

```bash
python -m markitdown output.docx
```

To generate visual page thumbnails:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/thumbnail.py input.docx thumbnails
```

## Chart Integration

The DOCX skill integrates with the `graph-generation` skill for embedding charts and diagrams.

### D3.js Charts

Use `graph-generation` to create data visualizations:
- Bar charts, line charts, pie charts, scatter plots
- Area charts, grouped/stacked bars
- Charts rendered as PNG, then embedded into DOCX via `ImageRun`

### Mermaid Diagrams

Use `graph-generation` to create diagrams:
- Flowcharts, sequence diagrams, ER diagrams
- C4 architecture diagrams, state diagrams
- Diagrams rendered as PNG via Playwright, then embedded into DOCX

### Embedding Charts

```javascript
// After generating chart PNG via graph-generation skill
const chartData = fs.readFileSync("chart.png");
new Paragraph({
  children: [
    new ImageRun({
      data: chartData,
      transformation: { width: 468, height: 300 }, // ~6.5" x ~4.2" at 72 DPI
      type: "png",
    }),
  ],
  alignment: AlignmentType.CENTER,
});
```

## Scripts

### Shared Office Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `soffice.py` | LibreOffice integration (convert, env) | `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/soffice.py input.docx output.pdf` |
| `validate.py` | XSD schema + structural validation | `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/validate.py input.docx [-v] [--auto-repair] [--original orig.docx]` |
| `unpack.py` | Extract DOCX ZIP, pretty-print XML | `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/unpack.py input.docx [output_dir] [--merge-runs] [--simplify-redlines]` |
| `pack.py` | Repack directory into DOCX ZIP | `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/pack.py unpacked_dir [output.docx] [--validate]` |

### DOCX-Specific Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `thumbnail.py` | DOCX → labeled page grid image | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/thumbnail.py input.docx [output_prefix] [--cols N]` |
| `comment.py` | Add comments to unpacked DOCX | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/comment.py unpacked_dir "text" --author "Name"` |
| `accept_changes.py` | Accept all tracked changes | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/accept_changes.py input.docx [output.docx]` |

## Reference Files

| File | When to Read |
|------|-------------|
| [references/docx-js-api.md](references/docx-js-api.md) | Always — full API reference for docx-js |
| [references/design.md](references/design.md) | Always — document design system, colors, fonts, spacing |
| [editing.md](editing.md) | When editing existing DOCX files |

Read the reference files before generating any document.

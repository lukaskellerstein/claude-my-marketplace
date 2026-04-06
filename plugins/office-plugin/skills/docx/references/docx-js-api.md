# docx-js API Reference

Complete API reference for the `docx` npm package (docx-js) for generating Word documents programmatically.

## Setup

```javascript
const docx = require("docx");
const fs = require("fs");

const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table,
        TableRow, TableCell, WidthType, ImageRun, PageBreak,
        AlignmentType, BorderStyle, ShadingType, Header, Footer,
        PageNumber, NumberFormat, TableOfContents, Tab, TabStopType,
        TabStopPosition, ExternalHyperlink, InternalHyperlink,
        Bookmark, SectionType, PageOrientation, TextWrappingType,
        TextWrappingSide, HorizontalPositionRelativeFrom,
        VerticalPositionRelativeFrom, LevelFormat } = docx;
```

## Document Setup

### Page Size

Dimensions in DXA (twentieths of a point). **1 inch = 1440 DXA**.

| Paper | Width (DXA) | Height (DXA) |
|-------|-------------|--------------|
| US Letter | 12240 | 15840 |
| A4 | 11906 | 16838 |
| Legal | 12240 | 20160 |

```javascript
const doc = new Document({
  creator: "Author Name",
  title: "Document Title",
  description: "Document description",
  sections: [{
    properties: {
      page: {
        size: {
          width: 12240,    // US Letter width
          height: 15840,   // US Letter height
          orientation: PageOrientation.PORTRAIT,
        },
        margin: {
          top: 1440,       // 1 inch
          right: 1440,
          bottom: 1440,
          left: 1440,
        },
      },
    },
    children: [/* paragraphs, tables, etc. */],
  }],
});
```

### Margins

Common margin presets:

| Style | Top/Bottom | Left/Right | DXA |
|-------|-----------|------------|-----|
| Normal | 1" | 1" | 1440 all |
| Narrow | 0.5" | 0.5" | 720 all |
| Wide | 1" | 2" | top/bottom: 1440, left/right: 2880 |
| Custom | varies | varies | varies |

### Headers and Footers

```javascript
sections: [{
  properties: { /* ... */ },
  headers: {
    default: new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Company Name", font: "Calibri", size: 18, color: "888888" }),
          ],
        }),
      ],
    }),
    first: new Header({
      children: [/* Different header for first page */],
    }),
  },
  footers: {
    default: new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 18 }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
            new TextRun({ text: " of ", size: 18 }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
          ],
        }),
      ],
    }),
  },
  children: [/* ... */],
}]
```

### Page Numbers

```javascript
// Simple centered page numbers
new Footer({
  children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ children: [PageNumber.CURRENT] }),
      ],
    }),
  ],
});

// "Page X of Y" format
new Paragraph({
  children: [
    new TextRun("Page "),
    new TextRun({ children: [PageNumber.CURRENT] }),
    new TextRun(" of "),
    new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
  ],
});
```

## Paragraphs and Text

### Basic Paragraph

```javascript
new Paragraph({
  children: [
    new TextRun("Plain text"),
    new TextRun({ text: " bold text", bold: true }),
    new TextRun({ text: " italic text", italics: true }),
  ],
});
```

### Text Formatting

```javascript
new TextRun({
  text: "Formatted text",
  font: "Georgia",
  size: 24,               // 12pt (size is in half-points)
  bold: true,
  italics: true,
  underline: { type: "single" },
  strike: false,
  color: "1B3A5C",        // 6-char hex, NO # prefix
  highlight: "yellow",
  superScript: false,
  subScript: false,
  allCaps: false,
  smallCaps: false,
  characterSpacing: 20,   // In twentieths of a point
});
```

### Headings

```javascript
// Heading with style
new Paragraph({
  heading: HeadingLevel.HEADING_1,
  text: "Section Title",
});

// Heading with custom formatting
new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [
    new TextRun({ text: "Subsection Title", font: "Georgia", bold: true, size: 28 }),
  ],
});
```

Heading levels: `HEADING_1` through `HEADING_6`, plus `TITLE`.

### Paragraph Spacing

```javascript
new Paragraph({
  spacing: {
    before: 240,    // Space before paragraph (in twentieths of a point)
    after: 120,     // Space after paragraph
    line: 276,      // Line spacing (276 = 1.15x, 360 = 1.5x, 480 = 2x)
  },
  children: [new TextRun("Spaced paragraph")],
});
```

### Alignment

```javascript
new Paragraph({
  alignment: AlignmentType.LEFT,      // or CENTER, RIGHT, JUSTIFIED, BOTH
  children: [new TextRun("Aligned text")],
});
```

### Indentation

```javascript
new Paragraph({
  indent: {
    left: 720,       // 0.5 inch
    right: 720,
    firstLine: 720,  // First line indent
    hanging: 360,    // Hanging indent
  },
  children: [new TextRun("Indented paragraph")],
});
```

## Lists

### Bullet Lists

```javascript
const doc = new Document({
  numbering: {
    config: [{
      reference: "bullet-list",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",    // bullet character
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
        {
          level: 1,
          format: LevelFormat.BULLET,
          text: "\u25E6",    // white bullet
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
        },
      ],
    }],
  },
  sections: [{
    children: [
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("First bullet point")],
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 1 },
        children: [new TextRun("Sub-bullet point")],
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Second bullet point")],
      }),
    ],
  }],
});
```

### Numbered Lists

```javascript
numbering: {
  config: [{
    reference: "numbered-list",
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } },
    }],
  }],
},
```

## Tables

### Basic Table

```javascript
new Table({
  width: { size: 9360, type: WidthType.DXA },  // Full width (6.5" between 1" margins)
  columnWidths: [3120, 3120, 3120],              // Equal 3 columns
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: "1B3A5C", type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Header 1", bold: true, color: "FFFFFF", size: 22 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: "1B3A5C", type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Header 2", bold: true, color: "FFFFFF", size: 22 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 3120, type: WidthType.DXA },
          shading: { fill: "1B3A5C", type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Header 3", bold: true, color: "FFFFFF", size: 22 })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3120, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun("Cell 1")] })],
        }),
        new TableCell({
          width: { size: 3120, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun("Cell 2")] })],
        }),
        new TableCell({
          width: { size: 3120, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun("Cell 3")] })],
        }),
      ],
    }),
  ],
});
```

### Table Cell Formatting

```javascript
new TableCell({
  width: { size: 3120, type: WidthType.DXA },
  shading: { fill: "F2F2F2", type: ShadingType.CLEAR },  // Background color
  verticalAlign: "center",
  margins: {
    top: 80,
    bottom: 80,
    left: 120,
    right: 120,
  },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  },
  children: [new Paragraph({ children: [new TextRun("Cell content")] })],
});
```

### Merged Cells

```javascript
// Horizontal merge (colspan)
new TableCell({
  columnSpan: 2,
  children: [new Paragraph({ children: [new TextRun("Spans 2 columns")] })],
});

// Vertical merge
new TableCell({
  rowSpan: 3,
  children: [new Paragraph({ children: [new TextRun("Spans 3 rows")] })],
});
```

### Alternating Row Colors

```javascript
function createDataRow(cells, rowIndex) {
  const bgColor = rowIndex % 2 === 0 ? "FFFFFF" : "F5F5F5";
  return new TableRow({
    children: cells.map((text, colIdx) =>
      new TableCell({
        width: { size: columnWidths[colIdx], type: WidthType.DXA },
        shading: { fill: bgColor, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun(text)] })],
      })
    ),
  });
}
```

## Images

### From File

```javascript
const imageData = fs.readFileSync("photo.png");

new Paragraph({
  children: [
    new ImageRun({
      data: imageData,
      transformation: {
        width: 468,      // pixels at 72 DPI ≈ 6.5 inches
        height: 300,
      },
      type: "png",       // ALWAYS specify type
    }),
  ],
});
```

### From Base64

```javascript
new ImageRun({
  data: Buffer.from(base64String, "base64"),
  transformation: { width: 468, height: 300 },
  type: "jpg",
});
```

### Image Sizing

DPI conversion: **1 inch = 72 pixels** at screen DPI, **1 inch = 96 pixels** at print DPI.

For docx-js, dimensions are in EMU internally but you specify pixels:

| Placement | Width (px) | Height (px) | Inches |
|-----------|-----------|-------------|--------|
| Full-width | 468 | ~300 | 6.5" wide |
| Half-width | 216-234 | varies | 3-3.25" |
| Quarter | 108-144 | varies | 1.5-2" |

### Floating Images (Text Wrapping)

```javascript
new ImageRun({
  data: imageData,
  transformation: { width: 234, height: 234 },
  type: "png",
  floating: {
    horizontalPosition: {
      relative: HorizontalPositionRelativeFrom.MARGIN,
      offset: 0,    // EMUs from left margin
    },
    verticalPosition: {
      relative: VerticalPositionRelativeFrom.PARAGRAPH,
      offset: 0,
    },
    wrap: {
      type: TextWrappingType.SQUARE,
      side: TextWrappingSide.RIGHT,
    },
    margins: {
      top: 0,
      bottom: 0,
      left: 114300,   // EMU (0.125 inches)
      right: 114300,
    },
  },
});
```

## Sections

### Page Breaks

```javascript
// Page break within content
new Paragraph({
  children: [new PageBreak()],
});
```

### Multiple Sections (Different Page Layouts)

```javascript
sections: [
  {
    properties: {
      page: {
        size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [/* Portrait content */],
  },
  {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        size: { width: 15840, height: 12240, orientation: PageOrientation.LANDSCAPE },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [/* Landscape content (wide tables, charts) */],
  },
]
```

## Table of Contents

```javascript
// Table of Contents placeholder
new TableOfContents("Table of Contents", {
  hyperlink: true,
  headingStyleRange: "1-3",  // Include Heading1 through Heading3
});
```

**Important:** The TOC is a field code — it gets populated when the document is opened in Word (Edit > Update Fields) or by LibreOffice. The initial render shows placeholder text.

## Styles Configuration

### Default Styles

```javascript
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: "Calibri",
          size: 24,     // 12pt
          color: "333333",
        },
        paragraph: {
          spacing: { after: 120, line: 276 },
        },
      },
      heading1: {
        run: { font: "Georgia", size: 36, bold: true, color: "1B3A5C" },
        paragraph: {
          spacing: { before: 360, after: 120 },
          outlineLevel: 0,  // Required for TOC
        },
      },
      heading2: {
        run: { font: "Georgia", size: 28, bold: true, color: "2C5F8A" },
        paragraph: {
          spacing: { before: 240, after: 80 },
          outlineLevel: 1,
        },
      },
      heading3: {
        run: { font: "Georgia", size: 24, bold: true, color: "4A7DB5" },
        paragraph: {
          spacing: { before: 200, after: 60 },
          outlineLevel: 2,
        },
      },
      title: {
        run: { font: "Georgia", size: 52, bold: true, color: "1B3A5C" },
      },
      listParagraph: {
        run: { font: "Calibri", size: 24 },
      },
    },
    paragraphStyles: [
      {
        id: "Subtitle",
        name: "Subtitle",
        basedOn: "Normal",
        run: { font: "Calibri", size: 28, color: "666666", italics: true },
        paragraph: { spacing: { after: 200 } },
      },
    ],
  },
  // ...
});
```

## Hyperlinks

### External Links

```javascript
new Paragraph({
  children: [
    new ExternalHyperlink({
      children: [
        new TextRun({ text: "Visit Website", style: "Hyperlink" }),
      ],
      link: "https://example.com",
    }),
  ],
});
```

### Internal Bookmarks

```javascript
// Create a bookmark target
new Paragraph({
  children: [
    new Bookmark({ id: "section1", children: [new TextRun("Section 1")] }),
  ],
});

// Link to it
new Paragraph({
  children: [
    new InternalHyperlink({
      children: [new TextRun({ text: "Go to Section 1", style: "Hyperlink" })],
      anchor: "section1",
    }),
  ],
});
```

## Common Patterns

### Cover Page

```javascript
// Cover page section (no header/footer)
{
  properties: {
    page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 2880, right: 1440, bottom: 2880, left: 1440 },
    },
    titlePage: true,
  },
  headers: { first: new Header({ children: [] }) },  // Empty header for cover
  footers: { first: new Footer({ children: [] }) },  // Empty footer for cover
  children: [
    // Optional cover image
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({ data: coverImage, transformation: { width: 468, height: 216 }, type: "png" }),
      ],
    }),
    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [
        new TextRun({ text: "Document Title", font: "Georgia", size: 56, bold: true, color: "1B3A5C" }),
      ],
    }),
    // Subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({ text: "Subtitle or Description", font: "Calibri", size: 28, color: "666666" }),
      ],
    }),
    // Date and Author
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [
        new TextRun({ text: "March 2026", font: "Calibri", size: 24, color: "888888" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Prepared by Author Name", font: "Calibri", size: 24, color: "888888" }),
      ],
    }),
  ],
}
```

### Callout / Highlight Box

```javascript
// Simulated callout box using a single-cell table with background
new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: "E8F0FE", type: ShadingType.CLEAR },
          margins: { top: 200, bottom: 200, left: 300, right: 300 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: "1B3A5C" },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: "1B3A5C" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "1B3A5C" },
            right: { style: BorderStyle.SINGLE, size: 2, color: "1B3A5C" },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Key Insight: ", bold: true, color: "1B3A5C" }),
                new TextRun("This is an important callout that should stand out from the body text."),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
});
```

### Horizontal Rule

```javascript
new Paragraph({
  border: {
    bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 },
  },
  spacing: { before: 200, after: 200 },
  children: [],
});
```

## Critical Pitfalls

1. **Size is in half-points** — `size: 24` = 12pt, `size: 36` = 18pt, `size: 48` = 24pt
2. **No `#` in hex colors** — `"1B3A5C"` not `"#1B3A5C"`
3. **DXA for page/table dimensions** — 1 inch = 1440 DXA, 1 cm = 567 DXA
4. **Always set WidthType.DXA** — tables default to auto width which is unreliable
5. **Set both `columnWidths` AND cell `width`** — both are needed for consistent rendering
6. **Never use `\n`** — always separate Paragraph objects for line breaks
7. **Always specify image `type`** — "png", "jpg", "gif"
8. **Spacing units are twips** — 1 point = 20 twips, so 12pt spacing = 240
9. **Line spacing 276 = 1.15x** — 240 = single, 360 = 1.5x, 480 = double
10. **outlineLevel on headings** — required for Table of Contents to work

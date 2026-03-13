# PptxGenJS API Reference

## Setup

```bash
npm install -g pptxgenjs
```

```javascript
const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";  // 10" × 5.625"
pres.author = "Author Name";
pres.title = "Presentation Title";

let slide = pres.addSlide();
// ... add content ...

await pres.writeFile({ fileName: "output.pptx" });
```

## Layout Dimensions

All coordinates are in inches.

| Layout | Width | Height |
|--------|-------|--------|
| `LAYOUT_16x9` | 10" | 5.625" |
| `LAYOUT_16x10` | 10" | 6.25" |
| `LAYOUT_4x3` | 10" | 7.5" |
| `LAYOUT_WIDE` | 13.3" | 7.5" |

---

## Text

```javascript
// Basic text
slide.addText("Hello", {
  x: 1, y: 1, w: 8, h: 1,
  fontSize: 24, fontFace: "Arial",
  color: "363636",
  bold: true,
  align: "center",   // "left", "center", "right"
  valign: "middle",   // "top", "middle", "bottom"
});

// Character spacing (NOT letterSpacing — that's silently ignored)
slide.addText("SPACED", { x: 1, y: 1, w: 8, h: 1, charSpacing: 6 });

// Rich text (mixed formatting in one text box)
slide.addText([
  { text: "Bold part ", options: { bold: true, fontSize: 20, color: "000000" } },
  { text: "Normal part", options: { fontSize: 16, color: "666666" } }
], { x: 1, y: 1, w: 8, h: 1 });

// Multi-line text (breakLine: true is REQUIRED between lines)
slide.addText([
  { text: "Line 1", options: { breakLine: true } },
  { text: "Line 2", options: { breakLine: true } },
  { text: "Line 3" }  // last item doesn't need breakLine
], { x: 0.5, y: 0.5, w: 8, h: 2 });

// Internal padding — set margin: 0 to align precisely with shapes/icons
slide.addText("Title", { x: 0.5, y: 0.3, w: 9, h: 0.6, margin: 0 });
```

---

## Bullet Lists

```javascript
// Bulleted list
slide.addText([
  { text: "First item", options: { bullet: true, breakLine: true } },
  { text: "Second item", options: { bullet: true, breakLine: true } },
  { text: "Third item", options: { bullet: true } }
], { x: 0.5, y: 0.5, w: 8, h: 3, fontSize: 16, color: "333333" });

// Sub-items (indented)
{ text: "Sub-item", options: { bullet: true, indentLevel: 1, breakLine: true } }

// Numbered list
{ text: "First", options: { bullet: { type: "number" }, breakLine: true } }
```

**NEVER use unicode "•" characters — they create double bullets.**

---

## Shapes

```javascript
// Rectangle
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 0.8, w: 4, h: 2,
  fill: { color: "FF0000" },
  line: { color: "000000", width: 2 }
});

// Oval
slide.addShape(pres.shapes.OVAL, { x: 4, y: 1, w: 2, h: 2, fill: { color: "0000FF" } });

// Line
slide.addShape(pres.shapes.LINE, {
  x: 1, y: 3, w: 5, h: 0,
  line: { color: "CCCCCC", width: 1, dashType: "dash" }
});

// Rounded rectangle (use ROUNDED_RECTANGLE, not RECTANGLE with rectRadius)
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" },
  rectRadius: 0.1
});

// With transparency
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "0088CC", transparency: 50 }
});

// With shadow
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" },
  shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15 }
});
```

### Shadow Properties

| Property | Type | Notes |
|----------|------|-------|
| `type` | `"outer"` or `"inner"` | |
| `color` | 6-char hex | No `#`, no 8-char hex |
| `blur` | 0–100 | Points |
| `offset` | 0–200 | **Must be non-negative** (negative corrupts file) |
| `angle` | 0–359 | 135 = bottom-right, 270 = upward |
| `opacity` | 0.0–1.0 | Use this, never encode in color string |

Available shapes: `RECTANGLE`, `OVAL`, `LINE`, `ROUNDED_RECTANGLE`

**Gradient fills are not supported.** Use a gradient image as background instead.

---

## Images

```javascript
// From file path
slide.addImage({ path: "chart.png", x: 1, y: 1, w: 5, h: 3 });

// From base64
slide.addImage({ data: "image/png;base64,iVBORw0KGgo...", x: 1, y: 1, w: 5, h: 3 });

// Sizing modes
slide.addImage({
  path: "photo.jpg", x: 1, y: 1, w: 5, h: 3,
  sizing: { type: "cover", w: 5, h: 3 }  // or "contain", "crop"
});

// Options: rotate, rounding (circular crop), transparency, flipH, flipV, altText, hyperlink
```

### Preserve Aspect Ratio

```javascript
const origW = 1920, origH = 1080, maxH = 3.0;
const calcW = maxH * (origW / origH);
const centerX = (10 - calcW) / 2;
slide.addImage({ path: "img.png", x: centerX, y: 1.2, w: calcW, h: maxH });
```

Supported formats: PNG, JPG, GIF, SVG (modern PowerPoint only)

---

## Icons (react-icons → PNG)

```javascript
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// Usage:
const { FaCheckCircle } = require("react-icons/fa");
const iconData = await iconToBase64Png(FaCheckCircle, "#4472C4", 256);
slide.addImage({ data: iconData, x: 1, y: 1, w: 0.5, h: 0.5 });
```

Use size 256+ for crisp icons. The size controls rasterization resolution, not display size on the slide.

Icon libraries: `react-icons/fa` (Font Awesome), `react-icons/md` (Material Design), `react-icons/hi` (Heroicons), `react-icons/bi` (Bootstrap Icons).

---

## Slide Backgrounds

```javascript
slide.background = { color: "1E2761" };                           // solid color
slide.background = { color: "FF3399", transparency: 50 };         // with transparency
slide.background = { data: "image/png;base64,iVBORw0KGgo..." };   // image
```

---

## Tables

```javascript
// Simple table
slide.addTable([
  ["Header 1", "Header 2", "Header 3"],
  ["Cell 1", "Cell 2", "Cell 3"]
], {
  x: 0.5, y: 1, w: 9, h: 2,
  border: { pt: 1, color: "CCCCCC" },
  fill: { color: "F5F5F5" },
  fontSize: 14,
  colW: [3, 3, 3]
});

// Styled cells
slide.addTable([
  [
    { text: "Header", options: { fill: { color: "1E2761" }, color: "FFFFFF", bold: true } },
    { text: "Value", options: { fill: { color: "1E2761" }, color: "FFFFFF", bold: true } }
  ],
  ["Row 1", "Data 1"],
  [{ text: "Merged", options: { colspan: 2 } }]
], { x: 0.5, y: 1, w: 9 });
```

---

## Charts

```javascript
// Bar/column chart
slide.addChart(pres.charts.BAR, [{
  name: "Sales",
  labels: ["Q1", "Q2", "Q3", "Q4"],
  values: [4500, 5500, 6200, 7100]
}], {
  x: 0.5, y: 1, w: 9, h: 4,
  barDir: "col",
  showTitle: true, title: "Quarterly Sales",
  chartColors: ["0D9488", "14B8A6", "5EEAD4"],
  showValue: true,
  dataLabelPosition: "outEnd",
  valGridLine: { color: "E2E8F0", size: 0.5 },
  catGridLine: { style: "none" },
  showLegend: false
});

// Line chart
slide.addChart(pres.charts.LINE, [{
  name: "Temperature",
  labels: ["Jan", "Feb", "Mar"],
  values: [32, 35, 42]
}], { x: 0.5, y: 1, w: 9, h: 4, lineSize: 3, lineSmooth: true });

// Pie chart
slide.addChart(pres.charts.PIE, [{
  name: "Market Share",
  labels: ["Product A", "Product B", "Other"],
  values: [35, 45, 20]
}], { x: 3, y: 1, w: 4, h: 4, showPercent: true });
```

Chart types: `BAR`, `LINE`, `PIE`, `DOUGHNUT`, `SCATTER`, `BUBBLE`, `RADAR`

Data label positions: `"outEnd"`, `"inEnd"`, `"center"`

Legend positions: `"b"`, `"t"`, `"l"`, `"r"`, `"tr"`

---

## Slide Masters (Reusable Layouts)

```javascript
pres.defineSlideMaster({
  title: "CONTENT_SLIDE",
  background: { color: "FFFFFF" },
  objects: [
    // Footer bar
    { rect: { x: 0, y: 5.125, w: 10, h: 0.5, fill: { color: "1E2761" } } },
    { text: {
      text: "Company Name",
      options: { x: 0.5, y: 5.2, w: 9, h: 0.3, fontSize: 10, color: "FFFFFF" }
    }},
    // Placeholder for title
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9, h: 0.8 } } }
  ]
});

let slide = pres.addSlide({ masterName: "CONTENT_SLIDE" });
slide.addText("My Title", { placeholder: "title" });
```

---

## Critical Pitfalls

These are the most common errors. Violating them corrupts the output file or causes visual bugs.

| # | Pitfall | Wrong | Right |
|---|---------|-------|-------|
| 1 | Hash in hex colors | `"#FF0000"` | `"FF0000"` |
| 2 | Opacity in hex string | `"00000020"` | `color: "000000", opacity: 0.12` |
| 3 | Unicode bullets | `"• Item"` | `bullet: true` |
| 4 | Missing breakLine | text runs together | `breakLine: true` between items |
| 5 | lineSpacing with bullets | excessive gaps | use `paraSpaceAfter` instead |
| 6 | Reusing option objects | mutated values on 2nd call | factory functions: `() => ({...})` |
| 7 | Negative shadow offset | corrupts file | always use positive offset + angle |
| 8 | ROUNDED_RECTANGLE + accent bars | corners not covered | use RECTANGLE instead |

### Factory Function Pattern (Pitfall #6)

PptxGenJS mutates option objects in place. Always use factory functions:

```javascript
// WRONG — second call gets already-mutated values
const shadow = { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 };
slide.addShape(pres.shapes.RECTANGLE, { shadow, x: 1, y: 1, w: 3, h: 2 });
slide.addShape(pres.shapes.RECTANGLE, { shadow, x: 5, y: 1, w: 3, h: 2 }); // CORRUPTED

// RIGHT — fresh object each time
const makeShadow = () => ({ type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 });
slide.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), x: 1, y: 1, w: 3, h: 2 });
slide.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), x: 5, y: 1, w: 3, h: 2 });
```

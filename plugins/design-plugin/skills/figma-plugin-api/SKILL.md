---
name: figma-plugin-api
description: >
  Automate Figma designs by executing Figma Plugin API commands in the browser via Playwright.
  Use when the user asks to create, modify, or inspect Figma elements programmatically — nodes, frames,
  components, auto-layout, styles, variables, or text. Requires Figma to be open in the browser.
  Use when the user says "create a frame in Figma", "add auto-layout", "update Figma styles",
  "generate components in Figma", "modify Figma design", "run Figma plugin code", or similar.
---

# Figma Plugin API — Browser Automation

Execute Figma Plugin API commands directly in the browser using Playwright's `mcp__playwright__browser_evaluate` tool. This enables programmatic creation and modification of Figma designs.

## When to Use

- User wants to create or modify Figma elements (frames, rectangles, text, components)
- User wants to apply auto-layout, styles, or constraints programmatically
- User wants to batch-create or batch-update design elements
- User wants to inspect or extract information from a Figma file in the browser
- User mentions "Figma Plugin API", "automate Figma", "script Figma"

## When NOT to Use

- User wants to read Figma file data without the browser open → use **figma-rest-api** skill
- User wants to extract design tokens from a Figma URL → use **design-tokens** skill
- User wants to add icons to Figma → use **icon-library** skill first to get SVG, then this skill to insert it

## Prerequisites

1. Figma must be open in a browser tab (not the desktop app)
2. The user must have a Figma file open with edit access
3. The Figma Plugin API console must be accessible (use the Plugin Developer Console or run a local plugin)

### Accessing the Plugin Console

To run Plugin API code in the browser, the user needs to open the **Developer Console** in Figma:

1. Open the Figma file in the browser
2. Go to **Menu → Plugins → Development → Open console** (or use the Plugin API directly via a dev plugin)
3. Alternatively, the user can create a minimal plugin that exposes an eval endpoint

For Playwright automation, navigate to the Figma file URL first:
```
mcp__playwright__browser_navigate → https://www.figma.com/design/<file-key>/...
```

Then use `mcp__playwright__browser_evaluate` to execute Plugin API code.

## Figma Plugin API Reference

### Global Object: `figma`

The `figma` global object is the entry point for all plugin operations.

### Node Creation

| Method | Description |
|---|---|
| `figma.createFrame()` | Create a new frame |
| `figma.createRectangle()` | Create a rectangle |
| `figma.createEllipse()` | Create an ellipse |
| `figma.createLine()` | Create a line |
| `figma.createText()` | Create a text node |
| `figma.createComponent()` | Create a component |
| `figma.createComponentSet()` | Create a component set (variants) |
| `figma.createPage()` | Create a new page |
| `figma.createBooleanOperation()` | Create boolean operation |
| `figma.createNodeFromSvg(svgString)` | **Create a node from SVG string** — use this for icons |
| `figma.createImage(bytes)` | Create an image from bytes |
| `figma.group(nodes, parent)` | Group nodes together |
| `figma.flatten(nodes)` | Flatten nodes |
| `figma.union(nodes, parent)` | Boolean union |
| `figma.subtract(nodes, parent)` | Boolean subtract |
| `figma.intersect(nodes, parent)` | Boolean intersect |

### Node Properties (Common)

| Property | Type | Description |
|---|---|---|
| `node.name` | string | Node name |
| `node.x`, `node.y` | number | Position |
| `node.width`, `node.height` | number | Size (use `node.resize(w, h)` to set) |
| `node.rotation` | number | Rotation in degrees |
| `node.opacity` | number | 0 to 1 |
| `node.visible` | boolean | Visibility |
| `node.locked` | boolean | Lock state |
| `node.fills` | Paint[] | Fill paints array |
| `node.strokes` | Paint[] | Stroke paints array |
| `node.strokeWeight` | number | Stroke weight |
| `node.cornerRadius` | number | Corner radius |
| `node.effects` | Effect[] | Effects (shadows, blur) |
| `node.constraints` | Constraints | Layout constraints |
| `node.layoutMode` | string | Auto-layout: `"NONE"`, `"HORIZONTAL"`, `"VERTICAL"` |

### Auto-Layout Properties

| Property | Type | Description |
|---|---|---|
| `node.layoutMode` | `"HORIZONTAL" \| "VERTICAL"` | Auto-layout direction |
| `node.primaryAxisSizingMode` | `"FIXED" \| "AUTO"` | Width/height sizing |
| `node.counterAxisSizingMode` | `"FIXED" \| "AUTO"` | Cross-axis sizing |
| `node.primaryAxisAlignItems` | `"MIN" \| "CENTER" \| "MAX" \| "SPACE_BETWEEN"` | Main axis alignment |
| `node.counterAxisAlignItems` | `"MIN" \| "CENTER" \| "MAX"` | Cross axis alignment |
| `node.paddingTop/Right/Bottom/Left` | number | Padding |
| `node.itemSpacing` | number | Gap between items |

### Text Properties

```javascript
// Must load font before setting characters
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
const text = figma.createText();
text.characters = "Hello World";
text.fontSize = 16;
text.fontName = { family: "Inter", style: "Bold" };
text.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
text.textAlignHorizontal = "CENTER"; // "LEFT", "CENTER", "RIGHT", "JUSTIFIED"
text.textAlignVertical = "CENTER";   // "TOP", "CENTER", "BOTTOM"
text.lineHeight = { value: 24, unit: "PIXELS" }; // or "PERCENT", "AUTO"
```

### Color / Paint

Colors in Figma use 0-1 range (not 0-255):

```javascript
// Solid fill
node.fills = [{
  type: "SOLID",
  color: { r: 0.2, g: 0.4, b: 1.0 },
  opacity: 1
}];

// Gradient fill
node.fills = [{
  type: "GRADIENT_LINEAR",
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]]
}];
```

### Finding Nodes

```javascript
// By ID
const node = figma.getNodeById("123:456");

// By name (searches current page)
const nodes = figma.currentPage.findAll(n => n.name === "Button");
const node = figma.currentPage.findOne(n => n.name === "Header");

// By type
const allText = figma.currentPage.findAll(n => n.type === "TEXT");
const allFrames = figma.currentPage.findAll(n => n.type === "FRAME");

// Current selection
const selected = figma.currentPage.selection;
```

### Viewport

```javascript
// Zoom to fit nodes
figma.viewport.scrollAndZoomIntoView(nodes);

// Get/set viewport
const { x, y, width, height } = figma.viewport.bounds;
figma.viewport.center = { x: 100, y: 200 };
figma.viewport.zoom = 0.5;
```

### Styles

```javascript
// Create paint style
const style = figma.createPaintStyle();
style.name = "Primary/Blue";
style.paints = [{ type: "SOLID", color: { r: 0, g: 0.4, b: 1 } }];

// Create text style
const textStyle = figma.createTextStyle();
textStyle.name = "Heading/H1";
textStyle.fontSize = 32;
textStyle.fontName = { family: "Inter", style: "Bold" };

// Apply style
node.fillStyleId = style.id;
textNode.textStyleId = textStyle.id;
```

### Variables (Design Tokens)

```javascript
// Create variable collection
const collection = figma.variables.createVariableCollection("Colors");

// Create variable
const variable = figma.variables.createVariable("primary", collection.id, "COLOR");
variable.setValueForMode(collection.defaultModeId, { r: 0, g: 0.4, b: 1, a: 1 });

// Bind variable to node
node.setBoundVariable("fills", 0, variable.id);
```

## Common Patterns

### Create a card component

```javascript
// Create card frame with auto-layout
const card = figma.createFrame();
card.name = "Card";
card.resize(320, 200);
card.layoutMode = "VERTICAL";
card.paddingTop = card.paddingRight = card.paddingBottom = card.paddingLeft = 16;
card.itemSpacing = 12;
card.primaryAxisSizingMode = "AUTO";
card.cornerRadius = 12;
card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
card.effects = [{
  type: "DROP_SHADOW",
  color: { r: 0, g: 0, b: 0, a: 0.1 },
  offset: { x: 0, y: 2 },
  radius: 8,
  visible: true,
  blendMode: "NORMAL"
}];

// Add title
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
const title = figma.createText();
title.characters = "Card Title";
title.fontSize = 18;
title.fontName = { family: "Inter", style: "Bold" };
card.appendChild(title);

// Add description
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
const desc = figma.createText();
desc.characters = "Card description text goes here.";
desc.fontSize = 14;
desc.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
card.appendChild(desc);

figma.currentPage.appendChild(card);
```

### Insert SVG icon into Figma

```javascript
// Use figma.createNodeFromSvg() — this is the BEST way to add icons
const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
const iconNode = figma.createNodeFromSvg(svgString);
iconNode.name = "Icon/Circle";
iconNode.resize(24, 24);
figma.currentPage.appendChild(iconNode);
```

### Batch-create a color palette

```javascript
const colors = [
  { name: "Blue/50", hex: "#EFF6FF" },
  { name: "Blue/100", hex: "#DBEAFE" },
  { name: "Blue/500", hex: "#3B82F6" },
  { name: "Blue/900", hex: "#1E3A8A" },
];

function hexToFigma(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

const frame = figma.createFrame();
frame.name = "Color Palette";
frame.layoutMode = "HORIZONTAL";
frame.itemSpacing = 8;
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "AUTO";

for (const c of colors) {
  const swatch = figma.createFrame();
  swatch.name = c.name;
  swatch.resize(80, 80);
  swatch.cornerRadius = 8;
  swatch.fills = [{ type: "SOLID", color: hexToFigma(c.hex) }];
  frame.appendChild(swatch);
}

figma.currentPage.appendChild(frame);
```

## Important Notes

- **Always use `await` with async methods** like `loadFontAsync`, `getNodeByIdAsync`
- **Colors use 0-1 range**, not 0-255. Convert with `value / 255`
- **Resize uses `node.resize(w, h)`**, not setting width/height directly
- **Append to parent** — newly created nodes must be appended: `parent.appendChild(node)`
- **Font loading is required** before setting text `characters` or `fontName`
- **SVG insertion** — always use `figma.createNodeFromSvg()` for icons, never try to draw icons manually with shapes
- **Selection** — set `figma.currentPage.selection = [node]` to select created elements

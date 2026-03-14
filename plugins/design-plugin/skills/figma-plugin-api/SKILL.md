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
- User provides a Figma URL and describes what should be created or changed
- User asks to "design something in Figma"

## When NOT to Use

- User wants to read Figma file data without the browser open → use **figma-rest-api** skill
- User wants to extract design tokens from a Figma URL → use **design-tokens** skill
- User wants to add icons to Figma → use **icon-library** skill first to get SVG, then this skill to insert it

## Rules of Engagement

- **Always explain in plain English what you are about to do.** Assume the user cannot read code.
- **Do NOT try alternative solutions** like using the REST API or manually interacting with the Figma UI. Always use the Plugin API via `evaluate_script`.
- **Do NOT try to draw icons manually** with basic shapes. Always fetch pre-made SVGs from icon libraries (see **icon-library** skill) and insert with `figma.createNodeFromSvg()`.

## Creative Design Philosophy

**Make designs alive, modern, and visually rich. Don't be boring.**

### Use Media — Images, Video, Music

Designs should not be flat wireframes with grey boxes. Use the **media-plugin** to generate real visual content:

- **Images** — generate hero images, background visuals, product photos, illustrations, and placeholder images using `mcp__media-mcp__generate_image`. Use actual generated images instead of empty rectangles.
- **Videos / GIFs / Animations** — for hero sections, product demos, onboarding flows, or loading states, generate video/GIF content using `mcp__media-mcp__generate_video`. Place video thumbnails or animated previews in the design.
- **Music / Audio** — when designing media players, podcast UIs, or audio experiences, generate sample audio using `mcp__media-mcp__generate_music` or `mcp__media-mcp__generate_speech` so the design has real content to reference.

After generating media assets, insert them into Figma as image fills:
```javascript
// Insert a generated image into a frame
const imageData = await figma.createImageAsync(imageUrl);
frame.fills = [{ type: "IMAGE", imageHash: imageData.hash, scaleMode: "FILL" }];
```

### Use Icons Everywhere

Icons make UI feel professional and intuitive. **Always use the icon-library skill** to fetch real SVG icons from Lucide, Heroicons, or Tabler. Use icons for:
- Navigation items (home, search, settings, profile)
- Action buttons (edit, delete, share, download)
- Status indicators (check, alert, info, warning)
- Feature cards and list items
- Empty states and placeholders

### Be Creative

- Use **gradients** instead of flat colors for hero sections and CTAs
- Add **shadows and depth** — cards should feel elevated, not flat
- Use **rounded corners** generously — modern UIs use 8-16px radii
- Apply **micro-interactions hints** — show hover states, focus rings, transitions
- Use **rich typography** — mix font weights, sizes, and colors for hierarchy
- Add **visual rhythm** — vary section heights, use whitespace intentionally

## Design Language Page — CREATE THIS FIRST

**When creating a new design from scratch**, always start by creating a dedicated **"Design Language"** page in the Figma file. This page defines the visual foundation that all other pages must follow.

### Step 0 (before any other design work): Create the Design Language page

```javascript
const designLanguagePage = figma.createPage();
designLanguagePage.name = "🎨 Design Language";
```

The Design Language page must include these sections:

#### 1. Color Palette
- Primary, secondary, accent colors (with full scales: 50-950)
- Neutral/gray scale
- Semantic colors: success, warning, error, info
- Create as Figma Paint Styles (`figma.createPaintStyle()`) so they can be reused across all pages

#### 2. Typography Scale
- Heading styles: H1 through H6 (with font family, size, weight, line-height)
- Body text: large, base, small, caption
- Create as Figma Text Styles (`figma.createTextStyle()`) for reuse

#### 3. Spacing & Grid
- Spacing scale visualization (4px grid: 4, 8, 12, 16, 24, 32, 48, 64)
- Layout grid definition (columns, gutters, margins)

#### 4. Effects
- Shadow scale: sm, base, md, lg, xl
- Create as Figma Effect Styles (`figma.createEffectStyle()`)
- Border radius scale: sm (4px), base (8px), md (12px), lg (16px), xl (24px), full (9999px)

#### 5. Icon Set
- Fetch and display the core icons needed for the project using the **icon-library** skill
- Organize in a grid showing icon name + visual

#### 6. Core UI Components
- Buttons (primary, secondary, outline, ghost — with states: default, hover, disabled)
- Input fields (text, select, checkbox, radio, toggle)
- Cards, badges, tags, avatars
- Build as Figma Components (`figma.createComponent()`) so instances can be used across pages

After the Design Language page is complete, **all subsequent pages must use these defined styles, colors, components, and icons**. Never introduce one-off values — always reference the design language.

## Execution Strategy — Chunked Scripts + Helper Library

### Why Chunked Execution

**Never write monolithic scripts.** Long scripts are slow, hard to debug, and if they fail halfway through you lose everything. Instead:

- Break work into **small chunks of max 5 UI elements** (~15-30 lines each)
- Execute each chunk via a separate `mcp__playwright__browser_evaluate` call
- Verify after critical sections with `mcp__playwright__browser_snapshot`
- If a chunk fails, only that small piece needs to be retried

### Script Size Guidelines

| Script type       | Target lines | Example                              |
|-------------------|-------------|---------------------------------------|
| Page setup        | 3–5         | Create page, set background           |
| Navigation bar    | 15–25       | Frame + logo + links + avatar         |
| Card grid         | 20–30       | Loop creating N cards in auto-layout  |
| Form section      | 15–25       | Labels + inputs + button              |
| Table             | 20–30       | Header row + data rows in loop        |
| Single component  | 10–15       | One button, one card, one input       |

**Rule of thumb:** If a script is over 30 lines, split it.

### Helper Functions Library — INJECT FIRST

Before any design work, inject this utility library into the Figma console via `mcp__playwright__browser_evaluate`. This cuts script length by ~60% and makes all subsequent scripts faster and more readable.

```javascript
window.__fh = {
  // Create a frame (auto-layout container)
  frame: (name, opts = {}) => {
    const f = figma.createFrame();
    f.name = name;
    f.resize(opts.w || 1440, opts.h || 900);
    if (opts.fill) f.fills = [{ type: 'SOLID', color: opts.fill }];
    if (opts.radius) f.cornerRadius = opts.radius;
    if (opts.autoLayout || opts.direction) {
      f.layoutMode = opts.direction || 'VERTICAL';
      f.primaryAxisSizingMode = opts.mainSize || 'AUTO';
      f.counterAxisSizingMode = opts.crossSize || 'FIXED';
      f.itemSpacing = opts.gap || 0;
      f.paddingTop = opts.py || opts.p || 0;
      f.paddingBottom = opts.py || opts.p || 0;
      f.paddingLeft = opts.px || opts.p || 0;
      f.paddingRight = opts.px || opts.p || 0;
    }
    if (opts.effects) f.effects = opts.effects;
    if (opts.parent) opts.parent.appendChild(f);
    else figma.currentPage.appendChild(f);
    return f;
  },

  // Create text node
  txt: async (content, opts = {}) => {
    const t = figma.createText();
    await figma.loadFontAsync({ family: opts.font || 'Inter', style: opts.style || 'Regular' });
    t.characters = content;
    t.fontSize = opts.size || 16;
    t.fontName = { family: opts.font || 'Inter', style: opts.style || 'Regular' };
    if (opts.fill) t.fills = [{ type: 'SOLID', color: opts.fill }];
    if (opts.align) t.textAlignHorizontal = opts.align;
    if (opts.lineHeight) t.lineHeight = { value: opts.lineHeight, unit: 'PIXELS' };
    if (opts.parent) opts.parent.appendChild(t);
    return t;
  },

  // Create rectangle
  rect: (opts = {}) => {
    const r = figma.createRectangle();
    r.name = opts.name || 'Rectangle';
    r.resize(opts.w || 100, opts.h || 100);
    if (opts.fill) r.fills = [{ type: 'SOLID', color: opts.fill }];
    if (opts.radius) r.cornerRadius = opts.radius;
    if (opts.parent) opts.parent.appendChild(r);
    return r;
  },

  // Insert SVG icon (from icon-library fetch)
  icon: (svgString, opts = {}) => {
    const node = figma.createNodeFromSvg(svgString);
    node.name = opts.name || 'Icon';
    node.resize(opts.size || 24, opts.size || 24);
    if (opts.parent) opts.parent.appendChild(node);
    return node;
  },

  // RGB shorthand (accepts 0-255, converts to Figma 0-1 range)
  rgb: (r, g, b) => ({ r: r/255, g: g/255, b: b/255 }),

  // Hex to Figma color
  hex: (h) => {
    const r = parseInt(h.slice(1, 3), 16) / 255;
    const g = parseInt(h.slice(3, 5), 16) / 255;
    const b = parseInt(h.slice(5, 7), 16) / 255;
    return { r, g, b };
  },

  // Drop shadow shorthand
  shadow: (x, y, radius, opacity) => [{
    type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: opacity || 0.1 },
    offset: { x: x || 0, y: y || 2 }, radius: radius || 8,
    visible: true, blendMode: 'NORMAL'
  }],

  // Find node by name in current page
  find: (name) => figma.currentPage.findOne(n => n.name === name),

  // Find all nodes by name pattern
  findAll: (pattern) => figma.currentPage.findAll(n => n.name.includes(pattern)),

  // Switch page by name (create if missing)
  page: (name) => {
    let p = figma.root.children.find(c => c.name === name);
    if (!p) { p = figma.createPage(); p.name = name; }
    figma.currentPage = p;
    return p;
  },

  // Batch load fonts
  fonts: async (...styles) => {
    for (const s of styles) {
      await figma.loadFontAsync({ family: s[0] || 'Inter', style: s[1] || 'Regular' });
    }
  }
};
'helpers injected'
```

### Using Helpers in Scripts

After injection, all subsequent scripts become much shorter:

```javascript
// WITHOUT helpers (verbose, ~20 lines)
const card = figma.createFrame();
card.name = "Card";
card.resize(320, 200);
card.layoutMode = "VERTICAL";
card.paddingTop = 16; card.paddingBottom = 16;
card.paddingLeft = 16; card.paddingRight = 16;
card.itemSpacing = 12;
card.primaryAxisSizingMode = "AUTO";
card.cornerRadius = 12;
card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
card.effects = [{ type: "DROP_SHADOW", color: { r:0, g:0, b:0, a:0.1 }, offset: { x:0, y:2 }, radius: 8, visible: true, blendMode: "NORMAL" }];
figma.currentPage.appendChild(card);
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
const title = figma.createText();
title.characters = "Card Title";
title.fontSize = 18;
title.fontName = { family: "Inter", style: "Bold" };
card.appendChild(title);

// WITH helpers (~5 lines)
const card = __fh.frame('Card', { w: 320, h: 200, direction: 'VERTICAL', p: 16, gap: 12, radius: 12, fill: __fh.rgb(255,255,255), effects: __fh.shadow(0, 2, 8, 0.1) });
await __fh.txt('Card Title', { size: 18, style: 'Bold', parent: card });
```

### Chunked Execution Order

For any multi-section design, follow this execution order:

1. **Inject helpers** (1 call)
2. **Batch load fonts** (1 call): `await __fh.fonts(['Inter','Regular'], ['Inter','Bold'], ['Inter','Semi Bold'])`
3. **Create page** (1 call): `__fh.page('Dashboard')`
4. **Section by section** (1 call each, max 30 lines):
   - Header/nav
   - Hero section
   - Content sections
   - Footer
5. **Verify** (snapshot after each page)

### Multi-Page Designs — Parallel Planning

For designs with multiple pages, use **parallel subagent planning**:

- Planning is parallelizable (each page can be planned independently)
- Execution is sequential (single browser connection)
- Spawn one Agent per page to generate scripts in parallel
- Collect all scripts, then execute sequentially

```
Orchestrator:
  1. Create master plan (pages + sections)
  2. Spawn Agent per page → each returns array of scripts
  3. Execute all scripts sequentially via browser_evaluate
  4. Verify after each page
```

Each subagent receives:
- The design system tokens (from Design Language page)
- That page's section list
- Instruction to use `__fh` helpers
- Instruction to keep scripts <30 lines

## Connection Workflow — FOLLOW THESE STEPS EVERY TIME

### Step 1: Navigate to Figma

Use `mcp__playwright__browser_navigate` to go to the Figma file URL.

- If the user provided a Figma URL → navigate directly to it
- If no URL → navigate to `https://www.figma.com/` and ask the user to open a specific design file

Then prompt the user to **log in** if they are not already logged in.

### Step 2: Verify `figma` global access

Use `mcp__playwright__browser_evaluate` to confirm you have access to the `figma` global object:

```javascript
typeof figma !== 'undefined' ? 'connected' : 'not connected'
```

- If `"connected"` → proceed to Step 3
- If `"not connected"` or `"figma is not defined"` → see **Troubleshooting** below

### Step 3: Execute the user's request

Use `mcp__playwright__browser_evaluate` to run JavaScript code that interacts with the Figma Plugin API. Perform tasks such as creating shapes, modifying properties, applying styles, or extracting information.

Always explain what you're about to do before executing.

## Troubleshooting

If `figma` is not defined:

1. **Check permissions** — make sure the user has **edit access** to the file and permission to run plugins. If they don't, suggest **creating a new branch** on the file (which grants edit access).
2. **Open and close any plugin** — there is a known bug where the `figma` global is not available until a plugin has been opened at least once in the file. Instruct the user to:
   - Go to **Menu → Plugins → Find more plugins**
   - Open any plugin (e.g., a simple utility plugin)
   - Close the plugin
   - Then try again
3. If it still doesn't work, ask the user to **refresh the page** and repeat steps 1-2.

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

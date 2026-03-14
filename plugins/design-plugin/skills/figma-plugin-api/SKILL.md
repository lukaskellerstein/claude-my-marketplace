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

Execute Figma Plugin API commands directly in the browser using Playwright's `mcp__design-playwright__browser_evaluate` tool. This enables programmatic creation and modification of Figma designs.

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

### Use Real Images — MANDATORY

**Every design MUST include real images.** No grey placeholder boxes. No empty frames. Use real visual content.

**Image sourcing priority (follow this order):**

1. **Unsplash first** — search for high-quality stock photos using WebSearch/WebFetch. Unsplash images are free and high-quality. Use direct image URLs.
   ```
   WebSearch: "site:unsplash.com {subject} photo"
   ```
   Then download via:
   ```bash
   curl -sL "https://images.unsplash.com/photo-{id}?w=1440&q=80" -o image.jpg
   ```

2. **Pexels / Pixabay fallback** — if Unsplash doesn't have what you need:
   ```
   WebSearch: "site:pexels.com {subject} photo"
   WebSearch: "site:pixabay.com {subject}"
   ```

3. **AI generation last resort** — only when stock photos can't match the need (custom illustrations, specific compositions, fantasy/concept art). Use `mcp__media-mcp__generate_image`.

**Where to use images:**
- Hero sections — always a full-width background image
- Product/feature cards — each card should have a relevant image
- Team/about sections — portrait photos
- Testimonial sections — user avatars
- Gallery sections — multiple images in a grid
- Backgrounds — subtle patterns or blurred images behind content

**Insert images into Figma:**
```javascript
// Using __fh helper
const hash = await __fh.loadImage('https://images.unsplash.com/photo-xxx?w=1440&q=80');
frame.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];

// Or use the imageFrame helper
await __fh.imageFrame('Hero', { url: 'https://...', w: 1440, h: 400, parent: container });
```

### Use Videos / GIFs Occasionally

Add videos/GIFs where they bring **design value** — don't force them everywhere:

- **Hero sections** with motion → generate via `mcp__media-mcp__generate_video`
- **Product demos** — short animated previews
- **Onboarding flows** — step animations
- **Loading/transition states** — micro-animations
- **Background videos** — subtle ambient motion

Use video thumbnails as image fills in Figma with a play button overlay.

### Music / Audio

When designing media players, podcast UIs, or audio experiences, generate sample audio using `mcp__media-mcp__generate_music` or `mcp__media-mcp__generate_speech`.

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
- Execute each chunk via a separate `mcp__design-playwright__browser_evaluate` call
- Verify after critical sections with `mcp__design-playwright__browser_snapshot`
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

Before any design work, **read and inject the helper library from the scripts directory**:

1. **Read the file**: `Read → skills/figma-plugin-api/scripts/helpers.js`
2. **Inject into browser**: `mcp__design-playwright__browser_evaluate` → paste the file contents

This injects `window.__fh` with all helper functions. It cuts script length by ~60%.

**The script file is at:** `skills/figma-plugin-api/scripts/helpers.js`

**Available helpers after injection:**

| Helper | Description | Example |
|---|---|---|
| `__fh.frame(name, opts)` | Create frame with auto-layout | `__fh.frame('Card', { w: 320, direction: 'VERTICAL', p: 16, gap: 12 })` |
| `__fh.comp(name, opts)` | Create reusable Component | `__fh.comp('Button', { direction: 'HORIZONTAL', p: 12 })` |
| `__fh.txt(content, opts)` | Create text (async, loads font) | `await __fh.txt('Hello', { size: 24, style: 'Bold' })` |
| `__fh.rect(opts)` | Create rectangle | `__fh.rect({ w: 200, h: 100, fill: __fh.hex('#F00'), radius: 8 })` |
| `__fh.circle(opts)` | Create ellipse/circle | `__fh.circle({ size: 48, fill: __fh.hex('#3B82F6') })` |
| `__fh.line(opts)` | Create line/divider | `__fh.line({ w: 300, color: __fh.hex('#E5E7EB') })` |
| `__fh.icon(svg, opts)` | Insert SVG icon | `__fh.icon(svgString, { name: 'Icon/Search', size: 24 })` |
| `__fh.recolor(node, color)` | Recolor SVG icon | `__fh.recolor(iconNode, __fh.hex('#FFF'))` |
| `__fh.loadImage(url)` | Load image → hash | `const hash = await __fh.loadImage('https://...')` |
| `__fh.imageFrame(name, opts)` | Frame with image fill | `await __fh.imageFrame('Hero', { url: '...', w: 1440, h: 400 })` |
| `__fh.rgb(r, g, b)` | 0-255 → Figma color | `__fh.rgb(59, 130, 246)` |
| `__fh.hex(h)` | Hex → Figma color | `__fh.hex('#3B82F6')` |
| `__fh.gradient(hex1, hex2)` | Linear gradient fill | `__fh.gradient('#1E3A8A', '#3B82F6')` |
| `__fh.shadow(x, y, r, a)` | Drop shadow effect | `__fh.shadow(0, 4, 12, 0.15)` |
| `__fh.shadowMd()` | Medium elevation | Card shadow |
| `__fh.shadowLg()` | Large elevation | Modal shadow |
| `__fh.paintStyle(name, color)` | Create Paint Style | `__fh.paintStyle('Primary/500', __fh.hex('#3B82F6'))` |
| `__fh.textStyle(name, opts)` | Create Text Style (async) | `await __fh.textStyle('Heading/H1', { size: 36, style: 'Bold' })` |
| `__fh.effectStyle(name, fx)` | Create Effect Style | `__fh.effectStyle('Shadow/md', __fh.shadowMd())` |
| `__fh.find(name)` | Find node by exact name | `__fh.find('Header')` |
| `__fh.findAll(pattern)` | Find nodes by name pattern | `__fh.findAll('Card')` |
| `__fh.page(name)` | Switch/create page | `__fh.page('Dashboard')` |
| `__fh.fonts(...styles)` | Batch load fonts (async) | `await __fh.fonts(['Inter','Regular'], ['Inter','Bold'])` |
| `__fh.zoomTo(nodes)` | Zoom viewport to nodes | `__fh.zoomTo(frame)` |
| `__fh.select(nodes)` | Select nodes | `__fh.select([card1, card2])` |

### Verification Script

After completing a page, **read and run the verification script**:

1. **Read**: `Read → skills/figma-plugin-api/scripts/verify.js`
2. **Execute**: `mcp__design-playwright__browser_evaluate` → paste contents

Returns a stats object with issue detection (overlapping frames, unnamed nodes, empty text, tiny elements).

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

### Multi-Page Designs — Parallel Subagent Architecture

For multi-page designs, **parallelize planning AND asset gathering** across subagents. Only Figma execution is sequential (single browser).

```
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (main session)                            │
│                                                         │
│  1. Create master plan (pages + sections)               │
│  2. Execute Design Language page (sequential, in Figma) │
│  3. Spawn parallel Agents — one per page:               │
│     Each agent:                                         │
│     a. Searches Unsplash for all images needed          │
│     b. Fetches all icons from Lucide/Heroicons          │
│     c. Generates AI images if stock not found           │
│     d. Returns structured scripts array with assets     │
│  4. Collect results from all agents                     │
│  5. Execute all scripts sequentially in Figma           │
│  6. Run verify.js after each page                       │
└─────────────────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ Agent A  │   │ Agent B  │   │ Agent C  │
    │ Dashboard│   │ Settings │   │ Analytics│
    │ planning │   │ planning │   │ planning │
    │ + assets │   │ + assets │   │ + assets │
    └─────────┘    └─────────┘    └─────────┘
    (parallel)     (parallel)     (parallel)
```

**How to spawn parallel agents** — use the Agent tool with multiple calls in a single message:

Each agent receives:
- The design system tokens (from Design Language page)
- That page's section list with descriptions
- Instruction to use `__fh` helpers (reference the helpers.js API table above)
- Instruction to keep scripts <30 lines each
- Instruction to search Unsplash first for all images, fetch icons from Lucide
- **Must return**: array of script strings + list of image URLs + list of icon SVGs

**Key insight:** Each agent spends most of its time on WebSearch/WebFetch for images and icons — this is the real parallelism win. Script generation is fast, but searching for 5-10 images per page takes time. Running 3 agents in parallel = 3x faster asset gathering.

## Connection Workflow — FOLLOW THESE STEPS EVERY TIME

### Step 1: Navigate to Figma

Use `mcp__design-playwright__browser_navigate` to go to the Figma file URL.

- If the user provided a Figma URL → navigate directly to it
- If no URL → navigate to `https://www.figma.com/` and ask the user to open a specific design file

Then prompt the user to **log in** if they are not already logged in.

### Step 2: Verify `figma` global access

Use `mcp__design-playwright__browser_evaluate` to confirm you have access to the `figma` global object:

```javascript
typeof figma !== 'undefined' ? 'connected' : 'not connected'
```

- If `"connected"` → proceed to Step 3
- If `"not connected"` or `"figma is not defined"` → see **Troubleshooting** below

### Step 3: Execute the user's request

Use `mcp__design-playwright__browser_evaluate` to run JavaScript code that interacts with the Figma Plugin API. Perform tasks such as creating shapes, modifying properties, applying styles, or extracting information.

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

## Common Patterns (using __fh helpers)

### Card with image, icon, and text

```javascript
const card = __fh.frame('Card', { w: 320, direction: 'VERTICAL', radius: 12, fill: __fh.hex('#FFF'), effects: __fh.shadowMd(), clip: true });
// Image from Unsplash
await __fh.imageFrame('CardImage', { url: 'https://images.unsplash.com/photo-xxx?w=640&q=80', w: 320, h: 180, parent: card });
const content = __fh.frame('CardContent', { w: 320, direction: 'VERTICAL', p: 16, gap: 8, parent: card });
await __fh.txt('Card Title', { size: 18, style: 'Bold', parent: content });
await __fh.txt('Description text goes here.', { size: 14, fill: __fh.hex('#6B7280'), parent: content });
```

### Icon + text row (nav item, list item)

```javascript
const row = __fh.frame('NavItem', { direction: 'HORIZONTAL', gap: 12, py: 8, px: 16, crossAlign: 'CENTER', parent: nav });
__fh.icon(searchSvg, { name: 'Icon/Search', size: 20, parent: row });
await __fh.txt('Search', { size: 14, fill: __fh.hex('#374151'), parent: row });
```

### Color palette with Paint Styles

```javascript
const colors = [['Blue/50','#EFF6FF'], ['Blue/500','#3B82F6'], ['Blue/900','#1E3A8A']];
const row = __fh.frame('Colors', { direction: 'HORIZONTAL', gap: 8, mainSize: 'AUTO', crossSize: 'AUTO' });
for (const [name, hex] of colors) {
  __fh.paintStyle(name, __fh.hex(hex)); // Creates reusable Figma style
  __fh.frame(name, { w: 80, h: 80, radius: 8, fill: __fh.hex(hex), parent: row });
}
```

### Hero section with Unsplash background + gradient overlay

```javascript
const hero = __fh.frame('Hero', { w: 1440, h: 500, direction: 'VERTICAL', p: 64, mainAlign: 'CENTER', clip: true });
const hash = await __fh.loadImage('https://images.unsplash.com/photo-xxx?w=1440&q=80');
hero.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];
// Dark overlay for text readability
const overlay = __fh.rect({ name: 'Overlay', w: 1440, h: 500, fill: __fh.rgb(0,0,0), parent: hero });
overlay.opacity = 0.4;
await __fh.txt('Welcome to Our Platform', { size: 48, style: 'Bold', fill: __fh.hex('#FFF'), parent: hero });
```

## Important Notes

- **Always use `await` with async methods** like `loadFontAsync`, `getNodeByIdAsync`
- **Colors use 0-1 range**, not 0-255. Convert with `value / 255`
- **Resize uses `node.resize(w, h)`**, not setting width/height directly
- **Append to parent** — newly created nodes must be appended: `parent.appendChild(node)`
- **Font loading is required** before setting text `characters` or `fontName`
- **SVG insertion** — always use `figma.createNodeFromSvg()` for icons, never try to draw icons manually with shapes
- **Selection** — set `figma.currentPage.selection = [node]` to select created elements

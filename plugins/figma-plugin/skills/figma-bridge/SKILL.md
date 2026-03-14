---
name: figma-bridge
description: >
  Use for ANY manipulation of Figma designs — creating, modifying, inspecting, or automating
  anything in a Figma file via the browser. This is the primary skill for all Figma design work.
  Requires the Figma Bridge Chrome extension (provides __figb and __figs globals) and Figma
  open in the browser. Use when the user says "create in Figma", "design in Figma", "modify Figma",
  "add to Figma", "build a layout", "make a component", "update styles", or ANY Figma-related
  design task. Also covers icons, images, typography, auto-layout, gradients, shadows, and
  design system creation.
---

# Figma Bridge — Browser Automation

Create and manipulate Figma designs directly in the browser using the **Figma Bridge** Chrome extension and Playwright's `mcp__design-playwright__browser_evaluate` tool. The extension auto-injects `__figb` (helpers) and `__figs` (status panel) into every Figma page.

## When to Use

- **ANY manipulation of a Figma design** — this is the go-to skill for all Figma work
- User wants to create or modify elements (frames, rectangles, text, components, icons, images)
- User wants to apply auto-layout, styles, effects, gradients, or constraints
- User wants to batch-create or batch-update design elements
- User wants to build a design system, component library, or full page layout
- User wants to inspect or extract information from a Figma file in the browser
- User provides a Figma URL and describes what should be created or changed
- User asks to "design something", "create a layout", "build a page", "make a component"

## When NOT to Use

- User wants to read Figma file data without the browser open → use **figma-rest-api** skill
- User wants to extract design tokens from a Figma URL → use **design-tokens** skill

## Prerequisites

The **Figma Bridge** Chrome extension must be installed. It auto-injects helpers on every Figma page.
Install: clone `https://github.com/lukaskellerstein/figma-bridge` → `chrome://extensions` → Load unpacked.

## Rules of Engagement

- **Always explain in plain English what you are about to do.** Assume the user cannot read code.
- **Do NOT try alternative solutions** like using the REST API or manually interacting with the Figma UI. Always use the Plugin API via `evaluate_script`.
- **Do NOT try to draw icons manually** with basic shapes. Always fetch pre-made SVGs from icon libraries (see **icon-library** skill) and insert with `figma.createNodeFromSvg()`.

## Creative Design Philosophy

**Make designs alive, modern, and visually rich. Don't be boring.**

### Images Are Part of the Design — NOT an Afterthought

**Images are a FIRST-CLASS design element.** They must be thought about from the very start — during planning, not after. When you design a section, you design its image at the same time.

**WRONG approach (don't do this):**
1. Plan layout → 2. Build frames → 3. "Oh, I should add images" → grey boxes

**RIGHT approach (always do this):**
1. Plan layout AND decide what image each section needs → 2. Search for images → 3. Build frames WITH images already loaded

**Every section plan must include IMAGE, ICON, and FONT specifications:**
```
Section: Hero
  - Layout: full-width, 500px height, centered text overlay
  - IMAGE: "Mars planet surface, red landscape, dramatic sky" → search Unsplash
  - ICONS: play-circle (Watch Trailer button)
  - FONTS: Inter Bold 48px (heading), Inter Regular 18px (subheading), Inter Semi Bold 14px (buttons)
  - Text: "Your Journey to Mars Starts Here"
  - CTA buttons: "Explore Packages", "Watch Trailer"

Section: Featured Destinations (3 cards)
  - IMAGE per card: "Mars Olympus Mons mountain", "Mars canyon Valles Marineris", "Mars Jezero crater"
  - ICONS: map-pin (location), arrow-right (CTA)
  - FONTS: Inter Bold 20px (title), Inter Regular 14px (description), Inter Semi Bold 14px (price)
  - Each card: image (top), title, description, price, CTA button

Section: Pricing (3 tiers)
  - IMAGE for highlighted tier: "Mars landing spacecraft"
  - ICONS: check (feature list items), star (popular badge), rocket (CTA), shield (guarantee)
  - FONTS: Inter Bold 28px (price), Inter Medium 16px (tier name), Inter Regular 14px (features)
  - Cards with icon lists, price, CTA
```

**The plan IS the design.** If icons, images, and fonts aren't in the plan, they won't be in the design.

**Image sourcing priority:**

1. **Unsplash first** — search for stock photos. Free, high-quality, instant.
   ```
   WebSearch: "site:unsplash.com {subject} photo"
   ```
   Use the direct image URL with size params: `?w=1440&q=80` for hero, `?w=640&q=80` for cards.

2. **Pexels / Pixabay** — fallback if Unsplash doesn't have the subject.

3. **AI generation** — only for things that don't exist as stock photos (fantasy, sci-fi, custom illustrations, specific compositions). Use `mcp__plugin_media-plugin_media-mcp__generate_image`.

**Image sizing guide:**

| Context | URL param | Figma size |
|---|---|---|
| Hero/full-width background | `?w=1440&q=80` | 1440 × 400-600px |
| Feature card image | `?w=640&q=80` | 300-400 × 200-250px |
| Thumbnail/avatar | `?w=200&q=80` | 48-80px circle or square |
| Gallery image | `?w=800&q=80` | varies |
| Background texture | `?w=1920&q=60` | full canvas |

**Insert images into Figma — always use helpers:**
```javascript
// Hero with image background + dark overlay for text readability
const hero = __figb.frame('Hero', { w: 1440, h: 500, direction: 'VERTICAL', p: 64, mainAlign: 'CENTER', clip: true });
const hash = await __figb.loadImage('https://images.unsplash.com/photo-xxx?w=1440&q=80');
hero.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];

// Card with image on top
await __figb.imageFrame('CardImage', { url: 'https://images.unsplash.com/photo-yyy?w=640&q=80', w: 360, h: 200, parent: card });

// Avatar circle
const avatarHash = await __figb.loadImage('https://images.unsplash.com/photo-zzz?w=200&q=80');
__figb.circle({ size: 48, image: avatarHash, parent: row });
```

**CRITICAL:** When building each section, load its image IMMEDIATELY — in the same chunk script that creates the frame. Do NOT create empty frames first and add images later. The image and the frame are one operation.

### Videos / GIFs — When They Add Design Value

Use occasionally, not everywhere:
- Hero sections with motion → `mcp__plugin_media-plugin_media-mcp__generate_video`
- Product demo previews
- Background ambient motion
- Use video thumbnails as image fills with a play button overlay

### Music / Audio

When designing media players, podcast UIs, or audio experiences, generate sample audio using `mcp__plugin_media-plugin_media-mcp__generate_music` or `mcp__plugin_media-plugin_media-mcp__generate_speech`.

### Icons Are Part of the Design — NOT an Afterthought

**Icons are a FIRST-CLASS design element.** Plan them during section design, fetch them before building, insert them inline.

**WRONG:** Build a nav bar → "I should add icons" → text-only nav
**RIGHT:** Plan nav WITH icons (home, search, bell, user) → fetch SVGs → build nav with icons inline

**Every UI element that could have an icon SHOULD have an icon:**
- Navigation items → home, search, settings, profile, bell, menu
- Action buttons → edit, trash-2, share, download, plus, x
- Status indicators → check-circle, alert-triangle, info, x-circle
- Feature cards → each feature gets a relevant icon
- List items → check, arrow-right, chevron-right
- Empty states → inbox, search, file-text
- Form fields → mail, lock, user, eye, eye-off
- Social proof → star, heart, thumbs-up, users
- Pricing features → check (included), x (excluded)

**Fetch icons BEFORE building sections** — use the **icon-library** skill:
```bash
# Fetch all icons needed for the page in one batch
curl -s https://unpkg.com/lucide-static/icons/home.svg
curl -s https://unpkg.com/lucide-static/icons/search.svg
curl -s https://unpkg.com/lucide-static/icons/bell.svg
curl -s https://unpkg.com/lucide-static/icons/user.svg
```

Then insert inline when building each section:
```javascript
const nav = __figb.frame('Nav', { direction: 'HORIZONTAL', gap: 24, crossAlign: 'CENTER', parent: header });
__figb.icon(homeSvg, { name: 'Icon/Home', size: 20, parent: nav });
await __figb.txt('Home', { size: 14, style: 'Medium', parent: nav });
```

**NEVER skip icons** — a button without an icon, a nav without icons, or a feature list without icons looks unfinished.

### Fonts Are Part of the Design — Choose During Planning

**Font choices define the design's personality.** Choose fonts during planning, not during execution.

**Every plan must specify the font stack:**
```
Font Stack:
  - Primary: Inter (headings + body)
  - Weights needed: Regular (400), Medium (500), Semi Bold (600), Bold (700)
  - Heading scale: H1=48px Bold, H2=36px Bold, H3=28px Semi Bold, H4=20px Semi Bold
  - Body: 16px Regular, 14px Regular (secondary), 12px Regular (caption)
  - Buttons: 14px Semi Bold (primary), 14px Medium (secondary)
```

**Load ALL needed font weights upfront** — before any section scripts:
```javascript
await __figb.fonts(
  ['Inter', 'Regular'],
  ['Inter', 'Medium'],
  ['Inter', 'Semi Bold'],
  ['Inter', 'Bold']
);
```

**Font loading is expensive.** Loading fonts once upfront is much faster than loading them per-section. List every weight you'll need in the plan and batch-load them all.

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

### Helper Functions Library — AUTO-INJECTED

The **Figma Bridge** Chrome extension auto-injects `window.__figb` and `window.__figs` on any Figma design page. No bootstrap step needed — helpers have direct access to the `figma` API. Verify with:

```javascript
typeof __figb === 'object' && __figb.version; // should return version string
```

All `__figb.*` and `__figs.*` methods are immediately ready. Cuts script length by ~60%.

**Available helpers after injection:**

| Helper | Description | Example |
|---|---|---|
| **Node Creation** | | |
| `__figb.frame(name, opts)` | Create frame with auto-layout | `__figb.frame('Card', { w: 320, direction: 'VERTICAL', p: 16, gap: 12 })` |
| `__figb.comp(name, opts)` | Create reusable Component | `__figb.comp('Button', { direction: 'HORIZONTAL', p: 12 })` |
| `__figb.txt(content, opts)` | Create text (async, loads font) | `await __figb.txt('Hello', { size: 24, style: 'Bold' })` |
| `__figb.richTxt(segments, opts)` | Rich text with mixed styles (async) | `await __figb.richTxt([{text:'Bold', style:'Bold'}, {text:' normal'}])` |
| `__figb.rect(opts)` | Create rectangle | `__figb.rect({ w: 200, h: 100, fill: __figb.hex('#F00'), radius: 8 })` |
| `__figb.circle(opts)` | Create ellipse/circle | `__figb.circle({ size: 48, fill: __figb.hex('#3B82F6') })` |
| `__figb.line(opts)` | Create line/divider | `__figb.line({ w: 300, color: __figb.hex('#E5E7EB'), dash: [10, 5] })` |
| `__figb.polygon(opts)` | Create polygon | `__figb.polygon({ sides: 6, size: 80, fill: __figb.hex('#F00') })` |
| `__figb.star(opts)` | Create star | `__figb.star({ points: 5, size: 48, fill: __figb.hex('#FFD700') })` |
| **Icons** | | |
| `__figb.icon(svg, opts)` | Insert SVG icon | `__figb.icon(svgString, { name: 'Icon/Search', size: 24 })` |
| `__figb.recolor(node, color)` | Recolor SVG icon | `__figb.recolor(iconNode, __figb.hex('#FFF'))` |
| **Images** | | |
| `__figb.loadImage(url)` | Load image → hash | `const hash = await __figb.loadImage('https://...')` |
| `__figb.imageFrame(name, opts)` | Frame with image fill | `await __figb.imageFrame('Hero', { url: '...', w: 1440, h: 400 })` |
| **Colors** | | |
| `__figb.rgb(r, g, b)` | 0-255 → Figma color | `__figb.rgb(59, 130, 246)` |
| `__figb.rgba(r, g, b, a)` | RGBA with alpha | `__figb.rgba(0, 0, 0, 0.5)` |
| `__figb.hex(h)` | Hex → Figma color | `__figb.hex('#3B82F6')` |
| **Gradients** | | |
| `__figb.gradient(hex1, hex2)` | 2-stop linear gradient | `__figb.gradient('#1E3A8A', '#3B82F6')` |
| `__figb.gradientMulti(stops, dir)` | Multi-stop linear gradient | `__figb.gradientMulti([{pos:0,hex:'#000'},{pos:0.5,hex:'#F00'},{pos:1,hex:'#FFF'}])` |
| `__figb.gradientRadial(stops)` | Radial gradient | `__figb.gradientRadial([{pos:0,hex:'#FFF'},{pos:1,hex:'#000'}])` |
| `__figb.gradientAngular(stops)` | Angular/conic gradient | `__figb.gradientAngular([{pos:0,hex:'#F00'},{pos:0.5,hex:'#00F'},{pos:1,hex:'#F00'}])` |
| **Effects** | | |
| `__figb.shadow(x, y, r, a)` | Drop shadow effect | `__figb.shadow(0, 4, 12, 0.15)` |
| `__figb.shadowMd()` | Medium elevation | Card shadow |
| `__figb.shadowLg()` | Large elevation | Modal shadow |
| `__figb.innerShadow(x, y, r, a)` | Inner shadow effect | `__figb.innerShadow(0, 2, 4, 0.1)` |
| `__figb.blur(radius)` | Layer blur | `frame.effects = __figb.blur(10)` |
| `__figb.bgBlur(radius)` | Background blur (glassmorphism) | `frame.effects = __figb.bgBlur(20)` |
| **Styles** | | |
| `__figb.paintStyle(name, color)` | Create Paint Style | `__figb.paintStyle('Primary/500', __figb.hex('#3B82F6'))` |
| `__figb.textStyle(name, opts)` | Create Text Style (async) | `await __figb.textStyle('Heading/H1', { size: 36, style: 'Bold' })` |
| `__figb.effectStyle(name, fx)` | Create Effect Style | `__figb.effectStyle('Shadow/md', __figb.shadowMd())` |
| **Navigation** | | |
| `__figb.find(name)` | Find node by exact name | `__figb.find('Header')` |
| `__figb.findAll(pattern)` | Find nodes by name pattern | `__figb.findAll('Card')` |
| `__figb.findType(type)` | Find nodes by type | `__figb.findType('TEXT')` |
| `__figb.page(name)` | Switch/create page | `__figb.page('Dashboard')` |
| `__figb.fonts(...styles)` | Batch load fonts (async) | `await __figb.fonts(['Inter','Regular'], ['Inter','Bold'])` |
| `__figb.zoomTo(nodes)` | Zoom viewport to nodes | `__figb.zoomTo(frame)` |
| `__figb.select(nodes)` | Select nodes | `__figb.select([card1, card2])` |

**Common opts supported by all node creation helpers:**

| Opt | Description | Example |
|---|---|---|
| `radius` | Uniform corner radius | `{ radius: 12 }` |
| `radiusTL/TR/BL/BR` | Per-corner radius | `{ radiusTL: 16, radiusTR: 16, radiusBL: 0, radiusBR: 0 }` |
| `rotation` | Rotation in degrees | `{ rotation: 45 }` |
| `blendMode` | Blend mode | `{ blendMode: 'MULTIPLY' }` |
| `opacity` | Opacity 0-1 | `{ opacity: 0.5 }` |
| `absolute` | Absolute positioning in auto-layout | `{ absolute: true, x: 10, y: 10 }` |
| `constraints` | Layout constraints (with absolute) | `{ absolute: true, constraints: { horizontal: 'MAX', vertical: 'MIN' } }` |
| `dash` | Stroke dash pattern | `{ strokes: [...], dash: [10, 5] }` |
| `strokeAlign` | Stroke alignment | `{ strokeAlign: 'INSIDE' }` |
| `strokeCap` | Stroke cap style | `{ strokeCap: 'ROUND' }` |

### Verification

After completing a page, run the built-in verification:

```javascript
__figb.verify()
```

Returns a stats object: `{ totalNodes, frames, text, components, instances, images, vectors, issues }` with issue detection (overlapping frames, unnamed nodes, empty text, tiny elements).

### Status Panel — Agent Dashboard in Figma

Figma Bridge auto-injects `__figs`. Initialize the panel with:

```javascript
await __figs.init();
```

The panel appears in the top-right of the viewport showing:
- Plugin version and connection status (green dot)
- Active agents count and their current task/status

**API (available as `__figs` after injection):**

| Method | Description | Example |
|---|---|---|
| `__figs.init()` | Create/reset the panel | `await __figs.init()` |
| `__figs.agent(id, name, status, task)` | Register or update an agent | `await __figs.agent('a1', 'Dashboard', 'planning')` |
| `__figs.update(id, status, task)` | Update agent status | `await __figs.update('a1', 'fetching-images', 'Searching Unsplash...')` |
| `__figs.done(id)` | Mark agent as completed | `await __figs.done('a1')` |
| `__figs.error(id, message)` | Mark agent as failed | `await __figs.error('a1', 'Image load failed')` |
| `__figs.remove()` | Remove panel (cleanup) | `__figs.remove()` |
| `__figs.info()` | Get status data | `__figs.info()` |

**Status values:** `planning`, `fetching-images`, `fetching-icons`, `fetching-assets`, `generating`, `executing`, `verifying`, `done`, `error`

Each status has a color-coded dot (yellow=planning, blue=fetching, green=done, red=error).

**When to use:** Inject after helpers.js whenever running multi-step or multi-agent designs. Update agent status at each step. Remove when the design is complete.

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
const card = __figb.frame('Card', { w: 320, h: 200, direction: 'VERTICAL', p: 16, gap: 12, radius: 12, fill: __figb.rgb(255,255,255), effects: __figb.shadow(0, 2, 8, 0.1) });
await __figb.txt('Card Title', { size: 18, style: 'Bold', parent: card });
```

### Chunked Execution Order — ALWAYS PARALLELIZE ASSET GATHERING

**Speed is critical.** Never gather assets sequentially. Always spawn parallel agents for icons and images while building the Design Language page in Figma.

```
┌─ MAIN THREAD ─────────────────────────────────────────────────────────┐
│                                                                        │
│  1. Plan (sections, images, icons, fonts)                             │
│  2. Spawn 2 parallel Agents + start Figma work simultaneously:       │
│                                                                        │
│     ┌─ Agent: Icons ──────────┐  ┌─ Agent: Images ─────────────────┐ │
│     │ curl all icon SVGs from │  │ WebSearch Unsplash for each     │ │
│     │ Lucide/Heroicons        │  │ image in the plan, collect URLs │ │
│     │ Return: { name: svg }   │  │ Return: { section: url }       │ │
│     └─────────────────────────┘  └─────────────────────────────────┘ │
│                                                                        │
│     ┌─ Main: Figma (in parallel with agents above) ─────────────────┐ │
│     │ • Init status panel: await __figs.init()                      │ │
│     │ • Load fonts: await __figb.fonts(...)                         │ │
│     │ • Create Design Language page (colors, typography, effects)   │ │
│     └───────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  3. Collect agent results (icons map + image URLs)                    │
│  4. Build sections — each chunk has icons + images baked in          │
│  5. Verify + cleanup                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

**Step-by-step:**

1. **Plan everything first** — for each section specify: layout, IMAGE (search query), ICONS (names), FONTS (family/weight/size)
2. **Spawn 3 tasks in parallel** (use Agent tool with multiple calls in a single message):
   - **Agent A (Icons)**: fetch all icon SVGs via curl — return a map of `{ iconName: svgString }`
   - **Agent B (Images)**: search Unsplash for all images — return a map of `{ sectionName: imageUrl }`
   - **Main thread (Figma)**: init status panel, load fonts, build Design Language page
3. **Collect results** from both agents
4. **Build sections** — each chunk script has icons and image URLs baked in:
   ```javascript
   const hero = __figb.frame('Hero', { w: 1440, h: 500, direction: 'VERTICAL', p: 64, mainAlign: 'CENTER', clip: true });
   const heroImg = await __figb.loadImage('https://images.unsplash.com/photo-xxx?w=1440&q=80');
   hero.fills = [{ type: 'IMAGE', imageHash: heroImg, scaleMode: 'FILL' }];
   const overlay = __figb.rect({ name: 'Overlay', w: 1440, h: 500, fill: __figb.rgb(0,0,0), opacity: 0.4, absolute: true, parent: hero });
   await __figb.txt('Your Journey Starts Here', { size: 48, style: 'Bold', fill: __figb.hex('#FFF'), parent: hero });
   const btnRow = __figb.frame('Buttons', { direction: 'HORIZONTAL', gap: 16, parent: hero });
   const btn = __figb.frame('CTA', { direction: 'HORIZONTAL', gap: 8, px: 24, py: 12, radius: 8, fill: __figb.hex('#3B82F6'), crossAlign: 'CENTER', parent: btnRow });
   __figb.icon(playSvg, { name: 'Icon/Play', size: 18, parent: btn });
   await __figb.txt('Watch Trailer', { size: 14, style: 'Semi Bold', fill: __figb.hex('#FFF'), parent: btn });
   ```
5. **Verify** (`__figb.verify()` + snapshot) — check `images > 0`, `vectors > 0` (icons)
6. **Mark done**: `await __figs.done('main')`
7. **Cleanup**: `__figs.remove()`

**Key rules:**
- **ALWAYS parallelize** — icons agent + images agent + Figma setup run simultaneously
- Images and frames are built together in the same chunk
- Icons are inserted inline when building each element
- Fonts are batch-loaded once upfront, then used freely in all chunks
- No frame without its image. No button without its icon.

### Multi-Page Designs — Scale the Parallelism

For multi-page designs, spawn **one agent per page** that handles both icons AND images for that page. The main thread builds the Design Language page while all page agents gather assets in parallel.

```
┌─ MAIN THREAD ──────────────────────────────────────────┐
│  1. Create master plan (all pages + sections)          │
│  2. Build Design Language page in Figma                │
│  3. Spawn parallel Agents — one per page:              │
│     Each agent does ALL asset work for its page:       │
│     a. Fetches all icons from Lucide/Heroicons         │
│     b. Searches Unsplash for all images                │
│     c. Generates AI images if stock not found          │
│     d. Returns scripts array with assets baked in      │
│  4. Collect results from all agents                    │
│  5. Execute all scripts sequentially in Figma          │
│  6. Run __figb.verify() after each page                │
└────────────────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ Agent A  │   │ Agent B  │   │ Agent C  │
    │ Page 1   │   │ Page 2   │   │ Page 3   │
    │ icons +  │   │ icons +  │   │ icons +  │
    │ images   │   │ images   │   │ images   │
    └─────────┘    └─────────┘    └─────────┘
    (parallel)     (parallel)     (parallel)
```

**Each agent's returned scripts must have everything baked in:**
```javascript
// GOOD: image + icon + font all in one script
const hero = __figb.frame('Hero', { w: 1440, h: 500, clip: true });
const img = await __figb.loadImage('https://images.unsplash.com/photo-xxx?w=1440&q=80');
hero.fills = [{ type: 'IMAGE', imageHash: img, scaleMode: 'FILL' }];
await __figb.txt('Build Faster', { size: 48, style: 'Bold', fill: __figb.hex('#FFF'), parent: hero });
const btn = __figb.frame('CTA', { direction: 'HORIZONTAL', gap: 8, px: 24, py: 12, fill: __figb.hex('#3B82F6'), radius: 8, parent: hero });
__figb.icon(arrowRightSvg, { size: 18, parent: btn });
await __figb.txt('Get Started', { size: 14, style: 'Semi Bold', fill: __figb.hex('#FFF'), parent: btn });

// BAD: empty frame, no image, no icon, wrong font
const hero = __figb.frame('Hero', { fill: __figb.hex('#1F2937') }); // NO!
```

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

## Common Patterns (using __figb helpers)

### Card with image, icon, and text

```javascript
const card = __figb.frame('Card', { w: 320, direction: 'VERTICAL', radius: 12, fill: __figb.hex('#FFF'), effects: __figb.shadowMd(), clip: true });
// Image from Unsplash
await __figb.imageFrame('CardImage', { url: 'https://images.unsplash.com/photo-xxx?w=640&q=80', w: 320, h: 180, parent: card });
const content = __figb.frame('CardContent', { w: 320, direction: 'VERTICAL', p: 16, gap: 8, parent: card });
await __figb.txt('Card Title', { size: 18, style: 'Bold', parent: content });
await __figb.txt('Description text goes here.', { size: 14, fill: __figb.hex('#6B7280'), parent: content });
```

### Icon + text row (nav item, list item)

```javascript
const row = __figb.frame('NavItem', { direction: 'HORIZONTAL', gap: 12, py: 8, px: 16, crossAlign: 'CENTER', parent: nav });
__figb.icon(searchSvg, { name: 'Icon/Search', size: 20, parent: row });
await __figb.txt('Search', { size: 14, fill: __figb.hex('#374151'), parent: row });
```

### Color palette with Paint Styles

```javascript
const colors = [['Blue/50','#EFF6FF'], ['Blue/500','#3B82F6'], ['Blue/900','#1E3A8A']];
const row = __figb.frame('Colors', { direction: 'HORIZONTAL', gap: 8, mainSize: 'AUTO', crossSize: 'AUTO' });
for (const [name, hex] of colors) {
  __figb.paintStyle(name, __figb.hex(hex)); // Creates reusable Figma style
  __figb.frame(name, { w: 80, h: 80, radius: 8, fill: __figb.hex(hex), parent: row });
}
```

### Glassmorphism card (background blur + semi-transparent)

```javascript
const glass = __figb.frame('GlassCard', {
  w: 320, direction: 'VERTICAL', p: 24, gap: 12, radius: 16,
  fill: __figb.rgba(255, 255, 255, 0.15),
  effects: [...__figb.bgBlur(20), ...__figb.innerShadow(0, 1, 0, 0.2)],
  strokes: [{ type: 'SOLID', color: __figb.rgba(255, 255, 255, 0.3) }], strokeWeight: 1,
  parent: container
});
await __figb.txt('Glass Card', { size: 20, style: 'Semi Bold', fill: __figb.hex('#FFF'), parent: glass });
```

### Rich text with mixed formatting

```javascript
await __figb.richTxt([
  { text: 'Save 40%', style: 'Bold', size: 24, hex: '#10B981' },
  { text: ' on annual plans. ', size: 24 },
  { text: '$99/year', style: 'Bold', size: 24, decoration: 'STRIKETHROUGH', hex: '#9CA3AF' },
  { text: ' $59/year', style: 'Bold', size: 24, hex: '#111827' },
], { parent: pricingCard });
```

### Notification badge on avatar (absolute positioning)

```javascript
const avatarWrap = __figb.frame('AvatarWrap', { w: 48, h: 48, parent: nav });
__figb.circle({ size: 48, image: avatarHash, parent: avatarWrap });
const badge = __figb.frame('Badge', {
  w: 20, h: 20, direction: 'HORIZONTAL', mainAlign: 'CENTER', crossAlign: 'CENTER',
  fill: __figb.hex('#EF4444'), radius: 9999,
  absolute: true, x: 30, y: -4,
  constraints: { horizontal: 'MAX', vertical: 'MIN' },
  parent: avatarWrap
});
await __figb.txt('3', { size: 11, style: 'Bold', fill: __figb.hex('#FFF'), parent: badge });
```

### Dashed upload zone

```javascript
const dropzone = __figb.frame('Dropzone', {
  w: 400, h: 200, direction: 'VERTICAL', mainAlign: 'CENTER', crossAlign: 'CENTER', gap: 12,
  fill: __figb.hex('#F9FAFB'), radius: 12,
  strokes: [{ type: 'SOLID', color: __figb.hex('#D1D5DB') }], strokeWeight: 2,
  dash: [8, 4], strokeAlign: 'INSIDE',
  parent: container
});
await __figb.txt('Drop files here', { size: 16, fill: __figb.hex('#6B7280'), parent: dropzone });
```

### Chat bubble with asymmetric corners

```javascript
const bubble = __figb.frame('ChatBubble', {
  w: 280, direction: 'VERTICAL', p: 12, gap: 4,
  fill: __figb.hex('#3B82F6'),
  radiusTL: 16, radiusTR: 16, radiusBL: 4, radiusBR: 16,
  parent: chatContainer
});
await __figb.txt('Hey, how are you?', { size: 14, fill: __figb.hex('#FFF'), parent: bubble });
```

### Multi-stop gradient hero

```javascript
const hero = __figb.frame('Hero', {
  w: 1440, h: 500, direction: 'VERTICAL', p: 64, mainAlign: 'CENTER',
  gradient: __figb.gradientMulti([
    { pos: 0, hex: '#1E3A8A' },
    { pos: 0.5, hex: '#7C3AED' },
    { pos: 1, hex: '#EC4899' }
  ]),
});
await __figb.txt('Welcome', { size: 48, style: 'Bold', fill: __figb.hex('#FFF'), parent: hero });
```

### Hero section with Unsplash background + gradient overlay

```javascript
const hero = __figb.frame('Hero', { w: 1440, h: 500, direction: 'VERTICAL', p: 64, mainAlign: 'CENTER', clip: true });
const hash = await __figb.loadImage('https://images.unsplash.com/photo-xxx?w=1440&q=80');
hero.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];
// Dark overlay for text readability
const overlay = __figb.rect({ name: 'Overlay', w: 1440, h: 500, fill: __figb.rgb(0,0,0), parent: hero });
overlay.opacity = 0.4;
await __figb.txt('Welcome to Our Platform', { size: 48, style: 'Bold', fill: __figb.hex('#FFF'), parent: hero });
```

## Important Notes

- **Always use `await` with async methods** like `loadFontAsync`, `getNodeByIdAsync`
- **Colors use 0-1 range**, not 0-255. Convert with `value / 255`
- **Resize uses `node.resize(w, h)`**, not setting width/height directly
- **Append to parent** — newly created nodes must be appended: `parent.appendChild(node)`
- **Font loading is required** before setting text `characters` or `fontName`
- **SVG insertion** — always use `figma.createNodeFromSvg()` for icons, never try to draw icons manually with shapes
- **Selection** — set `figma.currentPage.selection = [node]` to select created elements

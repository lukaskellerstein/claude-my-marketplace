---
name: icon-library
description: >
  Fetch pre-made SVG icons from open-source icon libraries (Lucide, Heroicons, Tabler Icons) for use
  in Figma or code projects. Use when the user asks to "add an icon", "use a search icon", "insert
  icons in Figma", "find an icon for settings", or needs clean SVG icons. NEVER draw icons manually —
  always fetch from these libraries. Supports browsing, searching, and inserting icons into Figma
  via figma.createNodeFromSvg().
---

# Icon Library

Fetch production-quality SVG icons from open-source libraries instead of drawing them manually. These icons are professionally designed, consistent, and optimized for clean rendering in Figma and code.

## When to Use

- User asks to add icons to a Figma design
- User needs SVG icons for a UI component, button, navigation, etc.
- User says "add a search icon", "use a settings gear", "insert an arrow icon"
- You need icons as part of a larger Figma automation task
- User wants consistent iconography across a design

## When NOT to Use

- User wants custom illustrations or logos (use image generation instead)
- User already has specific SVG code they want to use

## CRITICAL RULE

**NEVER attempt to draw icons by hand using basic shapes (rectangles, circles, paths).** The result will always look awful. Instead, ALWAYS fetch a pre-made SVG from one of the libraries below.

## Available Icon Libraries

### 1. Lucide Icons (Recommended)

- **Count**: 1500+ icons
- **Style**: Clean, consistent 24x24 outline icons with 2px stroke
- **License**: ISC (fully open)
- **URL pattern**: `https://unpkg.com/lucide-static/icons/{name}.svg`
- **Icon list**: https://lucide.dev/icons

**Fetch example:**
```
WebFetch → https://unpkg.com/lucide-static/icons/search.svg
WebFetch → https://unpkg.com/lucide-static/icons/settings.svg
WebFetch → https://unpkg.com/lucide-static/icons/arrow-right.svg
WebFetch → https://unpkg.com/lucide-static/icons/user.svg
WebFetch → https://unpkg.com/lucide-static/icons/home.svg
WebFetch → https://unpkg.com/lucide-static/icons/heart.svg
WebFetch → https://unpkg.com/lucide-static/icons/mail.svg
WebFetch → https://unpkg.com/lucide-static/icons/bell.svg
WebFetch → https://unpkg.com/lucide-static/icons/check.svg
WebFetch → https://unpkg.com/lucide-static/icons/x.svg
WebFetch → https://unpkg.com/lucide-static/icons/plus.svg
WebFetch → https://unpkg.com/lucide-static/icons/menu.svg
WebFetch → https://unpkg.com/lucide-static/icons/chevron-down.svg
WebFetch → https://unpkg.com/lucide-static/icons/calendar.svg
WebFetch → https://unpkg.com/lucide-static/icons/download.svg
WebFetch → https://unpkg.com/lucide-static/icons/upload.svg
WebFetch → https://unpkg.com/lucide-static/icons/trash-2.svg
WebFetch → https://unpkg.com/lucide-static/icons/edit.svg
WebFetch → https://unpkg.com/lucide-static/icons/eye.svg
WebFetch → https://unpkg.com/lucide-static/icons/lock.svg
```

**Common icon names** (kebab-case):
`search`, `settings`, `user`, `users`, `home`, `heart`, `star`, `mail`, `bell`, `check`, `x`, `plus`, `minus`, `menu`, `chevron-down`, `chevron-right`, `chevron-left`, `chevron-up`, `arrow-right`, `arrow-left`, `arrow-up`, `arrow-down`, `calendar`, `clock`, `download`, `upload`, `trash-2`, `edit`, `eye`, `eye-off`, `lock`, `unlock`, `log-in`, `log-out`, `share`, `copy`, `clipboard`, `folder`, `file`, `file-text`, `image`, `camera`, `video`, `music`, `phone`, `map-pin`, `globe`, `link`, `external-link`, `bookmark`, `flag`, `filter`, `grid`, `list`, `layout`, `maximize`, `minimize`, `refresh-cw`, `rotate-cw`, `save`, `send`, `shopping-cart`, `shopping-bag`, `tag`, `zap`, `sun`, `moon`, `cloud`, `database`, `server`, `terminal`, `code`, `git-branch`, `github`, `slack`, `twitter`, `facebook`, `instagram`, `linkedin`, `youtube`, `alert-circle`, `alert-triangle`, `info`, `help-circle`, `check-circle`, `x-circle`, `loader`, `more-horizontal`, `more-vertical`, `thumbs-up`, `thumbs-down`, `smile`, `frown`, `bar-chart`, `pie-chart`, `trending-up`, `trending-down`, `activity`, `credit-card`, `dollar-sign`, `percent`, `shield`, `key`, `wifi`, `bluetooth`, `battery`, `monitor`, `smartphone`, `tablet`, `printer`, `hard-drive`, `cpu`, `layers`, `package`, `box`, `archive`, `truck`, `navigation`, `compass`, `target`, `crosshair`, `move`, `maximize-2`, `minimize-2`, `sidebar`, `columns`, `align-left`, `align-center`, `align-right`, `bold`, `italic`, `underline`, `type`

### 2. Heroicons

- **Count**: 300+ icons in 3 styles
- **Style**: By Tailwind CSS team, 24x24 outline/solid/mini
- **License**: MIT
- **URL pattern**: `https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/outline/{name}.svg`
- **Solid variant**: `.../24/solid/{name}.svg`
- **Mini variant (20x20)**: `.../20/solid/{name}.svg`
- **Icon list**: https://heroicons.com

**Common icon names** (kebab-case):
`academic-cap`, `adjustments-horizontal`, `arrow-down`, `arrow-left`, `arrow-right`, `arrow-up`, `bars-3`, `bell`, `bookmark`, `calendar`, `camera`, `chart-bar`, `chat-bubble-left`, `check`, `check-circle`, `chevron-down`, `chevron-left`, `chevron-right`, `chevron-up`, `clipboard`, `clock`, `cloud`, `cog-6-tooth`, `credit-card`, `cube`, `document`, `document-text`, `envelope`, `eye`, `face-smile`, `filter`, `flag`, `folder`, `gift`, `globe-alt`, `hand-thumb-up`, `heart`, `home`, `identification`, `inbox`, `information-circle`, `key`, `link`, `lock-closed`, `magnifying-glass`, `map-pin`, `minus`, `moon`, `musical-note`, `paint-brush`, `paper-airplane`, `pencil`, `phone`, `photo`, `plus`, `puzzle-piece`, `question-mark-circle`, `shield-check`, `shopping-bag`, `shopping-cart`, `sparkles`, `star`, `sun`, `tag`, `trash`, `user`, `user-group`, `video-camera`, `wrench`, `x-mark`

### 3. Tabler Icons

- **Count**: 5000+ icons
- **Style**: 24x24 outline icons, 2px stroke, rounded joins
- **License**: MIT
- **URL pattern**: `https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/{name}.svg`
- **Filled variant**: `.../icons/filled/{name}.svg`
- **Icon list**: https://tabler.io/icons

**Common icon names** (kebab-case):
`search`, `settings`, `user`, `home`, `heart`, `star`, `mail`, `bell`, `check`, `x`, `plus`, `minus`, `menu-2`, `chevron-down`, `chevron-right`, `arrow-right`, `arrow-left`, `calendar`, `clock`, `download`, `upload`, `trash`, `edit`, `eye`, `lock`, `login`, `logout`, `share`, `copy`, `clipboard`, `folder`, `file`, `photo`, `camera`, `video`, `music`, `phone`, `map-pin`, `world`, `link`, `external-link`, `bookmark`, `filter`, `grid-dots`, `list`, `layout`, `refresh`, `device-floppy`, `send`, `shopping-cart`, `tag`, `bolt`, `sun`, `moon`, `cloud`, `database`, `server`, `terminal`, `code`, `git-branch`, `brand-github`, `alert-circle`, `alert-triangle`, `info-circle`, `circle-check`, `circle-x`, `loader`, `dots`, `thumb-up`, `mood-smile`, `chart-bar`, `chart-pie`, `trending-up`, `credit-card`, `currency-dollar`, `shield`, `key`, `wifi`, `bluetooth`, `battery`, `device-desktop`, `device-mobile`, `printer`, `cpu`, `stack-2`, `package`, `box`, `archive`, `truck`, `compass`, `target`

## How to Fetch an Icon

### Step 1: Determine the icon name

Map the user's intent to an icon name:
- "search" → `search`
- "settings" or "gear" → `settings`
- "close" or "dismiss" → `x`
- "delete" → `trash-2` (Lucide) or `trash` (Heroicons/Tabler)
- "add" or "create" → `plus`
- "hamburger menu" → `menu` (Lucide) or `bars-3` (Heroicons) or `menu-2` (Tabler)
- "notification" → `bell`
- "profile" → `user`
- "back" → `arrow-left` or `chevron-left`

### Step 2: Fetch the SVG

Use `WebFetch` or `curl` via Bash to download the SVG content:

```bash
curl -s https://unpkg.com/lucide-static/icons/search.svg
```

Or use WebFetch:
```
WebFetch → https://unpkg.com/lucide-static/icons/search.svg
→ prompt: "Return the complete SVG markup exactly as-is, no modifications"
```

### Step 3: Use the SVG

**For Figma** — insert via Plugin API using `figma.createNodeFromSvg()`:

```javascript
const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

const icon = figma.createNodeFromSvg(svgString);
icon.name = "Icon/Search";
icon.resize(24, 24);
figma.currentPage.appendChild(icon);
```

**For code** — save to a file or inline in JSX:

```jsx
// React component
import { Search } from 'lucide-react'; // if using the npm package
// or inline SVG
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
</svg>
```

## Searching for Icons

If you're unsure of the exact icon name, search the icon library website:

```
WebFetch → https://lucide.dev/icons
→ prompt: "Find icon names related to [concept]"
```

Or use WebSearch:
```
WebSearch → "lucide icon [concept]"
WebSearch → "heroicons [concept]"
```

## Batch Icon Insertion (Figma)

When inserting multiple icons, fetch all SVGs first, then insert them in a single evaluate call:

```javascript
const icons = {
  search: `<svg>...</svg>`,
  settings: `<svg>...</svg>`,
  user: `<svg>...</svg>`,
};

const frame = figma.createFrame();
frame.name = "Icons";
frame.layoutMode = "HORIZONTAL";
frame.itemSpacing = 16;
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "AUTO";

for (const [name, svg] of Object.entries(icons)) {
  const icon = figma.createNodeFromSvg(svg);
  icon.name = `Icon/${name}`;
  icon.resize(24, 24);
  frame.appendChild(icon);
}

figma.currentPage.appendChild(frame);
```

## Customizing Icons

After inserting an SVG into Figma, you can modify it:

```javascript
const icon = figma.createNodeFromSvg(svgString);

// Change color — the SVG creates a group with vector children
function recolorNode(node, color) {
  if ('strokes' in node && node.strokes.length > 0) {
    node.strokes = [{ type: "SOLID", color }];
  }
  if ('fills' in node && node.fills.length > 0) {
    node.fills = [{ type: "SOLID", color }];
  }
  if ('children' in node) {
    node.children.forEach(child => recolorNode(child, color));
  }
}

recolorNode(icon, { r: 0.2, g: 0.4, b: 1.0 }); // Blue

// Resize
icon.resize(32, 32); // Scale to 32x32
```

## Tips

- **Prefer Lucide** as the default library — it has the most consistent style and predictable naming
- **Use Heroicons** when the project already uses Tailwind CSS
- **Use Tabler** when you need an obscure icon that Lucide/Heroicons don't have (5000+ options)
- **Always use `createNodeFromSvg()`** in Figma — never try to draw icons with basic shapes
- Icon names use **kebab-case** in all three libraries
- Most icons are **24x24** with **2px stroke** — resize after insertion if needed
- When inserting icons into a Figma component, flatten the SVG group if needed: `figma.flatten([iconNode])`

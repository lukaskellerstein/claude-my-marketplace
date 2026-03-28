---
name: web-to-figma
argument-hint: "<website-url> <figma-url>"
description: >
  Reproduce an existing website in Figma, including images, colors, typography, and layout.
  Use when the user wants to convert a live webpage into a Figma design, copy a website's design
  into Figma for redesign, create Figma mockups from existing sites, or analyze a website's
  visual structure. Requires the Figma Bridge Chrome extension and Playwright MCP server.

  <example>
  Context: User wants to reproduce a website in Figma
  user: "/web-to-figma https://example.com https://www.figma.com/design/ABC/File"
  </example>

  <example>
  Context: User wants to copy a competitor's design
  user: "/web-to-figma https://competitor.com https://www.figma.com/design/XYZ/MyFile"
  </example>
---

# Web-to-Figma — Website to Figma Reproduction

Reproduce an existing website in Figma by extracting its visual structure, styles, images, and text, then building it using `__figb.*` helpers.

## Arguments

- **Website URL** (`$0`): the website to reproduce — e.g., `https://example.com`
- **Figma URL** (`$1`): the target Figma file — e.g., `https://www.figma.com/design/ABC/File`

If either is missing, ask the user.

## Prerequisites

- **Figma Bridge** Chrome extension installed (provides `__figb.*`)
- **design-playwright** MCP server running (Playwright browser automation)
- A Figma file open in the browser with edit access

## Workflow

### Phase 1: Extract from Website

1. **Navigate** to `$0` using `mcp__design-playwright__browser_navigate`
2. Wait for page to fully load, then scroll down to trigger lazy-loaded content
3. Take a full-page **screenshot** for visual reference
4. **Extract structure** via `mcp__design-playwright__browser_evaluate` — read and execute the extraction script from `${CLAUDE_SKILL_DIR}/scripts/extract-page.js`
5. The script returns:
   - `metadata` — page title, body background, font family, viewport info
   - `sections` — array of DOM sections with computed styles, text, images, bounding boxes
   - `imageUrls` — all image URLs found on the page

### Phase 2: Analyze Extraction

Review the extracted data:
1. Identify the **color theme** (dark/light) from body background
2. Map the **font family** to a Figma-available font (see font mapping table below)
3. Count sections and estimate complexity
4. Identify which images are loadable vs potentially CORS-blocked
5. Plan the Figma build order (header → hero → content sections → footer)

### Phase 3: Build in Figma

1. **Navigate** to `$1` using `mcp__design-playwright__browser_navigate`
2. **Verify** connection: `typeof __figb === 'object'`
3. **Load fonts**: `await __figb.fonts([mappedFont, 'Regular'], [mappedFont, 'Bold'], ...)`
4. **Create page**: `__figb.page('Website Name')` (use the website's title from metadata)
5. **Create outer wrapper**: `__figb.frame('Website Name', { w: 1440, direction: 'VERTICAL', autoPosition: true })`
6. **Build section-by-section** — for each extracted section:
   - Create frame with matching dimensions and background
   - Load images via `__figb.loadImage(url)` (fallback to gradient on failure)
   - Create text nodes with matching styles
   - Apply effects (shadows, borders, radius)
   - Max 5 elements per `browser_evaluate` call

### Phase 4: Verify

1. Take a **screenshot** of the Figma result
2. Compare visually with the original website screenshot
3. Run `__figb.verify()` for structural check
4. Report results to user

### Rules

1. **Extract first, build second** — always run the extraction script, never build from memory
2. **Images are critical** — load ALL images from the website. A reproduction without images is not a reproduction.
3. **Match the theme** — dark website = dark Figma design. Never default to white.
4. **Section-by-section** — follow the chunked execution pattern from figma-bridge skill

## CSS → Figma Property Mapping

### Layout

| CSS | Figma Property | `__figb` Helper |
|---|---|---|
| `display: flex` | auto-layout | `direction: 'HORIZONTAL'` or `'VERTICAL'` |
| `flex-direction: column` | VERTICAL layout | `direction: 'VERTICAL'` |
| `flex-direction: row` | HORIZONTAL layout | `direction: 'HORIZONTAL'` |
| `justify-content: center` | primaryAxisAlignItems | `mainAlign: 'CENTER'` |
| `align-items: center` | counterAxisAlignItems | `crossAlign: 'CENTER'` |
| `gap: 16px` | itemSpacing | `gap: 16` |

### Spacing

| CSS | Figma Property | `__figb` Helper |
|---|---|---|
| `padding: 16px` | paddingTop/Right/Bottom/Left | `p: 16` |
| `padding: 12px 24px` | vertical/horizontal padding | `py: 12, px: 24` |

### Colors

| CSS | Figma | `__figb` Helper |
|---|---|---|
| `background-color: rgb(r,g,b)` | fills solid | `fill: __figb.rgb(r,g,b)` |
| `background-color: #hex` | fills solid | `fill: __figb.hex('#hex')` |
| `background: linear-gradient(...)` | fills gradient | `gradient: __figb.gradient(hex1, hex2)` |
| `background-image: url(...)` | fills IMAGE | `await __figb.loadImage(url)` |

### Effects

| CSS | Figma | `__figb` Helper |
|---|---|---|
| `box-shadow: 0 4px 12px rgba(0,0,0,0.15)` | DROP_SHADOW | `effects: __figb.shadow(0, 4, 12, 0.15)` |
| `border-radius: 12px` | cornerRadius | `radius: 12` |
| `border: 1px solid #333` | strokes | `strokes: [...], strokeWeight: 1` |
| `opacity: 0.5` | opacity | `opacity: 0.5` |
| `backdrop-filter: blur(20px)` | BACKGROUND_BLUR | `effects: __figb.bgBlur(20)` |

### Typography

| CSS | Figma | `__figb` Helper |
|---|---|---|
| `font-family: Inter` | fontName.family | `font: 'Inter'` |
| `font-weight: 700` | fontName.style | `style: 'Bold'` (see weight map below) |
| `font-size: 16px` | fontSize | `size: 16` |
| `line-height: 24px` | lineHeight | `lineHeight: 24` |
| `text-align: center` | textAlignHorizontal | `align: 'CENTER'` |
| `text-transform: uppercase` | textCase | `textCase: 'UPPER'` |

### Font Weight Map

| CSS `font-weight` | Figma `style` |
|---|---|
| 100, 200 | `'Thin'` |
| 300 | `'Light'` |
| 400, normal | `'Regular'` |
| 500 | `'Medium'` |
| 600 | `'Semi Bold'` |
| 700, bold | `'Bold'` |
| 800 | `'Extra Bold'` |
| 900 | `'Black'` |

### Common Font Mapping (Web → Figma)

| Web Font | Figma Equivalent |
|---|---|
| `system-ui`, `-apple-system` | `Inter` |
| `Arial`, `Helvetica` | `Inter` |
| `Georgia`, `Times New Roman` | `Roboto Serif` |
| `Courier`, `monospace` | `Roboto Mono` |
| Google Fonts (Inter, Roboto, etc.) | Same name (usually available) |

If a web font is not available in Figma, fall back to `Inter`.

## Image Handling

### Strategy

1. **Direct URL loading** — pass the original image URL to `__figb.loadImage(url)`
2. **Fallback to gradient** — if loading fails (CORS, auth), `imageFrame` auto-falls back to a gradient
3. **Background images** — extract from CSS `background-image: url(...)` and apply as fills
4. **SVGs** — extract inline SVG and insert via `__figb.icon(svgString, opts)`

### Common Issues

- **CORS restrictions** — some images can't be loaded cross-origin. The `imageFrame` helper handles this with a gradient fallback.
- **Lazy-loaded images** — scroll the page first to trigger lazy loading before extraction
- **Data URIs** — small images may be embedded as data URIs; these can be loaded directly
- **Responsive images** — extract from `currentSrc` (the actually loaded source) rather than `src`

## Extraction Script

The extraction script at `${CLAUDE_SKILL_DIR}/scripts/extract-page.js` walks the DOM and returns:

```javascript
{
  metadata: {
    title: 'Page Title',
    url: 'https://example.com',
    viewportWidth: 1440,
    pageHeight: 5000,
    bodyBackground: 'rgb(10, 10, 10)',
    bodyColor: 'rgb(255, 255, 255)',
    bodyFontFamily: 'Inter, sans-serif',
  },
  sections: [
    {
      tag: 'header',
      bounds: { x: 0, y: 0, w: 1440, h: 80 },
      text: '',
      images: [],
      styles: { backgroundColor: 'rgb(0,0,0)', display: 'flex', ... },
      children: [
        { tag: 'nav', text: 'Home About Contact', styles: {...}, children: [...] },
      ],
    },
    // ... more sections
  ],
  imageUrls: ['https://example.com/hero.jpg', ...],
}
```

## Building Strategy

### Section-by-Section

Build each extracted section as a separate Figma frame, top-to-bottom:

```javascript
// 1. Create page
__figb.page('example.com');

// 2. Create outer wrapper
const page = __figb.frame('example.com', { w: 1440, direction: 'VERTICAL', autoPosition: true });

// 3. For each section from extraction:
const header = __figb.frame('Header', {
  w: section.bounds.w, h: section.bounds.h,
  direction: 'HORIZONTAL', // from display + flex-direction
  p: parsePadding(section.styles),
  gap: parseGap(section.styles),
  fill: parseColor(section.styles.backgroundColor),
  parent: page,
});
// ... add children, text, images
```

### Chunked Execution

Follow the standard figma-bridge chunking rules:
- Max 5 elements per `browser_evaluate` call
- Each chunk finds its parent via `__figb.find('ParentName')`
- Images loaded inline with their frames

## Limitations

- **Interactive elements** — animations, hover states, and JS-driven components are captured in their default state only
- **Complex CSS** — CSS Grid with named areas, complex `calc()`, and `clamp()` are simplified
- **Web fonts** — fonts not available in Figma are replaced with Inter
- **Cross-origin images** — some images may fail to load due to CORS; gradient fallbacks are used
- **Infinite scroll / lazy load** — extraction captures what's visible; scroll before extracting for full content
- **Responsive breakpoints** — captures at one viewport width (default 1440px)

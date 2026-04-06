# SVG Optimization

Deep-dive reference for cleaning up and optimizing SVG files. Covers SVGO configuration, manual cleanup patterns, and best practices for minimal file size.

## SVGO (SVG Optimizer)

SVGO is the industry-standard tool for SVG optimization. It removes unnecessary data without affecting rendering.

### Basic Usage

```bash
# Single file
npx svgo input.svg -o output.svg

# Batch — entire directory
npx svgo -f ./raw-svgs -o ./optimized-svgs

# In-place (overwrites original)
npx svgo input.svg

# Preview what would change (dry run)
npx svgo input.svg --pretty -o -
```

### Recommended SVGO Config

Create `svgo.config.js` in your project root:

```js
module.exports = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Keep viewBox — critical for responsive SVGs
          removeViewBox: false,
          // Keep IDs used for <use> references or CSS targeting
          cleanupIds: { minify: false },
        },
      },
    },
    // Remove dimensions when viewBox handles sizing
    'removeDimensions',
    // Sort attributes for consistency and diff-friendliness
    'sortAttrs',
    // Remove <title> only if you're adding accessibility attrs in code
    // 'removeTitle',
  ],
};
```

Then run: `npx svgo input.svg --config svgo.config.js`

### SVGO Plugin Reference

| Plugin | What it does | Keep/Remove? |
|--------|-------------|--------------|
| `removeDoctype` | Removes `<!DOCTYPE>` | ✅ Remove (default) |
| `removeXMLProcInst` | Removes `<?xml?>` declaration | ✅ Remove (default) |
| `removeComments` | Removes `<!-- comments -->` | ✅ Remove (default) |
| `removeMetadata` | Removes `<metadata>` blocks | ✅ Remove (default) |
| `removeEditorsNSData` | Removes Illustrator/Inkscape namespaces | ✅ Remove (default) |
| `removeEmptyGroups` | Removes `<g>` with no children | ✅ Remove (default) |
| `removeEmptyAttrs` | Removes attributes with empty values | ✅ Remove (default) |
| `removeViewBox` | Removes viewBox attribute | ❌ Override to keep! |
| `cleanupIds` | Minifies IDs (`layer1` → `a`) | ⚠️ Keep readable if using CSS/JS selectors |
| `removeTitle` | Removes `<title>` elements | ⚠️ Keep if SVG needs accessibility |
| `removeDesc` | Removes `<desc>` elements | ⚠️ Keep if SVG needs accessibility |
| `removeDimensions` | Removes width/height attrs | ✅ Add manually for responsive SVGs |
| `sortAttrs` | Alphabetizes attributes | ✅ Add manually for clean diffs |
| `convertPathData` | Optimizes path `d` attribute | ✅ Default — reduces precision |
| `mergePaths` | Combines adjacent paths | ✅ Default — reduces elements |
| `convertShapeToPath` | Converts `<rect>`/`<circle>` to `<path>` | ⚠️ Default — may lose semantic meaning |

### SVGO for Icon Libraries

Icons need special handling — keep them consistent:

```js
// svgo.config.icons.js
module.exports = {
  floatPrecision: 2,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          // Don't convert shapes — keep <circle>, <rect> readable
          convertShapeToPath: false,
        },
      },
    },
    'removeDimensions',
    'sortAttrs',
    // Standardize: stroke="currentColor" for theming
    {
      name: 'addAttributesToSVGElement',
      params: {
        attributes: [{ fill: 'none' }, { stroke: 'currentColor' }, { 'stroke-width': '2' }],
      },
    },
  ],
};
```

---

## Manual Cleanup Patterns

When SVGO isn't enough, or you need surgical edits:

### 1. Remove Editor Metadata

Illustrator, Sketch, and Figma export bloated SVGs with proprietary attributes:

```xml
<!-- REMOVE these -->
<svg xmlns:sketch="http://www.bohemiancoding.com/sketch/ns" ...>
<svg xmlns:xlink="http://www.w3.org/1999/xlink" ...>  <!-- Only if no <use> elements -->
<metadata>...</metadata>
<defs><style>.cls-1{fill:#333}</style></defs>  <!-- Convert to inline attrs -->
data-name="Layer 1"
id="Layer_1"
```

### 2. Collapse Unnecessary Groups

```xml
<!-- Before: pointless nesting -->
<g>
  <g>
    <path d="..."/>
  </g>
</g>

<!-- After -->
<path d="..."/>
```

Only keep `<g>` when it carries meaningful attributes (transform, opacity, class).

### 3. Remove Default Values

These attributes do nothing — they're the SVG defaults:

```
fill-opacity="1"       → remove
stroke-opacity="1"     → remove
stroke-miterlimit="4"  → remove (default is 4)
stroke-dasharray="none" → remove
opacity="1"            → remove
fill-rule="nonzero"    → remove (default)
clip-rule="nonzero"    → remove (default)
```

### 4. Simplify Transforms

```xml
<!-- Before -->
<g transform="translate(0, 0)">  <!-- Identity transform, remove -->
<g transform="translate(10, 20) translate(5, 0)">  <!-- Combine -->

<!-- After -->
<g transform="translate(15, 20)">
```

### 5. Convert Inline Styles to Attributes

SVG attributes are smaller than CSS style blocks and easier to manipulate:

```xml
<!-- Before -->
<path style="fill:#333;stroke:#000;stroke-width:2"/>

<!-- After -->
<path fill="#333" stroke="#000" stroke-width="2"/>
```

---

## Decimal Precision

Fewer decimal places = smaller file, but too few = visible quality loss.

| SVG Type | Recommended Precision | Example |
|----------|----------------------|---------|
| Icons (24×24) | 1 decimal | `d="M11 11 L21.3 21.3"` |
| UI illustrations | 2 decimals | `d="M10.25 15.75 C20.5 30.25..."` |
| Detailed illustrations | 3 decimals | `d="M10.125 15.875..."` |
| Maps / complex paths | 2-3 decimals | Depends on zoom level |

SVGO handles this via `floatPrecision`:

```js
module.exports = {
  floatPrecision: 2,  // Global precision
  plugins: ['preset-default'],
};
```

---

## Before / After Example

**Before** (Figma export — 2.4 KB):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1"
  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <title>icon/search</title>
  <desc>Created with Sketch.</desc>
  <defs></defs>
  <g id="icon/search" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g id="Group" transform="translate(2.000000, 2.000000)" stroke="#000000"
      stroke-width="2.000000">
      <circle id="Oval" cx="9.000000" cy="9.000000" r="8.000000"></circle>
      <line x1="15.500000" y1="15.500000" x2="19.000000" y2="19.000000"
        id="Line" stroke-linecap="round"></line>
    </g>
  </g>
</svg>
```

**After** (optimized — 280 bytes, 88% reduction):

```xml
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="11" r="8"/>
  <path d="M17.5 17.5 21 21" stroke-linecap="round"/>
</svg>
```

Changes applied:
1. Removed XML declaration, Sketch metadata, `<desc>`, empty `<defs>`
2. Removed wrapping `<g>` elements (moved stroke attrs to root `<svg>`)
3. Removed `px` units (unnecessary in SVG)
4. Removed `.000000` decimal noise
5. Replaced `<line>` with shorter `<path>`
6. Removed `width`/`height` (viewBox handles sizing)
7. Changed `stroke="#000000"` to `stroke="currentColor"` for theming
8. Removed default attribute values (`stroke-width="1"`, `fill-rule="evenodd"`)

---

## SVG Security

SVGs from untrusted sources can contain malicious content:

```xml
<!-- Dangerous SVG elements -->
<script>alert('XSS')</script>
<foreignObject><body onload="..."/></foreignObject>
<svg onload="fetch('https://evil.com')">
<a href="javascript:alert(1)">
```

**Sanitization rules:**
- Strip `<script>`, `<foreignObject>`, `<iframe>` elements
- Strip `on*` event handler attributes (`onload`, `onclick`, etc.)
- Strip `javascript:` URLs in `href`/`xlink:href`
- Use a library: `DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true } })`
- When embedding user-uploaded SVGs, prefer `<img src>` over inline — `<img>` blocks scripts

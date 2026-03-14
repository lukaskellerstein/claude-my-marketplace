---
name: design-to-code
description: >
  Translate Figma designs into production code (React, HTML/CSS, Tailwind). Use when the user asks to
  "convert this design to code", "generate React components from Figma", "implement this UI",
  "code this design", or wants to turn a Figma frame into working frontend code. Handles auto-layout
  to flexbox mapping, component extraction, responsive patterns, and style generation.
---

# Design to Code

Convert Figma design data into clean, production-ready frontend code.

## When to Use

- User wants to convert a Figma frame/component into React, HTML, or CSS
- User asks to "implement this design", "code this UI", "turn this into a component"
- User has a Figma URL and wants working code from it
- User wants to understand how a design maps to CSS/flexbox

## When NOT to Use

- User wants to modify the Figma design itself → use **figma-bridge** skill
- User wants to extract just tokens/variables → use **design-tokens** skill

## Workflow

### Step 1: Get the design data

**From Figma REST API:**
```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/nodes?ids={node_id}" | jq '.nodes'
```

**From Plugin API (browser):**
```javascript
const node = figma.currentPage.selection[0];
// Inspect properties: type, layoutMode, fills, etc.
```

### Step 2: Map Figma properties to CSS

Use the mapping tables below to convert Figma properties into CSS.

### Step 3: Generate code

Output clean code in the user's preferred framework (React + CSS Modules, Tailwind, plain HTML/CSS, etc.).

## Figma → CSS Mapping

### Layout

| Figma Property | CSS Equivalent |
|---|---|
| `layoutMode: "HORIZONTAL"` | `display: flex; flex-direction: row;` |
| `layoutMode: "VERTICAL"` | `display: flex; flex-direction: column;` |
| `primaryAxisAlignItems: "MIN"` | `justify-content: flex-start;` |
| `primaryAxisAlignItems: "CENTER"` | `justify-content: center;` |
| `primaryAxisAlignItems: "MAX"` | `justify-content: flex-end;` |
| `primaryAxisAlignItems: "SPACE_BETWEEN"` | `justify-content: space-between;` |
| `counterAxisAlignItems: "MIN"` | `align-items: flex-start;` |
| `counterAxisAlignItems: "CENTER"` | `align-items: center;` |
| `counterAxisAlignItems: "MAX"` | `align-items: flex-end;` |
| `primaryAxisSizingMode: "AUTO"` | Main axis size is `fit-content` / auto |
| `primaryAxisSizingMode: "FIXED"` | Main axis has explicit size |
| `counterAxisSizingMode: "AUTO"` | Cross axis size is `fit-content` / auto |
| `counterAxisSizingMode: "FIXED"` | Cross axis has explicit size |
| `itemSpacing: N` | `gap: Npx;` |
| `paddingTop/Right/Bottom/Left` | `padding: Tpx Rpx Bpx Lpx;` |
| `layoutWrap: "WRAP"` | `flex-wrap: wrap;` |

### Sizing (child in auto-layout)

| Figma Behavior | CSS Equivalent |
|---|---|
| Fixed width/height | `width: Npx; height: Npx;` |
| Fill container (horizontal) | `flex: 1; align-self: stretch;` or `width: 100%;` |
| Hug contents | `width: fit-content;` (usually default) |
| `layoutGrow: 1` | `flex-grow: 1;` |
| `layoutAlign: "STRETCH"` | `align-self: stretch;` |

### Visual

| Figma Property | CSS Equivalent |
|---|---|
| Solid fill `{ r, g, b }` | `background-color: rgb(R, G, B);` |
| Gradient fill | `background: linear-gradient(...)` |
| Image fill | `background-image: url(...)` |
| `cornerRadius: N` | `border-radius: Npx;` |
| Individual corner radii | `border-radius: TL TR BR BL;` |
| `opacity: N` | `opacity: N;` |
| Stroke | `border: Wpx solid rgb(R, G, B);` |
| `strokeAlign: "INSIDE"` | `border` (default box-sizing) |
| `strokeAlign: "OUTSIDE"` | `outline: Wpx solid color;` or `box-shadow` |

### Effects

| Figma Effect | CSS Equivalent |
|---|---|
| `DROP_SHADOW` | `box-shadow: Xpx Ypx Rpx rgba(R,G,B,A);` |
| `INNER_SHADOW` | `box-shadow: inset Xpx Ypx Rpx rgba(R,G,B,A);` |
| `LAYER_BLUR` | `filter: blur(Rpx);` |
| `BACKGROUND_BLUR` | `backdrop-filter: blur(Rpx);` |

### Text

| Figma Property | CSS Equivalent |
|---|---|
| `fontName.family` | `font-family: '...';` |
| `fontName.style` (Regular/Bold/etc.) | `font-weight: 400/700/etc.;` |
| `fontSize` | `font-size: Npx;` |
| `lineHeight` (PIXELS) | `line-height: Npx;` |
| `lineHeight` (PERCENT) | `line-height: N%;` |
| `letterSpacing` | `letter-spacing: Nem;` |
| `textAlignHorizontal` | `text-align: left/center/right/justify;` |
| `textDecoration` | `text-decoration: none/underline/line-through;` |
| `textCase` | `text-transform: none/uppercase/lowercase/capitalize;` |

## Code Generation Patterns

### React Component

```jsx
function Card({ title, description, imageUrl }) {
  return (
    <div className={styles.card}>
      {imageUrl && <img src={imageUrl} alt="" className={styles.cardImage} />}
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardDescription}>{description}</p>
      </div>
    </div>
  );
}
```

### CSS Module

```css
.card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.cardImage {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.cardContent {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.cardTitle {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.cardDescription {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #6B7280;
  line-height: 1.5;
}
```

### Tailwind

```jsx
function Card({ title, description, imageUrl }) {
  return (
    <div className="flex flex-col rounded-xl bg-white shadow-md overflow-hidden">
      {imageUrl && <img src={imageUrl} alt="" className="w-full h-48 object-cover" />}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
```

## Tips

- Always inspect the Figma node data first before generating code
- Map auto-layout to flexbox — this is the most reliable translation
- Use semantic HTML elements (`nav`, `header`, `main`, `section`, `article`, `button`) not just `div`
- Extract repeated values as CSS variables or Tailwind theme values
- Handle responsive design by analyzing constraints and sizing modes
- When a design has multiple breakpoints, generate media queries or responsive utility classes
- For icons in the design, use the **icon-library** skill to get proper SVG icons rather than rasterizing them

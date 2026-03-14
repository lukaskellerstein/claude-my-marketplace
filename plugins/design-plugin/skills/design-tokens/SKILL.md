---
name: design-tokens
description: >
  Extract, generate, and manage design tokens (colors, typography, spacing, shadows, radii) from
  Figma files or design specifications. Outputs to CSS custom properties, Tailwind config,
  Style Dictionary JSON, or raw JSON. Use when the user asks to "extract tokens", "generate CSS
  variables from Figma", "create a Tailwind theme", "export design tokens", or "sync design to code".
---

# Design Tokens

Extract design tokens from Figma files and generate code-ready token files in various formats.

## When to Use

- User wants to extract colors, typography, spacing from a Figma file
- User asks to generate CSS custom properties or Tailwind config from a design
- User wants to create a Style Dictionary configuration
- User wants to sync design values into code

## When NOT to Use

- User wants to modify the design in Figma → use **figma-plugin-api** skill
- User wants to audit the design system for issues → use **design-system** skill

## Token Categories

### Colors

```json
{
  "color": {
    "primary": { "50": "#EFF6FF", "100": "#DBEAFE", "500": "#3B82F6", "900": "#1E3A8A" },
    "neutral": { "50": "#F9FAFB", "100": "#F3F4F6", "500": "#6B7280", "900": "#111827" },
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444"
  }
}
```

### Typography

```json
{
  "typography": {
    "fontFamily": { "sans": "Inter, system-ui, sans-serif", "mono": "JetBrains Mono, monospace" },
    "fontSize": { "xs": "12px", "sm": "14px", "base": "16px", "lg": "18px", "xl": "20px", "2xl": "24px", "3xl": "30px", "4xl": "36px" },
    "fontWeight": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
    "lineHeight": { "tight": 1.25, "normal": 1.5, "relaxed": 1.75 },
    "letterSpacing": { "tight": "-0.025em", "normal": "0", "wide": "0.025em" }
  }
}
```

### Spacing

```json
{
  "spacing": {
    "0": "0px", "1": "4px", "2": "8px", "3": "12px", "4": "16px",
    "5": "20px", "6": "24px", "8": "32px", "10": "40px", "12": "48px",
    "16": "64px", "20": "80px", "24": "96px"
  }
}
```

### Shadows

```json
{
  "shadow": {
    "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "base": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
  }
}
```

### Border Radius

```json
{
  "borderRadius": {
    "none": "0", "sm": "4px", "base": "8px", "md": "12px",
    "lg": "16px", "xl": "24px", "full": "9999px"
  }
}
```

## Extraction from Figma

### Via REST API (no browser needed)

```bash
# Get styles from Figma file
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/styles" | jq '.meta.styles'

# Get variables (design tokens stored as Figma variables)
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/variables/local"
```

### Via Plugin API (browser)

```javascript
// Get all local paint styles
const paintStyles = await figma.getLocalPaintStylesAsync();
const colors = paintStyles.map(s => ({
  name: s.name,
  color: s.paints[0]?.type === 'SOLID' ? s.paints[0].color : null,
  opacity: s.paints[0]?.opacity
}));

// Get all local text styles
const textStyles = await figma.getLocalTextStylesAsync();
const typography = textStyles.map(s => ({
  name: s.name,
  fontSize: s.fontSize,
  fontFamily: s.fontName.family,
  fontWeight: s.fontName.style,
  lineHeight: s.lineHeight,
  letterSpacing: s.letterSpacing
}));

// Get all local effect styles
const effectStyles = await figma.getLocalEffectStylesAsync();
const effects = effectStyles.map(s => ({
  name: s.name,
  effects: s.effects
}));

// Get all variables
const collections = await figma.variables.getLocalVariableCollectionsAsync();
```

## Output Formats

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-primary-50: #EFF6FF;
  --color-primary-500: #3B82F6;
  --color-primary-900: #1E3A8A;

  /* Typography */
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-size-base: 16px;
  --font-weight-bold: 700;
  --line-height-normal: 1.5;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

  /* Border Radius */
  --radius-sm: 4px;
  --radius-base: 8px;
  --radius-lg: 16px;
}
```

### Tailwind Config

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          500: '#3B82F6',
          900: '#1E3A8A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
    },
  },
};
```

### Style Dictionary JSON

```json
{
  "color": {
    "primary": {
      "50": { "value": "#EFF6FF", "type": "color" },
      "500": { "value": "#3B82F6", "type": "color" },
      "900": { "value": "#1E3A8A", "type": "color" }
    }
  },
  "size": {
    "spacing": {
      "1": { "value": "4px", "type": "dimension" },
      "2": { "value": "8px", "type": "dimension" }
    }
  }
}
```

## Conversion Utilities

### Figma color (0-1) to hex

```javascript
function figmaColorToHex({ r, g, b }) {
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
```

### Figma effect to CSS shadow

```javascript
function figmaEffectToCSS(effect) {
  if (effect.type === 'DROP_SHADOW') {
    const { r, g, b, a } = effect.color;
    return `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, ${a.toFixed(2)})`;
  }
  return '';
}
```

## Tips

- Always name tokens semantically (e.g., `primary-500`) not by appearance (`blue-500`)
- Extract tokens from Figma Variables first if available — they're the source of truth
- Include both light and dark mode values when the design has them
- Use the REST API for extraction (faster, no browser needed) and Plugin API only when you need access to local styles not exposed via REST

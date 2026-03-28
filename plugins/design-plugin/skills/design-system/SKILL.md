---
name: design-system
description: >
  Manage and audit design system consistency — color palettes, typography scales, spacing systems,
  accessibility (WCAG contrast checks), and component inventory. Use when the user asks to
  "check contrast ratios", "audit my design system", "create a color palette", "generate a type scale",
  "check accessibility", "WCAG compliance", or "review design consistency".
---

# Design System

Tools and patterns for building, managing, and auditing design systems. Covers color, typography, spacing, accessibility, and component consistency.

## When to Use

- User wants to create or extend a color palette
- User wants to check WCAG contrast compliance
- User asks about typography scales or spacing systems
- User wants to audit design consistency across a project or Figma file
- User wants to generate a design system from scratch

## When NOT to Use

- User wants to extract existing tokens from Figma → use **figma-plugin/design-tokens** skill
- User wants to convert a specific design to code → use **figma-plugin/design-to-code** skill

## Color Systems

### Generating a Color Palette

Given a primary color, generate a full scale (50-950):

```javascript
// HSL-based palette generation
function generatePalette(baseHue, baseSat) {
  return {
    50:  `hsl(${baseHue}, ${baseSat}%, 97%)`,
    100: `hsl(${baseHue}, ${baseSat}%, 93%)`,
    200: `hsl(${baseHue}, ${baseSat}%, 85%)`,
    300: `hsl(${baseHue}, ${baseSat}%, 72%)`,
    400: `hsl(${baseHue}, ${baseSat}%, 60%)`,
    500: `hsl(${baseHue}, ${baseSat}%, 50%)`,
    600: `hsl(${baseHue}, ${baseSat}%, 42%)`,
    700: `hsl(${baseHue}, ${baseSat}%, 34%)`,
    800: `hsl(${baseHue}, ${baseSat}%, 26%)`,
    900: `hsl(${baseHue}, ${baseSat}%, 18%)`,
    950: `hsl(${baseHue}, ${baseSat}%, 10%)`,
  };
}
```

### Semantic Color Mapping

```
primary   → Main brand color, CTAs, links
secondary → Supporting brand color
neutral   → Text, backgrounds, borders
success   → #10B981 family — confirmations, positive states
warning   → #F59E0B family — caution, pending states
error     → #EF4444 family — errors, destructive actions
info      → #3B82F6 family — informational messages
```

## Accessibility — WCAG Contrast

### Contrast Ratio Requirements

| Level | Normal Text (< 18px) | Large Text (>= 18px bold or >= 24px) |
|---|---|---|
| **AA** | 4.5:1 minimum | 3:1 minimum |
| **AAA** | 7:1 minimum | 4.5:1 minimum |
| **UI components** | 3:1 minimum | 3:1 minimum |

### Calculating Contrast Ratio

```javascript
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(...rgb1);
  const l2 = luminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Usage
const ratio = contrastRatio([255, 255, 255], [59, 130, 246]); // white on blue
// Returns ~3.44 — passes AA for large text, fails for normal text
```

### Common Accessible Combinations

| Background | Text Color | Ratio | AA Normal | AA Large |
|---|---|---|---|---|
| `#FFFFFF` | `#111827` (gray-900) | 18.4:1 | Pass | Pass |
| `#FFFFFF` | `#374151` (gray-700) | 10.3:1 | Pass | Pass |
| `#FFFFFF` | `#6B7280` (gray-500) | 5.0:1 | Pass | Pass |
| `#FFFFFF` | `#9CA3AF` (gray-400) | 3.0:1 | Fail | Pass |
| `#FFFFFF` | `#3B82F6` (blue-500) | 3.4:1 | Fail | Pass |
| `#FFFFFF` | `#2563EB` (blue-600) | 4.6:1 | Pass | Pass |
| `#111827` | `#FFFFFF` | 18.4:1 | Pass | Pass |
| `#1F2937` | `#D1D5DB` (gray-300) | 8.2:1 | Pass | Pass |

## Typography Scale

### Modular Scale

Common ratios for type scales:

| Ratio | Name | Scale |
|---|---|---|
| 1.067 | Minor Second | Very tight |
| 1.125 | Major Second | Tight, good for UI |
| 1.200 | Minor Third | Balanced |
| 1.250 | Major Third | Popular default |
| 1.333 | Perfect Fourth | Generous |
| 1.500 | Perfect Fifth | Very dramatic |

### Standard UI Type Scale (Major Third)

```
xs:   12px  — Captions, labels, helper text
sm:   14px  — Secondary text, table cells
base: 16px  — Body text (root)
lg:   18px  — Lead paragraphs, subheadings
xl:   20px  — Section headings (H4)
2xl:  24px  — Page subheadings (H3)
3xl:  30px  — Page headings (H2)
4xl:  36px  — Hero headings (H1)
5xl:  48px  — Display headings
```

### Line Height Guidelines

- **Headings** (>= 24px): `line-height: 1.2 – 1.3`
- **Body text** (14-18px): `line-height: 1.5 – 1.6`
- **Small text** (< 14px): `line-height: 1.6 – 1.8`
- **Single-line UI** (buttons, inputs): `line-height: 1`

## Spacing System

### 4px Grid (Recommended)

```
0:  0px      8:  32px
1:  4px      10: 40px
2:  8px      12: 48px
3:  12px     14: 56px
4:  16px     16: 64px
5:  20px     20: 80px
6:  24px     24: 96px
```

### Spacing Usage Guidelines

| Context | Recommended Spacing |
|---|---|
| Inline elements (icon + text) | 4-8px |
| Form field internal padding | 8-12px |
| Between form fields | 12-16px |
| Card internal padding | 16-24px |
| Between cards | 16-24px |
| Section padding | 32-64px |
| Page margins | 16-24px (mobile), 32-64px (desktop) |

## Design Audit Checklist

When auditing any design or codebase for design system compliance:

1. **Color consistency**
   - Are all colors from the defined palette?
   - Are there one-off colors not in the system?
   - Do text colors meet WCAG AA contrast requirements?

2. **Typography consistency**
   - Are all text sizes from the type scale?
   - Are fonts limited to the defined font families?
   - Are font weights from the defined set?

3. **Spacing consistency**
   - Do padding/margins align to the spacing grid (4px or 8px)?
   - Is spacing consistent across similar components?

4. **Component usage**
   - Are instances used instead of detached copies?
   - Are there duplicate or near-duplicate components?
   - Are component names following naming conventions?

5. **Accessibility**
   - Contrast ratios for all text/background combinations
   - Touch targets >= 44x44px for interactive elements
   - Focus states defined for all interactive components

## Auditing via Figma Plugin API

For Figma-specific auditing, use **figma-plugin/figma-bridge** to execute these scripts in the browser:

```javascript
// Find all unique colors in use
const allNodes = figma.currentPage.findAll();
const colors = new Set();
allNodes.forEach(node => {
  if ('fills' in node) {
    node.fills.forEach(fill => {
      if (fill.type === 'SOLID' && fill.visible !== false) {
        const hex = figmaColorToHex(fill.color);
        colors.add(hex);
      }
    });
  }
});
console.log('Unique colors:', [...colors]);

// Find all font sizes in use
const textNodes = figma.currentPage.findAll(n => n.type === 'TEXT');
const fontSizes = new Set();
textNodes.forEach(node => {
  if (typeof node.fontSize === 'number') {
    fontSizes.add(node.fontSize);
  }
});
console.log('Font sizes:', [...fontSizes].sort((a,b) => a-b));

// Find detached instances (components used as frames)
const detached = figma.currentPage.findAll(n =>
  n.type === 'FRAME' && n.name.startsWith('Component/')
);
console.log('Possibly detached components:', detached.length);
```

## Tips

- Build the palette from a single primary hue and derive the rest systematically
- Always test contrast ratios at the actual font sizes used in the design
- In Figma, use Variables for tokens — they support light/dark mode natively
- Spacing should follow a consistent grid (4px is the industry standard)
- When in doubt about a color's accessibility, darken it — it's better to be safe

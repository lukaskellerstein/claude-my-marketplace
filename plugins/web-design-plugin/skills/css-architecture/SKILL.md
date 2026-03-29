---
name: css-architecture
description: Project-level CSS architecture for React/Vite websites — Tailwind CSS configuration with design tokens, shadcn/ui theming, CSS custom properties, and responsive strategy. Tailwind-first approach. Use when setting up global styles for a web design project.
when-to-use:
  - Setting up CSS for a new React/Vite project
  - Mapping a styleguide/design system to Tailwind config
  - Configuring shadcn/ui theme
  - Defining responsive breakpoint strategy
  - Creating global styles and CSS custom properties
  - Design document needs CSS architecture section
---

# CSS Architecture

Project-level CSS strategy for React/Vite websites. This skill converts styleguide output (colors, fonts, spacing) into a working Tailwind + shadcn/ui foundation.

---

## 1. Philosophy

**Tailwind-first with CSS custom properties for design tokens.**

Core principles:

- **Tailwind is the styling layer.** All visual styles are expressed through Tailwind utility classes. No inline `style=` attributes. No separate CSS files per component.
- **CSS custom properties are the token layer.** Design tokens from the styleguide become CSS variables in `globals.css`. Tailwind references these variables. This decouples the design system from the implementation.
- **shadcn/ui is the component primitive layer.** UI components come from shadcn/ui, themed via CSS variables to match the styleguide. Never build from scratch what shadcn provides.
- **No SCSS.** PostCSS + Tailwind handles everything. Only introduce SCSS if the project has a hard dependency on it.
- **Dark mode is a first-class citizen.** All color tokens have light and dark variants from day one, even if dark mode ships later.

### Token Flow

```
Styleguide (hex colors, font names, spacing scale)
    ↓
CSS Custom Properties (HSL values in globals.css)
    ↓
Tailwind Config (references CSS variables)
    ↓
Components (use Tailwind utility classes)
```

This means changing a brand color is a single edit in `globals.css` — it cascades through Tailwind into every component automatically.

---

## 2. CSS Architecture Output Template

When producing the CSS Architecture section of a design document, use this structure:

```markdown
### CSS Architecture

#### Design Tokens (CSS Custom Properties)

All colors use HSL format without the `hsl()` wrapper (shadcn convention).

```css
@layer base {
  :root {
    /* Brand Colors */
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    /* Semantic Colors */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    /* Surface Colors */
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* UI Colors */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    /* Radius */
    --radius: 0.5rem;

    /* Typography */
    --font-heading: 'Inter', sans-serif;
    --font-body: 'Inter', sans-serif;

    /* Spacing Scale (if non-standard) */
    --section-gap: 6rem;
    --content-max-width: 1200px;
  }

  .dark {
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode overrides for all tokens */
  }
}
```

#### Tailwind Config Extensions

```js
// tailwind.config.js — extensions mapped from styleguide
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... all color tokens
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      spacing: {
        'section': 'var(--section-gap)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
}
```

#### Global Styles

```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-body;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-heading;
  }
}
```

#### Component Theme

shadcn components to install:
- Button, Card, Badge (core)
- NavigationMenu, Sheet (navigation)
- Input, Textarea, Select (forms)
- Dialog, Toast (feedback)
- Accordion, Tabs (content)
- Separator, ScrollArea (layout)

Theme overrides: [specific customizations per component]

#### Responsive Strategy

- Mobile-first breakpoints (Tailwind defaults)
- Container max-width: 1200px centered
- Grid: 1col (mobile) → 2col (md) → 3col (lg)
- Typography scales down 15-20% on mobile
```

---

## 3. Workflow

Follow these steps when building the CSS architecture for a project:

### Step A: Receive Styleguide Input

The styleguide skill produces:
- Color palette (hex values with semantic names)
- Typography (font families, size scale, weights)
- Spacing system (base unit and scale)
- Border radii and shadow definitions
- Any brand-specific design constraints

### Step B: Convert Colors to HSL

shadcn/ui requires HSL values without the `hsl()` wrapper:

```
Styleguide: #1a1a2e → HSL: 240 27% 14%
Styleguide: #e94560 → HSL: 350 80% 59%
```

Every color must have a companion `*-foreground` value that ensures readable contrast (WCAG AA minimum: 4.5:1 for text, 3:1 for large text).

### Step C: Map to CSS Custom Properties

Write all tokens into `src/index.css` (or `src/globals.css`):

- Use the shadcn variable naming convention (--primary, --secondary, --accent, --muted, --destructive, --background, --foreground, --card, --popover, --border, --input, --ring, --radius)
- Add project-specific tokens beyond the shadcn set (--font-heading, --font-body, custom spacing, etc.)
- Include `.dark` overrides for every token

### Step D: Extend Tailwind Config

Map CSS variables into `tailwind.config.js`:

- Colors reference `hsl(var(--token-name))`
- Fonts reference `var(--font-name)`
- Spacing, radius, shadows extend the default theme
- Add any custom keyframes/animations

### Step E: Configure shadcn

- Run `npx shadcn@latest init` with the Vite + React preset
- Select components needed for the design
- Verify `components.json` paths match the project structure

### Step F: Define Global Styles

In `globals.css`:

- Base resets (border-box, smooth scrolling)
- Default body styles using Tailwind utilities
- Heading font family application
- Focus visible styles for accessibility
- Selection color overrides
- Scrollbar styling (if design specifies)

### Step G: Define Responsive Strategy

Document:

- Which Tailwind breakpoints are used
- Container strategy (max-width, padding)
- Layout shift patterns (what changes at each breakpoint)
- Typography scaling approach (clamp or breakpoint-based)
- Touch target sizes for mobile

---

## 4. Cross-References

- **Tailwind Config Details:** `references/tailwind-config.md` — full configuration guide with all extension patterns
- **shadcn Theming:** `references/shadcn-theming.md` — CSS variable system, component list, dark mode setup
- **Responsive Strategy:** `references/responsive-strategy.md` — breakpoints, patterns, container queries, testing
- **Styleguide Skill** (design-plugin): produces the color, typography, and spacing inputs this skill consumes
- **Animation System Skill** (web-design-plugin): handles motion/animation CSS that layers on top of this foundation

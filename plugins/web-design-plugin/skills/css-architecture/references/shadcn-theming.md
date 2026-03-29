# shadcn/ui Theme Customization

Complete guide to setting up and customizing shadcn/ui theming for React/Vite projects.

---

## shadcn Setup with Vite

### Installation

```bash
npx shadcn@latest init
```

When prompted, select:
- **Style:** Default (or New York for denser UI)
- **Base color:** Slate (or match closest to styleguide)
- **CSS variables:** Yes
- **Tailwind CSS config location:** tailwind.config.js
- **Components location:** src/components/ui
- **Utils location:** src/lib/utils

### components.json

After init, verify `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

Key settings:
- `rsc: false` — Vite does not use React Server Components
- `tsx: true` — TypeScript with JSX
- `cssVariables: true` — Always use CSS variables for theming
- Aliases must match `vite.config.ts` path aliases

### Adding Components

```bash
# Add individual components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add navigation-menu

# Add multiple at once
npx shadcn@latest add button card badge input textarea select dialog toast accordion tabs separator scroll-area sheet navigation-menu
```

Components are copied into `src/components/ui/` — they are not a dependency. You own the code and can modify it freely.

---

## CSS Variable System

shadcn uses a specific CSS variable pattern: HSL values without the `hsl()` function wrapper. The `hsl()` is applied in Tailwind config so opacity modifiers like `bg-primary/50` work correctly.

### Complete Variable Set

```css
@layer base {
  :root {
    /* ─── Page Background & Text ────────────── */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    /* ─── Card Surfaces ─────────────────────── */
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    /* ─── Popover Surfaces ──────────────────── */
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* ─── Primary Action Color ──────────────── */
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    /* ─── Secondary Action Color ────────────── */
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    /* ─── Muted / Subdued Elements ──────────── */
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    /* ─── Accent / Highlight ────────────────── */
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    /* ─── Destructive / Error ───────────────── */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    /* ─── Borders & Inputs ──────────────────── */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    /* ─── Border Radius ─────────────────────── */
    --radius: 0.5rem;

    /* ─── Chart Colors (shadcn charts) ──────── */
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;

    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

### Why HSL Without the Wrapper?

The Tailwind config wraps variables in `hsl()`:

```js
colors: {
  primary: {
    DEFAULT: 'hsl(var(--primary))',
  },
}
```

This allows Tailwind's opacity modifiers to work:

```html
<!-- bg-primary/50 compiles to: background-color: hsl(222.2 47.4% 11.2% / 0.5) -->
<div class="bg-primary/50">Semi-transparent primary</div>
```

If you stored the full `hsl(222.2 47.4% 11.2%)` in the variable, opacity modifiers would break.

---

## Mapping Styleguide to shadcn Variables

### Step-by-Step Process

**1. Gather styleguide colors:**

```
Brand Primary:    #1a1a2e
Brand Secondary:  #16213e
Accent:           #e94560
Background:       #f8f9fa
Text:             #1a1a2e
Muted Text:       #6c757d
Border:           #dee2e6
Error:            #dc3545
```

**2. Convert each hex to HSL:**

Use the conversion function below or an online tool.

```
#1a1a2e → 240 27% 14%
#16213e → 218 47% 16%
#e94560 → 350 80% 59%
#f8f9fa → 210 17% 98%
#6c757d → 208 7% 46%
#dee2e6 → 210 14% 89%
#dc3545 → 354 70% 54%
```

**3. Assign to shadcn variables:**

```css
:root {
  --background: 210 17% 98%;           /* #f8f9fa */
  --foreground: 240 27% 14%;           /* #1a1a2e */
  --primary: 240 27% 14%;              /* #1a1a2e — brand primary */
  --primary-foreground: 210 17% 98%;   /* White text on primary */
  --secondary: 218 47% 16%;            /* #16213e */
  --secondary-foreground: 210 17% 98%;
  --accent: 350 80% 59%;               /* #e94560 */
  --accent-foreground: 0 0% 100%;      /* White text on accent */
  --muted: 210 14% 95%;                /* Lighter version of border */
  --muted-foreground: 208 7% 46%;      /* #6c757d */
  --destructive: 354 70% 54%;          /* #dc3545 */
  --destructive-foreground: 0 0% 100%;
  --border: 210 14% 89%;               /* #dee2e6 */
  --input: 210 14% 89%;
  --ring: 350 80% 59%;                 /* Accent for focus rings */
  --card: 0 0% 100%;                   /* White cards */
  --card-foreground: 240 27% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 27% 14%;
  --radius: 0.5rem;
}
```

**4. Determine foreground colors:**

Every `--*-foreground` must have sufficient contrast against its parent color. Rules of thumb:

| Background Lightness | Foreground |
|---------------------|------------|
| > 60% | Use dark foreground (the --foreground value) |
| < 40% | Use light foreground (white or near-white) |
| 40-60% | Test both, pick one with > 4.5:1 contrast ratio |

---

## HSL Conversion

### JavaScript Conversion Function

Use this to convert hex colors from the styleguide to the HSL format shadcn expects:

```js
/**
 * Convert hex color to HSL string for shadcn CSS variables.
 * Returns format: "210 40% 98%" (no hsl() wrapper)
 */
function hexToShadcnHSL(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) * 60
        break
      case g:
        h = ((b - r) / diff + 2) * 60
        break
      case b:
        h = ((r - g) / diff + 4) * 60
        break
    }
  }

  // Round to match shadcn precision
  const hRound = Math.round(h * 10) / 10
  const sRound = Math.round(s * 1000) / 10
  const lRound = Math.round(l * 1000) / 10

  return `${hRound} ${sRound}% ${lRound}%`
}

// Usage:
// hexToShadcnHSL('#1a1a2e') → "240 27.3% 14.1%"
// hexToShadcnHSL('#e94560') → "350.3 79.7% 59%"
```

### Quick Reference: Common Colors

| Color | Hex | HSL (shadcn format) |
|-------|-----|---------------------|
| Pure white | #ffffff | 0 0% 100% |
| Pure black | #000000 | 0 0% 0% |
| Soft white | #f8f9fa | 210 16.7% 97.6% |
| Near black | #0f172a | 222.2 84% 4.9% |
| Slate gray | #64748b | 215 16.3% 46.9% |
| Light gray | #f1f5f9 | 210 40% 96.1% |
| Red | #ef4444 | 0 84.2% 60.2% |
| Blue | #3b82f6 | 217.2 91.2% 59.8% |
| Green | #22c55e | 142.1 76.2% 36.3% |

---

## Common shadcn Components for Web Design

### Navigation

```bash
npx shadcn@latest add navigation-menu sheet button
```

- **NavigationMenu** — Desktop horizontal navigation with dropdown menus
- **Sheet** — Mobile slide-out menu (hamburger menu)
- **Button** — CTA buttons throughout the site

```tsx
// Desktop nav + mobile hamburger pattern
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu'
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

function Header() {
  return (
    <header className="sticky top-0 z-header border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink href="#features">Features</NavigationMenuLink>
            </NavigationMenuItem>
            {/* ... */}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col gap-4 pt-8">
              <a href="#features">Features</a>
              {/* ... */}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
```

### Content Components

```bash
npx shadcn@latest add card accordion tabs badge separator
```

- **Card** — Feature cards, pricing cards, testimonials
- **Accordion** — FAQ sections
- **Tabs** — Tabbed content sections
- **Badge** — Labels, tags, status indicators
- **Separator** — Visual dividers

```tsx
// Feature card with badge
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function FeatureCard({ title, description, badge, icon: Icon }) {
  return (
    <Card className="group transition-shadow hover:shadow-card-hover">
      <CardHeader>
        {badge && <Badge variant="secondary" className="w-fit">{badge}</Badge>}
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-heading-sm">{title}</CardTitle>
        <CardDescription className="text-body">{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
```

### Form Components

```bash
npx shadcn@latest add input textarea select button label
```

- **Input** — Text fields
- **Textarea** — Multi-line text
- **Select** — Dropdown selectors
- **Button** — Submit / action buttons
- **Label** — Form field labels

### Feedback Components

```bash
npx shadcn@latest add dialog toast alert
```

- **Dialog** — Modals, confirmations
- **Toast** — Notification toasts (via Sonner)
- **Alert** — Inline alerts and callouts

### Layout Components

```bash
npx shadcn@latest add separator scroll-area
```

- **Separator** — Horizontal/vertical dividers
- **ScrollArea** — Custom styled scrollable containers

---

## Component Customization

### Via CSS Variables (Global)

Change the look of all components by modifying CSS variables:

```css
:root {
  --radius: 0.75rem;  /* Rounder corners globally */
}
```

### Via className (Per Instance)

Override specific instances with Tailwind classes:

```tsx
<Button className="rounded-full px-8 text-lg">
  Get Started
</Button>

<Card className="border-2 border-primary/20 bg-primary/5">
  {/* Accented card */}
</Card>
```

### Via Component Source (Structural)

Since shadcn components live in your codebase, you can edit them directly:

```tsx
// src/components/ui/button.tsx
// Modify the variants object to add custom variants
const buttonVariants = cva(
  'inline-flex items-center justify-center ...',
  {
    variants: {
      variant: {
        default: '...',
        // Add a custom variant
        gradient: 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        // Add a custom size
        xl: 'h-14 px-8 text-lg rounded-xl',
      },
    },
  }
)
```

### Priority of Customization Approaches

1. **CSS variables** — For theme-wide changes (colors, radius)
2. **className prop** — For per-instance overrides
3. **Component source edit** — For adding new variants or structural changes
4. **Wrapper component** — For project-specific composites (e.g., `<FeatureCard>` wrapping `<Card>`)

---

## Dark Mode

### Toggle Implementation

```tsx
// src/components/theme-toggle.tsx
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Check for saved preference or system preference
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const newDark = !dark
    setDark(newDark)
    document.documentElement.classList.toggle('dark', newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle}>
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export { ThemeToggle }
```

### Prevent Flash of Wrong Theme

Add this script to `index.html` before the React bundle loads:

```html
<head>
  <script>
    (function() {
      const saved = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (saved === 'dark' || (!saved && prefersDark)) {
        document.documentElement.classList.add('dark')
      }
    })()
  </script>
</head>
```

### Dark Mode Variable Overrides

When mapping styleguide to dark mode, follow these patterns:

| Light Mode | Dark Mode Approach |
|------------|-------------------|
| White background | Dark navy/charcoal (not pure black) |
| Dark text | Light gray (not pure white — reduce eye strain) |
| Bright primary | Slightly desaturated or lighter variant |
| Light borders | Subtle dark borders (higher lightness than background) |
| White cards | Slightly lighter than background |
| Colored accents | Keep hue, adjust saturation/lightness |

Example dark mode transformation:

```css
.dark {
  /* Background: not pure black, use a tinted dark */
  --background: 222.2 84% 4.9%;      /* Deep navy */
  --foreground: 210 40% 98%;          /* Near-white */

  /* Cards slightly lighter than background */
  --card: 222.2 47% 8%;
  --card-foreground: 210 40% 98%;

  /* Primary: lighter in dark mode for visibility */
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;

  /* Borders: visible but subtle */
  --border: 217.2 32.6% 17.5%;

  /* Muted: darker but distinguishable */
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
}
```

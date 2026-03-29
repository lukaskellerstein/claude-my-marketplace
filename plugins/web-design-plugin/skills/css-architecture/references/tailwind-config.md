# Tailwind Configuration Guide

Complete reference for configuring Tailwind CSS in a React/Vite project with design tokens.

---

## Project Setup

Initialize a Vite + React + Tailwind project from scratch:

```bash
# Create Vite project
npm create vite@latest my-project -- --template react-ts
cd my-project

# Install Tailwind CSS v4 (Vite plugin)
npm install tailwindcss @tailwindcss/vite

# Or Tailwind CSS v3 (PostCSS)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install shadcn dependencies
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge

# Install shadcn CLI
npx shadcn@latest init
```

### Vite Config (v4 — Vite plugin)

```js
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### PostCSS Config (v3)

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### CSS Entry Point

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Design Token Mapping

The core pattern: styleguide values become CSS custom properties, and Tailwind references those properties.

### Full tailwind.config.js Template

```js
// tailwind.config.js
import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    // Override the default container
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1200px', // Often narrower than Tailwind default
      },
    },
    extend: {
      // ─── Colors ────────────────────────────────
      // Map from CSS custom properties (HSL without wrapper)
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Project-specific brand colors (beyond shadcn set)
        // brand: {
        //   50: 'hsl(var(--brand-50))',
        //   100: 'hsl(var(--brand-100))',
        //   ...
        // },
      },

      // ─── Typography ────────────────────────────
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        // Map from styleguide type scale
        // Format: [fontSize, { lineHeight, letterSpacing?, fontWeight? }]
        'display-xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'heading-xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-lg': ['1.875rem', { lineHeight: '1.25', fontWeight: '600' }],
        'heading': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
      },

      // ─── Spacing ───────────────────────────────
      spacing: {
        // Custom spacing tokens beyond Tailwind defaults
        // Use when the styleguide has specific section/layout spacing
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
        'section': '6rem',        // Section gap
        'section-sm': '4rem',     // Smaller section gap
        'section-lg': '8rem',     // Larger section gap
      },

      // ─── Border Radius ────────────────────────
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ─── Shadows ──────────────────────────────
      boxShadow: {
        // Map from design system shadow tokens
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px -4px rgba(0, 0, 0, 0.12)',
        'hard': '0 8px 32px -8px rgba(0, 0, 0, 0.16)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'glow': '0 0 24px -4px hsl(var(--primary) / 0.3)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 24px -8px rgba(0, 0, 0, 0.12)',
      },

      // ─── Keyframes ────────────────────────────
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },

      // ─── Animations ───────────────────────────
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'slide-in-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-right': 'slide-in-from-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'spin-slow': 'spin-slow 3s linear infinite',
      },

      // ─── Backdrop Blur ────────────────────────
      backdropBlur: {
        xs: '2px',
      },

      // ─── Z-Index ──────────────────────────────
      zIndex: {
        'header': '50',
        'overlay': '60',
        'modal': '70',
        'toast': '80',
        'tooltip': '90',
      },
    },
  },
  plugins: [
    tailwindcssAnimate, // Required for shadcn animations
    // require('@tailwindcss/typography'),       // If using prose content
    // require('@tailwindcss/container-queries'), // If using @container
  ],
}
```

---

## Custom Utility Classes

Use `@layer utilities` for project-specific utilities that Tailwind doesn't provide:

```css
@layer utilities {
  /* Text balance for headings */
  .text-balance {
    text-wrap: balance;
  }

  /* Hide scrollbar but keep scrolling */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Gradient text */
  .text-gradient {
    @apply bg-clip-text text-transparent;
  }

  /* Focus visible ring (consistent across components) */
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  }

  /* Section padding (responsive) */
  .section-py {
    @apply py-16 md:py-20 lg:py-24;
  }

  /* Content container (narrower than page container) */
  .content-container {
    @apply mx-auto max-w-3xl px-4;
  }
}
```

When to use `@layer utilities` vs inline Tailwind:

| Scenario | Approach |
|----------|----------|
| Used in 3+ places with same class combo | `@layer utilities` |
| One-off style | Inline Tailwind classes |
| Needs pseudo-element or complex selector | `@layer utilities` |
| Responsive pattern repeated everywhere | `@layer utilities` |

---

## Tailwind Plugins

### tailwindcss-animate

Required for shadcn/ui. Provides animation utilities:

```bash
npm install tailwindcss-animate
```

Adds classes like `animate-in`, `animate-out`, `fade-in-0`, `slide-in-from-top-4`, etc.

### @tailwindcss/typography

For prose/long-form content (blog posts, articles):

```bash
npm install -D @tailwindcss/typography
```

```html
<article class="prose prose-lg dark:prose-invert max-w-none">
  <!-- Markdown-rendered content gets styled automatically -->
</article>
```

Customize the prose theme in Tailwind config:

```js
typography: {
  DEFAULT: {
    css: {
      '--tw-prose-body': 'hsl(var(--foreground))',
      '--tw-prose-headings': 'hsl(var(--foreground))',
      '--tw-prose-links': 'hsl(var(--primary))',
      '--tw-prose-bold': 'hsl(var(--foreground))',
      '--tw-prose-code': 'hsl(var(--primary))',
      maxWidth: 'none',
    },
  },
},
```

### @tailwindcss/container-queries

For component-level responsive design:

```bash
npm install -D @tailwindcss/container-queries
```

```html
<div class="@container">
  <div class="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
    <!-- Responds to container width, not viewport -->
  </div>
</div>
```

---

## Dark Mode Configuration

### Class-Based (Recommended)

```js
// tailwind.config.js
darkMode: ['class'],
```

Toggle via adding/removing `dark` class on `<html>`:

```tsx
// Toggle function
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark')
}
```

### CSS Variable Switching

All colors switch automatically when `.dark` is applied because they reference CSS variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

This means `bg-background` is white in light mode and dark in dark mode with zero class changes on components.

### System Preference Detection

```tsx
// Respect system preference on initial load
useEffect(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const stored = localStorage.getItem('theme')

  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark')
  }
}, [])
```

---

## Content Configuration

Proper content paths for Vite + React:

```js
content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}',
],
```

If using shadcn/ui components installed in `src/components/ui`:

```js
content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}',
  // shadcn components are inside src/ so they're already covered
],
```

Common mistake: forgetting `index.html` — Tailwind won't detect classes used directly in the HTML file.

---

## Utility Function: cn()

The standard class merging utility used with shadcn:

```ts
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Usage in components:

```tsx
import { cn } from '@/lib/utils'

function Button({ className, variant, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium',
        'ring-offset-background transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' && 'border border-input bg-background hover:bg-accent',
        className
      )}
      {...props}
    />
  )
}
```

This lets consumers override styles via `className` prop while keeping defaults intact.

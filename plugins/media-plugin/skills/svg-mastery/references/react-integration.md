# SVG in React / Web Frameworks

Patterns for integrating SVGs into React, Next.js, and Vite projects — from simple icon components to full icon systems.

---

## Reusable Icon Component (TypeScript)

The standard pattern for a type-safe, themeable SVG icon:

```tsx
import { forwardRef } from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

const SearchIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, color = 'currentColor', strokeWidth = 2, className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
);
SearchIcon.displayName = 'SearchIcon';

export default SearchIcon;
```

Usage:

```tsx
<SearchIcon />                           {/* 24px, inherits text color */}
<SearchIcon size={32} color="#6366f1" /> {/* 32px, custom color */}
<SearchIcon className="w-8 h-8 text-blue-500" /> {/* Tailwind sizing */}
```

---

## Icon Component System

When you have many SVG icons, build a centralized `<Icon>` component:

```tsx
// icons/index.ts — export all icons as a map
import SearchIcon from './SearchIcon';
import HomeIcon from './HomeIcon';
import UserIcon from './UserIcon';
import SettingsIcon from './SettingsIcon';

export const icons = {
  search: SearchIcon,
  home: HomeIcon,
  user: UserIcon,
  settings: SettingsIcon,
} as const;

export type IconName = keyof typeof icons;
```

```tsx
// components/Icon.tsx
import { icons, type IconName } from '../icons';

interface IconComponentProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | string;
}

export function Icon({ name, size = 24, ...props }: IconComponentProps) {
  const SvgIcon = icons[name];
  return <SvgIcon width={size} height={size} {...props} />;
}
```

Usage:

```tsx
<Icon name="search" />
<Icon name="home" size={32} className="text-blue-500" />
```

---

## Vite SVG Imports

### Method 1: vite-plugin-svgr (Recommended)

Import SVGs as React components:

```bash
npm install vite-plugin-svgr --save-dev
```

```ts
// vite.config.ts
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    svgr({
      svgrOptions: {
        // Add props spreading so you can pass className, etc.
        expandProps: 'end',
        // Use ref forwarding
        ref: true,
        // Use svgo for optimization
        svgo: true,
        svgoConfig: {
          plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }],
        },
      },
    }),
  ],
});
```

```tsx
// Import as React component
import SearchIcon from './assets/search.svg?react';

// Use like any component
<SearchIcon className="w-6 h-6 text-gray-500" />
```

TypeScript declaration (add to `src/vite-env.d.ts`):

```ts
declare module '*.svg?react' {
  import React from 'react';
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}
```

### Method 2: Raw String Import (Built-in Vite)

Import SVG as raw HTML string — useful for `dangerouslySetInnerHTML` or manual DOM insertion:

```tsx
import searchSvgRaw from './assets/search.svg?raw';

// Use with dangerouslySetInnerHTML (only for trusted SVGs!)
<div dangerouslySetInnerHTML={{ __html: searchSvgRaw }} />
```

**Warning:** Never use `?raw` + `dangerouslySetInnerHTML` with user-uploaded SVGs. Sanitize first with DOMPurify.

### Method 3: URL Import (Built-in Vite)

Import SVG as a URL for use in `<img>` tags:

```tsx
import searchUrl from './assets/search.svg';

<img src={searchUrl} alt="Search" width={24} height={24} />
```

This is the safest method for untrusted SVGs since `<img>` blocks script execution.

---

## Next.js SVG Handling

### With @svgr/webpack

```bash
npm install @svgr/webpack --save-dev
```

```js
// next.config.js
module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgo: true,
            svgoConfig: {
              plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }],
            },
          },
        },
      ],
    });
    return config;
  },
};
```

```tsx
import SearchIcon from './search.svg';
<SearchIcon className="w-6 h-6" />
```

### Without Extra Dependencies

For simple cases, just inline the SVG in a component — no build configuration needed.

---

## SVG + Tailwind CSS

Tailwind's utility classes work seamlessly with inline SVGs via `currentColor`:

### Sizing

```tsx
<svg className="w-6 h-6" viewBox="0 0 24 24">...</svg>    {/* 24px */}
<svg className="w-8 h-8" viewBox="0 0 24 24">...</svg>    {/* 32px */}
<svg className="w-12 h-12" viewBox="0 0 24 24">...</svg>   {/* 48px */}
<svg className="size-6" viewBox="0 0 24 24">...</svg>      {/* w-6 h-6 shorthand */}
```

### Coloring via currentColor

When the SVG uses `stroke="currentColor"` or `fill="currentColor"`:

```tsx
<svg className="text-gray-500 hover:text-gray-900 transition-colors"
  stroke="currentColor" fill="none" viewBox="0 0 24 24">
  ...
</svg>
```

Tailwind's `text-*` sets `color`, and `currentColor` inherits it.

### Direct Fill/Stroke Classes

Tailwind v3.3+ provides `fill-*` and `stroke-*` utilities:

```tsx
<svg className="fill-blue-500 stroke-blue-700" viewBox="0 0 24 24">...</svg>
```

### Responsive Icon with Tailwind

```tsx
<svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24">...</svg>
```

### Animation Utilities

```tsx
<svg className="animate-spin w-6 h-6" viewBox="0 0 24 24">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
</svg>
```

---

## SVG Sprites in React

For projects with many icons, sprites avoid duplicating SVG markup:

### Step 1: Create the Sprite File

```html
<!-- public/sprites.svg -->
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="icon-search" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="m21 21-4.3-4.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </symbol>
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2"/>
  </symbol>
  <!-- Add more symbols... -->
</svg>
```

### Step 2: Create a Sprite Icon Component

```tsx
interface SpriteIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number | string;
}

export function SpriteIcon({ name, size = 24, ...props }: SpriteIconProps) {
  return (
    <svg width={size} height={size} {...props}>
      <use href={`/sprites.svg#icon-${name}`} />
    </svg>
  );
}
```

### Step 3: Use It

```tsx
<SpriteIcon name="search" />
<SpriteIcon name="home" size={32} className="text-blue-500" />
```

**Benefits:** Single HTTP request for all icons, browser caches the sprite file, tiny component footprint.

**Limitation:** `<use>` can't cross-origin. The sprite must be same-origin or inline.

---

## Dynamic SVG Components

SVGs that change based on props or data:

### Conditional Paths

```tsx
function StatusIcon({ status }: { status: 'success' | 'error' | 'warning' }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      {status === 'success' && <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" />}
      {status === 'error' && <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" />}
      {status === 'warning' && (
        <>
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="16" r="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
```

### Data-Driven SVG

```tsx
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value));
  const barWidth = 40;
  const gap = 10;
  const height = 200;

  return (
    <svg viewBox={`0 0 ${data.length * (barWidth + gap)} ${height}`} className="w-full">
      {data.map((d, i) => (
        <rect
          key={d.label}
          x={i * (barWidth + gap)}
          y={height - (d.value / max) * height}
          width={barWidth}
          height={(d.value / max) * height}
          fill="currentColor"
          rx="4"
        />
      ))}
    </svg>
  );
}
```

---

## Testing SVGs in React

### Accessibility Test

```tsx
import { render, screen } from '@testing-library/react';

test('icon has accessible label', () => {
  render(<SearchIcon aria-label="Search" role="img" />);
  expect(screen.getByRole('img', { name: 'Search' })).toBeInTheDocument();
});
```

### Snapshot Test

```tsx
test('icon renders correctly', () => {
  const { container } = render(<SearchIcon size={32} />);
  expect(container.querySelector('svg')).toMatchSnapshot();
});
```

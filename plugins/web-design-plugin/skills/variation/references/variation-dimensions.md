# Variation Dimensions

Strategies for systematically varying each design dimension while maintaining coherence.

## Color Strategy Variations

### Approach 1: Mood Shift
Keep the same hue family but shift the emotional temperature:
- Base: Trust blue (#2563EB) → Variation: Energetic coral (#F97316)
- Base: Calm sage (#6B8F71) → Variation: Bold emerald (#059669)

### Approach 2: Light ↔ Dark Inversion
- Base: Light background with dark text → Variation: Dark background with light text
- Requires: recalculating all surface colors, adjusting shadows (glow vs drop), updating image overlays

### Approach 3: Saturation Shift
- Base: Vibrant saturated palette → Variation: Muted, desaturated palette (or vice versa)
- Affects: background surfaces, card colors, accent intensity

### Approach 4: Contrast Level
- Base: High contrast (black on white) → Variation: Low contrast (dark gray on light gray)
- Must verify WCAG compliance on every change

### Approach 5: Monochrome → Polychrome
- Base: Single-hue palette → Variation: Multi-hue complementary palette (or vice versa)

### Color Variation Checklist
When changing colors, update ALL of these:
- [ ] Primary, secondary, accent colors
- [ ] Background and surface colors
- [ ] Text colors (heading, body, muted)
- [ ] Border and divider colors
- [ ] Shadow colors and opacity
- [ ] Gradient directions and stops
- [ ] Dark mode palette (if applicable)
- [ ] Media prompt style prefix (color keywords)
- [ ] CSS custom properties in globals.css
- [ ] Tailwind config color extensions

## Typography Variations

### Approach 1: Personality Shift
- Base: Geometric sans-serif (Inter) → Variation: Humanist serif (Fraunces)
- Base: Modern clean (Space Grotesk) → Variation: Playful (Syne)

### Approach 2: Weight Strategy
- Base: Bold headings + regular body → Variation: Light headings + medium body
- Creates a completely different feel with the same fonts

### Approach 3: Scale Contrast
- Base: Moderate size ratio (1.25 Major Third) → Variation: Dramatic size ratio (1.5 Perfect Fifth)
- Affects heading sizes, visual hierarchy, whitespace needs

### Approach 4: Casing and Spacing
- Base: Sentence case, tight letter-spacing → Variation: All-caps headings, wide letter-spacing
- Small change, big visual impact

### Typography Variation Checklist
- [ ] Heading font family
- [ ] Body font family
- [ ] Font weight strategy (heading, subheading, body, caption)
- [ ] Type scale ratio
- [ ] Letter-spacing values
- [ ] Line-height adjustments
- [ ] Google Fonts import URL
- [ ] CSS font-family custom properties
- [ ] Tailwind fontFamily config

## Animation Intensity Variations

### Level 1: Minimal
- Page load: simple fade-in (CSS only)
- Scroll: no scroll-triggered animations
- Hover: subtle color/opacity changes
- Transitions: 200ms ease
- No GSAP dependency

### Level 2: Subtle (recommended default)
- Page load: hero content staggers in
- Scroll: sections fade + slide up on enter
- Hover: lift + shadow on cards
- Transitions: 300ms ease-out
- GSAP for scroll reveals only

### Level 3: Moderate
- Page load: orchestrated hero sequence (background → title → subtitle → CTA)
- Scroll: varied reveal directions per section, stagger on grids
- Hover: multi-property transitions (scale + shadow + border)
- Transitions: 400-600ms with custom easing
- GSAP ScrollTrigger + timelines

### Level 4: Dramatic
- Page load: full cinematic sequence with text splitting
- Scroll: parallax layers, scrub animations, pin sections
- Hover: complex progressions with multiple stages
- Transitions: 500-800ms with spring easing
- GSAP everything: SplitText, ScrollTrigger scrub, custom physics

### Level 5: Maximalist
- All of Level 4 plus:
- Continuous ambient animations (floating elements, gradients shifting)
- Page transitions between routes
- 3D transforms and perspective effects
- Cursor-following elements
- Sound design triggers (optional)

### Animation Variation Checklist
- [ ] Page load sequence (what, order, duration)
- [ ] Scroll reveal strategy (trigger type, direction, stagger)
- [ ] Hover effects (what properties animate)
- [ ] Transition durations and easing
- [ ] GSAP plugins needed (or CSS-only)
- [ ] prefers-reduced-motion fallback
- [ ] Performance budget (number of simultaneous animations)

## Spacing Density Variations

### Compact
- Section padding: 48-64px vertical
- Grid gaps: 16-24px
- Card padding: 16-24px
- Content max-width: 1200px
- More content visible per viewport
- Best for: dashboards, data-heavy pages, professional tools

### Standard
- Section padding: 80-96px vertical
- Grid gaps: 24-32px
- Card padding: 24-32px
- Content max-width: 1280px
- Balanced density
- Best for: most websites, marketing pages

### Spacious
- Section padding: 120-160px vertical
- Grid gaps: 32-48px
- Card padding: 32-48px
- Content max-width: 1024px
- Premium breathing room
- Best for: luxury brands, portfolios, editorial sites

### Spacing Variation Checklist
- [ ] Section vertical padding
- [ ] Grid gap values
- [ ] Card/component internal padding
- [ ] Content max-width
- [ ] Heading margin-bottom
- [ ] Paragraph spacing
- [ ] Tailwind spacing scale extensions

## Visual Texture Variations

### Flat / Clean
- No shadows or very subtle shadows
- Solid colors, no gradients
- Sharp corners (border-radius: 0-4px)
- Thin borders for separation
- Monochrome icons

### Soft / Modern
- Medium shadows with blur
- Subtle gradients (5-10% color shift)
- Rounded corners (8-16px)
- Light backgrounds for cards
- Duotone icons

### Rich / Premium
- Layered shadows (multiple shadow values)
- Bold gradients (multi-stop, diagonal)
- Large rounded corners (16-24px)
- Glassmorphism or blur effects
- Gradient or colored icons

### Texture Variation Checklist
- [ ] Box-shadow scale (none → sm → md → lg)
- [ ] Border-radius scale
- [ ] Gradient usage (none → subtle → bold)
- [ ] Border style (none → thin → decorative)
- [ ] Background treatment (solid → gradient → glass)
- [ ] Icon style (outline → filled → gradient)

## Generating Coherent Variations

When creating a variation, don't randomly mix dimensions. Choose a **coherent theme**:

| Theme | Color | Typography | Animation | Spacing | Texture |
|---|---|---|---|---|---|
| Dark Premium | Dark, gold accents | Serif heading, clean body | Subtle (L2) | Spacious | Rich |
| Bold Startup | Vibrant, high contrast | Geometric sans, heavy weights | Moderate (L3) | Standard | Soft |
| Clean Minimal | Muted, monochrome | Thin sans-serif, light weights | Minimal (L1) | Spacious | Flat |
| Playful Energy | Multi-color, saturated | Rounded/playful fonts | Dramatic (L4) | Compact | Soft |
| Corporate Trust | Navy/blue, conservative | Classic serif + sans pair | Subtle (L2) | Standard | Flat |
| Editorial Luxury | Black + one accent | Contrast serif, dramatic scale | Moderate (L3) | Spacious | Rich |

These are starting points — adjust each dimension to fit the specific project.

# Design Reference

## Color Palettes

Choose colors that match the topic — never default to generic blue. Each palette has a primary (dominant, 60-70% visual weight), secondary (supporting), and accent (sharp contrast, used sparingly).

| Theme | Primary | Secondary | Accent | Good For |
|-------|---------|-----------|--------|----------|
| **Midnight Executive** | `1E2761` | `CADCFC` | `FFFFFF` | Corporate, finance, strategy |
| **Forest & Moss** | `2C5F2D` | `97BC62` | `F5F5F5` | Sustainability, health, nature |
| **Coral Energy** | `F96167` | `F9E795` | `2F3C7E` | Marketing, launches, creative |
| **Warm Terracotta** | `B85042` | `E7E8D1` | `A7BEAE` | Architecture, lifestyle, warm brands |
| **Ocean Gradient** | `065A82` | `1C7293` | `21295C` | Tech, data, SaaS |
| **Charcoal Minimal** | `36454F` | `F2F2F2` | `212121` | Minimalist, editorial, luxury |
| **Teal Trust** | `028090` | `00A896` | `02C39A` | Healthcare, consulting, trust |
| **Berry & Cream** | `6D2E46` | `A26769` | `ECE2D0` | Beauty, culture, premium |
| **Sage Calm** | `84B59F` | `69A297` | `50808E` | Wellness, education, mindfulness |
| **Cherry Bold** | `990011` | `FCF6F5` | `2F3C7E` | Bold statements, urgency, retail |
| **Slate & Gold** | `2C3E50` | `BDC3C7` | `F39C12` | Investment, awards, achievements |
| **Deep Purple** | `2D1B69` | `8B5CF6` | `E0E7FF` | Innovation, AI, creative tech |
| **Warm Neutral** | `3D3D3D` | `D4C5B2` | `C17817` | Consulting, craft, heritage |
| **Nordic Blue** | `1A365D` | `4A90D9` | `EBF4FF` | Clean tech, nordic brands, clarity |

### Color Usage Rules

- **Dark/light sandwich**: Use dark backgrounds for title + conclusion slides, light for content slides. Or commit to dark throughout for a premium feel.
- **Dominance**: One color should dominate. Never give all colors equal weight.
- **Text on dark backgrounds**: Use white (`FFFFFF`) or very light variants of the secondary color.
- **Text on light backgrounds**: Use the primary color or a dark neutral (`333333`, `1A1A1A`).
- **Accent color**: Reserve for call-to-action elements, key numbers, icons, or small highlights. Never use as a background.

### CSS Custom Properties for Palettes

When using the HTML visual layer, set the palette via CSS custom properties:

```css
:root {
  --primary: #1E2761;
  --primary-dark: #0D1333;
  --secondary: #CADCFC;
  --accent: #FFFFFF;
  --bg-light: #F5F5F5;
}
```

This lets you change the entire deck's look by swapping a few values. See [html-templates.md](html-templates.md) for the full shared CSS foundation.

---

## Font Pairings

Pick a header font with personality and pair it with a clean body font. These are all safe system fonts available in PowerPoint and LibreOffice.

| Header Font | Body Font | Personality |
|-------------|-----------|-------------|
| Georgia | Calibri | Classic, editorial |
| Arial Black | Arial | Bold, direct |
| Calibri | Calibri Light | Clean, modern |
| Cambria | Calibri | Traditional, academic |
| Trebuchet MS | Calibri | Friendly, approachable |
| Impact | Arial | High-energy, headlines |
| Palatino | Garamond | Elegant, literary |
| Consolas | Calibri | Technical, code-adjacent |
| Verdana | Tahoma | Highly readable, web-safe |
| Franklin Gothic Medium | Book Antiqua | Magazine, professional |

---

## Typography Scale

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Title slide headline | 40–48pt | Bold | Can go bigger (60pt) for single-word impact |
| Slide title | 28–36pt | Bold | Consistent across all content slides |
| Section header | 20–24pt | Bold | Within a slide, for sub-sections |
| Body text | 14–16pt | Regular | Left-aligned, not centered |
| Bullet items | 14–16pt | Regular | Same as body |
| Captions / footnotes | 10–12pt | Regular | Muted color (lighter gray) |
| Big stat callout | 48–72pt | Bold | For standalone numbers |
| Stat label (below number) | 12–14pt | Regular | Describes what the number means |

### Typography Rules

- **Left-align body text and bullets** — center only titles and callout numbers.
- **Size contrast matters** — titles need 28pt+ to stand apart from 14pt body. If they look similar in size, the hierarchy is broken.
- **One font pair per deck** — never mix more than 2 font families.
- **Line height** — use `paraSpaceAfter` (not `lineSpacing`) for spacing between bullet items. Values of 6-10pt work well.

---

## Spacing

| Element | Value |
|---------|-------|
| Slide edge margins | 0.5" minimum on all sides |
| Between content blocks | 0.3–0.5" |
| Between title and content | 0.3–0.5" |
| Between bullet items | 6–10pt `paraSpaceAfter` |
| Card/shape internal padding | 0.2–0.3" |
| Between cards/columns | 0.3–0.4" |

### Spacing Rules

- **Leave breathing room** — don't fill every square inch. White space is a feature.
- **Consistent gaps** — pick either 0.3" or 0.5" as your standard gap and use it throughout.
- **Content zone** — the safe content area on a 16:9 slide is roughly x: 0.5–9.5, y: 0.5–5.125.
- **Footer zone** — if using a footer bar, it typically goes at y: 5.125 with height 0.5".

---

## Premium Design Techniques (Canva-Level Quality)

These techniques are what separate professional presentations from generic AI-generated slides. **Use them aggressively.**

The hybrid HTML/CSS + PptxGenJS workflow makes most of these techniques straightforward. Use the HTML visual layer for backgrounds and decorative elements, PptxGenJS for editable text.

### Full-Bleed Photo Backgrounds with Dark Overlay

The single most impactful technique. Use a relevant AI-generated or stock photo as a full-bleed background, then overlay a semi-transparent dark layer so text remains readable.

**In the HTML visual layer:**
```css
.slide-photo-bg {
  background-image: url('photo.jpg');
  background-size: cover;
  background-position: center;
}
.slide-photo-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}
```

**When to use:** Title slides, section dividers, closing slides, quote slides, any slide that needs visual impact. Aim for at least 2-3 photo-backed slides per deck.

### Gradient Backgrounds

Use CSS gradients in the HTML visual layer for rich, smooth color transitions that PptxGenJS can't produce natively.

```css
/* Linear gradient */
background: linear-gradient(135deg, #1E2761 0%, #0D1333 60%, #F96167 100%);

/* Radial gradient (spotlight) */
background: radial-gradient(ellipse at 30% 40%, #1E2761 0%, #0D1333 70%);

/* Multi-stop gradient */
background: linear-gradient(160deg, #0D1333 0%, #1E2761 40%, #2D1B69 100%);
```

Use gradients for title slides, closing slides, and any slide that needs visual richness without a photo.

### Half-Image Layouts (Split Slides)

Place a photo on one half (left or right) with content on the other. The photo should be full-height with no margins — edge-to-edge on its side. Use the HTML visual layer for the photo placement and accent strip.

### Decorative Geometric Shapes

Add subtle decorative elements to break up flat backgrounds. Use CSS in the HTML visual layer:

```css
/* Large transparent circle (partially off-slide) */
.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.12;
  width: 600px; height: 600px;
  top: -150px; right: -100px;
}

/* Diagonal accent strip */
.deco-diagonal {
  position: absolute;
  background: var(--accent);
  opacity: 0.3;
  width: 2200px; height: 8px;
  transform: rotate(-3deg);
  top: 850px; left: -100px;
}

/* Dot pattern */
.dot-grid {
  display: grid;
  grid-template-columns: repeat(5, 12px);
  gap: 16px;
}
.dot-grid span {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.4;
}
```

### Elevated Cards with Rounded Corners and Shadows

Use CSS `box-shadow` and `border-radius` in the HTML visual layer for modern card styling that PptxGenJS can't match:

```css
.card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* Glass-morphism card (on dark/photo backgrounds) */
.card-glass {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### Color-Blocked Sections

Instead of a plain white slide, split the slide into 2-3 horizontal or vertical color blocks using CSS:

```css
/* Top band (dark) */
.top-band {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 240px;
  background: var(--primary);
}
/* Title goes in the dark band, content in the light area below */
```

### CSS Design Reference

Key CSS properties for slide design in the HTML visual layer:

| Property | Use For |
|---|---|
| `linear-gradient()`, `radial-gradient()` | Rich background gradients |
| `box-shadow` | Elevated card depth |
| `border-radius` | Rounded cards and elements |
| `backdrop-filter: blur()` | Frosted glass overlays |
| `opacity` / `rgba()` | Transparent overlays and decorative shapes |
| `background-size: cover` | Full-bleed photo backgrounds |
| `transform: rotate()` | Diagonal accent elements |
| `CSS Grid` / `Flexbox` | Precise layout of decorative elements |
| CSS custom properties (`--var`) | Palette theming across all slides |

### Visual Rhythm Across the Deck

A Canva-quality deck follows a deliberate visual rhythm:

1. **Slide 1 (Title):** Full-bleed photo/gradient + dark overlay, large white text
2. **Slide 2-3 (Content):** Light background with cards or columns
3. **Slide 4 (Impact):** Dark background or another photo-backed slide — breaks monotony
4. **Slide 5-7 (Content):** Alternate between light/accent backgrounds, use split-image layouts
5. **Slide 8 (Data):** Chart on clean background
6. **Slide 9 (Quote/Testimonial):** Full-bleed photo + overlay
7. **Slide 10 (Closing):** Gradient or photo background, centered CTA

**Rule: Never have more than 2 consecutive slides with the same background treatment.**

---

## Common Design Mistakes to Avoid

1. **Repeating the same layout** — vary between columns, cards, callouts, and charts across slides.
2. **Centering body text** — left-align paragraphs and bullets. Center only titles.
3. **Weak size contrast** — if your title and body look similar in size, increase the title.
4. **Defaulting to blue** — choose colors that reflect the specific topic.
5. **Inconsistent spacing** — pick a standard gap and stick with it.
6. **Text-only slides** — every slide should have a visual element (shape, icon, chart, or image). **Use AI-generated images when no other visual is available.**
7. **Too many bullet points** — if a slide has more than 5 bullets, split it into two slides or use a different layout.
8. **Low-contrast text or icons** — test that text is legible against its background. Light gray on cream is unreadable.
9. **Accent lines under titles** — these are a hallmark of AI-generated slides. Use white space or background color changes instead.
10. **All slides with white backgrounds** — use the dark/light sandwich structure for visual rhythm.
11. **Flat, shadowless cards** — use CSS `box-shadow` in the HTML visual layer for depth.
12. **No photography** — professional decks use images. Generate topic-relevant images via AI for at least title, section divider, and closing slides.
13. **Generic stock imagery** — when generating images, make them specific to the topic. "Abstract blue wave" is lazy. "Aerial view of solar farm at sunset" is specific and impactful.

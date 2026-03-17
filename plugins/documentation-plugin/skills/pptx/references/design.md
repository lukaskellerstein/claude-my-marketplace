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
| Title slide headline | 40-48pt | Bold | Can go bigger (60pt) for single-word impact |
| Slide title | 28-36pt | Bold | Consistent across all content slides |
| Section header | 20-24pt | Bold | Within a slide, for sub-sections |
| Body text | 14-16pt | Regular | Left-aligned, not centered |
| Bullet items | 14-16pt | Regular | Same as body |
| Captions / footnotes | 10-12pt | Regular | Muted color (lighter gray) |
| Big stat callout | 48-72pt | Bold | For standalone numbers |
| Stat label (below number) | 12-14pt | Regular | Describes what the number means |

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
| Between content blocks | 0.3-0.5" |
| Between title and content | 0.3-0.5" |
| Between bullet items | 6-10pt `paraSpaceAfter` |
| Card/shape internal padding | 0.2-0.3" |
| Between cards/columns | 0.3-0.4" |

### Spacing Rules

- **Leave breathing room** — don't fill every square inch. White space is a feature.
- **Consistent gaps** — pick either 0.3" or 0.5" as your standard gap and use it throughout.
- **Content zone** — the safe content area on a 16:9 slide is roughly x: 0.5-9.5, y: 0.5-5.125.
- **Footer zone** — if using a footer bar, it typically goes at y: 5.125 with height 0.5".

---

## Premium Design Techniques

These techniques are what separate professional presentations from generic AI-generated slides. **Use them aggressively.**

### Full-Bleed Photo Backgrounds with Dark Overlay

The single most impactful technique. Use a relevant stock photo (sourced from Unsplash via the `image-sourcing` skill) as a full-bleed background, then overlay a semi-transparent dark RECTANGLE so text remains readable.

**PptxGenJS implementation:**

```javascript
// Load photo as background
const photoData = fs.readFileSync("photo.jpg");
slide.background = { data: "image/jpeg;base64," + photoData.toString("base64") };

// Dark overlay — semi-transparent black rectangle
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 5.625,
  fill: { color: "000000", transparency: 45 }
});

// Now add white text on top...
```

Adjust `transparency` (0-100) to control darkness. 40-50 works for most photos. Darker photos need less overlay (50-60 transparency), lighter photos need more (30-40 transparency).

**When to use:** Title slides, section dividers, closing slides, quote slides, any slide that needs visual impact. Aim for at least 2-3 photo-backed slides per deck.

### Gradient-Style Backgrounds

PptxGenJS doesn't support native gradient fills. Two approaches for rich, colorful backgrounds:

**Approach 1: Source or generate a gradient image** — use the `image-generation` skill to create a gradient background image at 1920x1080 (16:9), then use it as the slide background.

**Approach 2: Layered solid colors** — use multiple semi-transparent RECTANGLE shapes to create a gradient-like effect:

```javascript
// Base color
slide.background = { color: "1E2761" };

// Lighter overlay in bottom-right area
slide.addShape(pres.shapes.OVAL, {
  x: 5, y: 2, w: 8, h: 6,
  fill: { color: "4A90D9", transparency: 70 }
});

// Accent glow in corner
slide.addShape(pres.shapes.OVAL, {
  x: -2, y: -2, w: 6, h: 6,
  fill: { color: "F96167", transparency: 85 }
});
```

Use bold solid color backgrounds as an alternative — a strong primary color with white text can be just as impactful as a gradient.

### Half-Image Layouts (Split Slides)

Place a photo on one half (left or right) with content on the other. The photo should be full-height with no margins — edge-to-edge on its side. Add a thin accent strip at the seam.

See the Split-Image layout in [layouts.md](layouts.md) for the complete implementation.

### Decorative Geometric Shapes

Add subtle decorative elements to break up flat backgrounds using PptxGenJS shapes:

```javascript
// Large transparent circle (partially off-slide)
slide.addShape(pres.shapes.OVAL, {
  x: 7, y: -1.5, w: 5, h: 5,
  fill: { color: accent, transparency: 85 }
});

// Small decorative circle
slide.addShape(pres.shapes.OVAL, {
  x: -1.5, y: 3.5, w: 4, h: 4,
  fill: { color: primary, transparency: 92 }
});

// Thin accent bar
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.3, w: 1.5, h: 0.06,
  fill: { color: accent }
});
```

Use these on title, closing, and section divider slides. Keep opacity high (80-92% transparency) so they're subtle.

### Elevated Cards with Rounded Corners and Shadows

Use PptxGenJS `ROUNDED_RECTANGLE` shapes with `shadow` for modern card styling:

```javascript
const makeCardStyle = () => ({
  fill: { color: "FFFFFF" },
  rectRadius: 0.15,
  shadow: { type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.12 }
});

slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.4, w: 4.3, h: 3.0,
  ...makeCardStyle()
});
```

**Important:** Always use a factory function for card styles — PptxGenJS mutates option objects. See the factory function pattern in [pptxgenjs-api.md](pptxgenjs-api.md).

For cards on dark/photo backgrounds, use semi-transparent fills:

```javascript
const makeOverlayCard = () => ({
  fill: { color: "FFFFFF", transparency: 80 },
  rectRadius: 0.15,
  shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.2 }
});
```

### Color-Blocked Sections

Instead of a plain white slide, split the slide into color blocks using RECTANGLE shapes:

```javascript
// Dark top band for title
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 1.2,
  fill: { color: primary }
});

// Light area below for content
slide.background = { color: "F5F5F5" };

// Title in the dark band
slide.addText("Section Title", {
  x: 0.5, y: 0.3, w: 9, h: 0.7,
  fontSize: 28, fontFace: "Georgia", color: "FFFFFF",
  bold: true, margin: 0
});
```

### Visual Rhythm Across the Deck

A professional deck follows a deliberate visual rhythm:

1. **Slide 1 (Title):** Full-bleed photo + dark overlay, large white text
2. **Slide 2-3 (Content):** Light background with cards or columns
3. **Slide 4 (Impact):** Dark background or another photo-backed slide — breaks monotony
4. **Slide 5-7 (Content):** Alternate between light/accent backgrounds, use split-image layouts
5. **Slide 8 (Data):** Chart on clean background
6. **Slide 9 (Quote/Testimonial):** Full-bleed photo + overlay
7. **Slide 10 (Closing):** Photo or solid color background, centered CTA

**Rule: Never have more than 2 consecutive slides with the same background treatment.**

---

## Common Design Mistakes to Avoid

1. **Repeating the same layout** — vary between columns, cards, callouts, and charts across slides.
2. **Centering body text** — left-align paragraphs and bullets. Center only titles.
3. **Weak size contrast** — if your title and body look similar in size, increase the title.
4. **Defaulting to blue** — choose colors that reflect the specific topic.
5. **Inconsistent spacing** — pick a standard gap and stick with it.
6. **Text-only slides** — every slide should have a visual element (shape, icon, chart, or image). **Source real photos from Unsplash first via the `image-sourcing` skill; only AI-generate images when no suitable stock photo is available.**
7. **Too many bullet points** — if a slide has more than 5 bullets, split it into two slides or use a different layout.
8. **Low-contrast text or icons** — test that text is legible against its background. Light gray on cream is unreadable.
9. **Accent lines under titles** — these are a hallmark of AI-generated slides. Use white space or background color changes instead.
10. **All slides with white backgrounds** — use the dark/light sandwich structure for visual rhythm.
11. **Flat, shadowless cards** — use PptxGenJS `shadow` on `ROUNDED_RECTANGLE` for depth.
12. **No photography** — professional decks use images. Source topic-relevant photos from Unsplash for at least title, section divider, and closing slides. Only AI-generate when no suitable stock photo exists.
13. **Generic imagery** — whether sourced or generated, make images specific to the topic. "Abstract blue wave" is lazy. "Aerial view of solar farm at sunset" is specific and impactful.

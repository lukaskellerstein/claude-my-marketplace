---
name: media-prompt-craft
description: >
  Craft effective prompts for AI image/video generation and search queries for stock photo services.
  Translates design direction and styleguide choices into specific, style-consistent prompts. Use
  when the user asks to "find images for my site", "generate a hero image", "what kind of images
  should I use", "create image prompts for my project", "write prompts for image generation",
  "Unsplash query for...", or when building a media asset list for a design project. Works with
  any styleguide and delegates actual generation to media-plugin.
---

# Media Prompt Craft

The bridge between design intent and media execution. Translates styleguide choices into specific, style-consistent prompts for image/video generation and stock photo search queries.

## When to Use

- User needs images for a website, app, or presentation
- User has a styleguide and needs matching media assets
- User asks "what images should I use for my landing page?"
- User wants to generate hero images, illustrations, or backgrounds
- User needs Unsplash/stock photo search queries
- User wants consistent visual style across multiple images

## When NOT to Use

- User wants to generate the actual image → use **media-plugin/image-generation**
- User wants to search stock photos directly → use **media-plugin/image-sourcing**
- User hasn't defined a design direction yet → use **styleguide** skill first
- User wants to fetch SVG icons → use **media-plugin/icon-library**

## Prompt-from-Styleguide Workflow

Before writing prompts, extract the visual DNA from the project's styleguide:

1. **Color keywords** — "warm earth tones", "cool blues and slate", "neon on dark"
2. **Mood** — "serene and calm", "energetic and bold", "professional and trustworthy"
3. **Photography style** — "editorial", "candid", "moody", "bright and airy"
4. **Composition preferences** — "minimal negative space", "dynamic angles", "centered subjects"
5. **Subject matter** — "people", "abstract", "landscapes", "technology"

These become your **style prefix** — a reusable string that ensures visual consistency.

## Prompt Anatomy

Every effective image prompt follows this structure:

```
[Subject] + [Composition] + [Lighting] + [Color palette] + [Style] + [Mood] + [Technical] + [Negative]
```

| Component | What it controls | Example |
|-----------|-----------------|---------|
| **Subject** | What's in the image | "a woman working at a standing desk" |
| **Composition** | How it's framed | "shot from slightly above, rule of thirds" |
| **Lighting** | Light quality and direction | "soft natural window light, golden hour warmth" |
| **Color palette** | Color characteristics | "warm earth tones, muted terracotta and sage" |
| **Style** | Visual treatment | "editorial photography, shallow depth of field" |
| **Mood** | Emotional quality | "calm, focused, intentional" |
| **Technical** | Resolution and format | "16:9 aspect ratio, high resolution" |
| **Negative** | What to avoid | "no stock photo feel, no forced smiles" |

## Style Consistency System

Define a **style prefix** that encodes the project's visual DNA, then append subject-specific details for each image:

```
STYLE PREFIX (reuse for every image):
"Editorial photography, warm earth tones, natural golden hour lighting,
shallow depth of field, grain texture, muted color grading"

IMAGE 1 — Hero:
[style prefix] + "wide shot of a modern coworking space, plants and
natural materials, people collaborating casually, 16:9"

IMAGE 2 — Feature card:
[style prefix] + "close-up of hands typing on a laptop, coffee nearby,
wooden desk surface, 3:4"

IMAGE 3 — Team section:
[style prefix] + "candid portrait of a smiling professional, neutral
background, waist-up framing, 1:1"
```

The style prefix ensures all images feel like they belong together.

## Stock Photo Query Strategy

Stock photo searches require different techniques than AI generation prompts.

### Query Construction Formula

```
[Subject] + [Mood/Setting] + [Style modifier]
```

**Bad queries** (too generic):
- "office" → returns generic stock
- "team meeting" → forced smiles, staged poses
- "technology" → blue glowing screens

**Good queries** (specific and styled):
- "candid coworking warm natural light" → authentic workspace
- "team collaboration casual modern office plants" → natural team shots
- "developer laptop minimal desk setup" → genuine tech imagery

### Keyword Layering

Layer keywords to narrow results:

| Layer | Purpose | Examples |
|-------|---------|---------|
| **Subject** | What to find | workspace, portrait, cityscape |
| **Mood** | Emotional quality | warm, dramatic, serene, energetic |
| **Setting** | Environment | outdoor, studio, minimal, urban |
| **Style** | Visual treatment | aerial, close-up, silhouette, flat-lay |
| **Color** | Palette hint | dark, pastel, monochrome, earth-tones |

Example: `"aerial cityscape dusk warm tones" > "city at night"`

### Unsplash-Specific Tips

- Use adjectives more than nouns — "serene mountain lake" not just "lake"
- Combine mood + subject — "cozy reading corner" not "bookshelf"
- Add material/texture keywords — "concrete texture", "marble surface"
- Specify "no people" or "with people" for better results
- Use size parameters: `?w=1440&q=80` for hero images, `?w=640&q=80` for cards

See [references/search-strategy.md](references/search-strategy.md) for advanced query patterns.

## Media Type Patterns

### Hero Backgrounds

**For AI generation:**
```
"Abstract [mood] background, [color palette keywords], flowing organic shapes,
subtle gradient transitions, no text, wide format 16:9, high resolution"
```

**For stock photos:**
```
Query: "[mood] abstract background [color] minimal"
Size: ?w=1920&q=85
```

### Feature Illustrations

**For AI generation:**
```
"[Style] illustration of [concept], [color palette], clean composition,
[flat/3D/isometric] style, white or transparent background, centered, 1:1"
```

**For stock photos:**
```
Query: "[concept] icon illustration [style] minimal"
Size: ?w=800&q=80
```

### Team/People Photos

**For stock photos** (preferred over AI for people):
```
Query: "candid professional portrait [setting] [mood] natural light"
       "diverse team collaboration [setting] authentic"
Size: ?w=400&q=80 (avatars), ?w=800&q=80 (team section)
```

### Product Mockups

**For AI generation:**
```
"Clean product mockup, [device type] displaying [UI description],
[angle — isometric/front/perspective], [background — gradient/desk/minimal],
soft shadow, photorealistic, high resolution"
```

### Abstract Textures & Patterns

**For AI generation:**
```
"Seamless [texture type] pattern, [color palette], subtle,
tileable, [material — paper/fabric/marble/concrete], no text"
```

**For stock photos:**
```
Query: "[material] texture [color] background minimal"
Size: ?w=1920&q=85
```

### Video Backgrounds

**For AI generation** (via media-plugin/video-generation):
```
"Slow-motion [subject], [mood], [color grading], cinematic,
subtle movement, seamless loop, no text, 16:9, 10 seconds"
```

## Style Vocabulary Quick Reference

See [references/style-vocabulary.md](references/style-vocabulary.md) for the comprehensive vocabulary. Key terms:

**Lighting**: golden hour, rim light, soft diffused, dramatic high-contrast, backlit, overcast flat
**Composition**: rule of thirds, centered, negative space, leading lines, frame within frame, aerial/bird's eye
**Mood**: serene, dramatic, whimsical, austere, intimate, epic, cozy, energetic
**Color**: muted, saturated, pastel, monochromatic, complementary, analogous, earth-tones
**Style**: photorealistic, flat illustration, isometric, watercolor, 3D render, editorial, cinematic

## Cross-Plugin References

- **media-plugin/image-generation** — use `mcp__media-mcp__generate_image` with the crafted prompts
- **media-plugin/image-sourcing** — use with the crafted search queries for Unsplash/Pexels/Pixabay
- **media-plugin/video-generation** — use `mcp__media-mcp__generate_video` for video backgrounds
- **media-plugin/icon-library** — for SVG icons (don't generate these, fetch pre-made ones)
- **styleguide** skill — create the design language FIRST, then use this skill to translate it into prompts

## Tips

- Always craft a style prefix first — consistency matters more than individual quality
- Stock photos for people, AI generation for abstract/conceptual — AI struggles with natural-looking humans
- Include negative prompts to avoid common AI artifacts: "no watermark, no text, no distortion"
- Test your Unsplash queries before committing — search results vary significantly with keyword order
- For presentations, reference **documentation-plugin/pptx** for recommended image dimensions per slide type

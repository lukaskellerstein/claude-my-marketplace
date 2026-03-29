---
name: variation
description: Generate alternative design variations from an existing web design — systematically vary colors, typography, animation intensity, and spacing density while preserving page structure and content. Use when the user wants multiple visual options from a base design.
when-to-use:
  - User wants N alternative designs from an existing base
  - User says "generate variations" or "try different styles"
  - User wants to compare visual approaches side-by-side
  - Post-workflow option after completing a web design
---

# Variation — Design Variation Generation

Generate N alternative visual designs from an existing base design. Variations change the **visual style** while preserving the **page architecture and content**.

## What Varies vs. What Stays

### Varies (visual style)
- **Color strategy** — different palette, mood, contrast level, dark vs light
- **Typography** — different font pairing, weight strategy, size contrast
- **Animation intensity** — subtle vs dramatic, fast vs slow, fewer vs more animations
- **Spacing density** — compact vs spacious, tight grid vs breathing room
- **Visual texture** — flat vs gradient, minimal vs rich shadows, sharp vs rounded corners

### Stays (structure + content)
- Page count and site map
- Section order and layout composition
- All text content (headlines, body, CTAs)
- Mock data
- Media descriptions (though the style prefix changes)
- Icon choices
- Functionality and interactions

## Variation Workflow

### Step 1: Read the Base Design Document
Read the complete design document from the source path (e.g., `designs/1/docs/`). Extract:
- Page architecture (pages, sections, content)
- Current styleguide choices
- Animation plan
- Media prompts (extract the content descriptions, discard style prefix)

### Step 2: Generate Variation Specs
For each variation, make deliberate changes across variation dimensions. Use the `variation-dimensions.md` reference for strategies.

**Each variation should have a clear identity** — not random tweaks, but a coherent alternative vision. Examples:
- Variation 1: "Dark premium" — dark backgrounds, gold accents, editorial serif fonts, subtle animations
- Variation 2: "Bold maximalist" — vibrant colors, oversized type, dramatic animations, high contrast
- Variation 3: "Clean minimal" — lots of whitespace, muted palette, geometric sans-serif, restrained motion

### Step 3: Produce Variation Design Documents
For each variation, produce a complete design document in `designs/{base}v{N}/docs/`:
- New styleguide (colors, fonts, spacing)
- Updated CSS architecture (tailwind config, CSS variables)
- Updated media prompts (new style prefix, same content descriptions)
- Updated animation plan (adjusted intensity)
- Same page architecture and content (copied from base)

### Step 4: Implementation
Each variation goes through the standard implementation workflow (scaffold → page-builders → assembly → test) using its own design document, outputting to `designs/{base}v{N}/src/`.

## Variation Naming Convention

```
designs/
  1/          ← base design
  1v1/        ← variation 1 of design 1
  1v2/        ← variation 2 of design 1
  2/          ← second independent design
  2v1/        ← variation 1 of design 2
```

## Output Template

Each variation document starts with:

```markdown
# Design Variation: {base}v{N}
**Base:** designs/{base}/
**Identity:** [one-line description, e.g., "Dark premium — editorial luxury with restrained motion"]
**Key changes from base:**
- Color: [what changed]
- Typography: [what changed]
- Animation: [what changed]
- Spacing: [what changed]

[... full design document follows, same structure as base ...]
```

## Cross-Plugin Skills Used
- `design-plugin:styleguide` — generate alternative aesthetic profiles, font pairings, color moods
- `design-plugin:design-system` — validate new color palettes for accessibility (WCAG contrast)
- `design-plugin:media-prompt-craft` — generate new style prefixes for media prompts

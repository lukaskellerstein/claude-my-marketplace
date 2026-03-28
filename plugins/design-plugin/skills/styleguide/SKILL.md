---
name: styleguide
description: >
  Create a comprehensive design language and styleguide for any project — websites, apps, blogs,
  presentations, marketing pages. Given a project type, brand, and audience, produces aesthetic
  direction, font selections with pairings, color strategy, spacing philosophy, imagery style,
  and tone. Use when the user asks to "create a styleguide", "define the design language",
  "what fonts should I use", "choose a color palette for my project", "design direction for
  my website", "how should my app look", "visual identity", or "brand style". References
  design-system for technical implementation and media-plugin for asset generation.
---

# Styleguide

Create a comprehensive design language for any project. This is the starting point for all design work — it defines the "why" behind every visual choice.

## When to Use

- User wants to create or define a visual identity for a project
- User asks "what fonts/colors should I use?"
- User is starting a new website, app, or product and needs design direction
- User wants a coherent design language across multiple deliverables
- User asks for "brand style" or "design system" guidance (strategic, not technical)

## When NOT to Use

- User wants to extract existing tokens from Figma → use **figma-plugin/design-tokens**
- User wants to generate actual images → use **media-plugin/image-generation**
- User wants to search for stock photos → use **media-plugin/image-sourcing**
- User wants to audit WCAG contrast → use **design-system**
- User wants to build components in Figma → use **figma-plugin/figma-bridge**

## Styleguide Creation Workflow

### Step 1: Project Discovery

Gather these inputs from the user (ask if not provided):

| Input | Why It Matters | Example |
|-------|---------------|---------|
| **Project type** | Determines conventions and expectations | SaaS dashboard, portfolio, e-commerce, blog, landing page |
| **Target audience** | Drives formality, complexity, aesthetics | Developers, executives, teenagers, creative professionals |
| **Brand personality** | 3-5 adjectives that define the tone | Bold & innovative, Calm & trustworthy, Playful & energetic |
| **Competitors / inspiration** | What to differentiate from or aspire to | "Like Linear but warmer", "Not like every other SaaS" |
| **Existing brand assets** | Constraints to work within | Logo, brand colors, existing font choices |
| **Deliverables** | What will be designed | Website, mobile app, presentation deck, all of the above |

### Step 2: Aesthetic Profile Selection

Choose an aesthetic profile from [references/aesthetic-profiles.md](references/aesthetic-profiles.md) that matches the project discovery. Each profile provides default directions for typography, color, spacing, imagery, and motion.

The profile is a **starting point**, not a rigid template. Customize based on the specific project needs.

### Step 3: Typography Strategy

Select a font pairing from [references/font-pairings.md](references/font-pairings.md).

Define:
- **Heading font** — what emotion does it carry?
- **Body font** — is it readable at small sizes?
- **Monospace** (if applicable) — for code, data, or technical content
- **Weight strategy** — which weights will be used and where (e.g., Bold for H1, Medium for H3, Regular for body)
- **Scale** — reference **design-system** for type scale ratios (Major Third 1.250 is a safe default)

### Step 4: Color Strategy

Build a palette using [references/color-moods.md](references/color-moods.md).

Define:
- **Primary** — the dominant brand color (60% of visual space)
- **Secondary** — supporting color (20-30%)
- **Accent** — for CTAs, highlights, attention (5-10%)
- **Neutrals** — text, backgrounds, borders (gray scale)
- **Semantic** — success/warning/error/info
- **Dark mode strategy** — invert, dim, or separate palette?

For technical implementation (palette generation, WCAG contrast checking), reference **design-system**.

### Step 5: Imagery & Media Direction

Define the visual style for all media assets:

- **Photography style** — moody, bright, editorial, candid, abstract, documentary
- **Illustration style** — flat, 3D, hand-drawn, isometric, line art
- **Icon library** — Lucide (clean, consistent), Heroicons (Tailwind ecosystem), Tabler (largest selection). Use **media-plugin/icon-library** to fetch.
- **Image sourcing** — use **media-plugin/image-sourcing** with specific search queries
- **Image generation** — use **media-plugin/image-generation** with style-consistent prompts
- **Video/motion** — use **media-plugin/video-generation** if applicable

For prompt crafting, use the **media-prompt-craft** skill to translate this direction into specific prompts and queries.

### Step 6: Output Styleguide Document

Produce a structured markdown document using this template:

```markdown
# [Project Name] Design Language

## Aesthetic Direction
- **Profile**: [name from aesthetic-profiles.md]
- **Personality**: [3-5 adjectives]
- **Inspiration**: [reference sites/brands]
- **Key principle**: [one sentence that captures the design philosophy]

## Typography
- **Heading**: [font name] — [why this font]
- **Body**: [font name] — [why this font]
- **Monospace** (if applicable): [font name]
- **Pairing rationale**: [why these fonts work together]
- **Weight strategy**: H1=Bold(700), H2=SemiBold(600), H3=Medium(500), Body=Regular(400)
- **Scale**: [ratio] — xs(12) sm(14) base(16) lg(18) xl(20) 2xl(24) 3xl(30) 4xl(36) 5xl(48)
- **Google Fonts import**: `@import url('https://fonts.googleapis.com/css2?family=...')`

## Color System
| Role | Hex | Usage |
|------|-----|-------|
| Primary | #___ | Main brand, CTAs, links |
| Secondary | #___ | Supporting elements |
| Accent | #___ | Highlights, badges, attention |
| Neutral-900 | #___ | Primary text |
| Neutral-700 | #___ | Secondary text |
| Neutral-400 | #___ | Placeholder, disabled |
| Neutral-100 | #___ | Backgrounds, cards |
| Neutral-50 | #___ | Page background |
| Success | #___ | Positive states |
| Warning | #___ | Caution states |
| Error | #___ | Error states |

**Dark mode**: [strategy — inverted, dimmed, or separate palette]

## Imagery Direction
- **Photography**: [style + mood + example search queries for media-plugin/image-sourcing]
- **Illustrations**: [style + example prompts for media-plugin/image-generation]
- **Icons**: [library choice + style rationale — use media-plugin/icon-library]

## Spacing & Layout
- **Grid**: [4px or 8px base unit]
- **Density**: [compact / balanced / spacious]
- **Max content width**: [e.g., 1280px]
- **Section padding**: [e.g., 64px vertical, 24px horizontal]
- **Card padding**: [e.g., 24px]
- **Component spacing**: [e.g., 16px between cards]

## Motion & Interaction
- **Philosophy**: [subtle / expressive / none]
- **Page load**: [staggered reveal / fade in / instant]
- **Hover states**: [lift / glow / color shift / scale]
- **Transitions**: [duration and easing — e.g., 0.3s cubic-bezier(0.4, 0, 0.2, 1)]

## Cross-Plugin Implementation Guide
- **Palette & WCAG**: use `design-system` for palette generation and contrast checking
- **Icons**: use `media-plugin/icon-library` to fetch SVGs from [chosen library]
- **Stock photos**: use `media-plugin/image-sourcing` with these queries: [list]
- **Generated visuals**: use `media-plugin/image-generation` with these prompts: [list]
- **Presentations**: apply this styleguide when using `documentation-plugin/pptx`
- **Figma implementation**: use `figma-plugin/figma-bridge` to build in Figma
```

## Tips

- Always start with the audience, not the aesthetics — design for the people using it
- A styleguide should feel inevitable for THIS project, not generic
- Fewer, stronger choices beat many weak ones — commit to a direction
- Test your font pairing at actual sizes before committing — some fonts that look good at 48px fall apart at 14px
- The styleguide is a living document — update it as the project evolves

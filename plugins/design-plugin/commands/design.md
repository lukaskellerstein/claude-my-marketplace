---
description: Create a design direction and styleguide for a project — produces aesthetic direction, fonts, colors, imagery, and media prompts
argument-hint: "<project description>"
allowed-tools: ["Read", "Write", "Bash", "WebSearch", "WebFetch"]
---

# /design — Design Direction

You are a design director. Given a project description, produce a complete design direction including styleguide, media asset plan, and implementation references.

## Parse Arguments

Extract from the user's input:
- **Project description**: What to design for (e.g., "a SaaS analytics platform for marketing teams", "a personal portfolio for a photographer")

If the description is too vague, ask ONE clarifying question about the target audience.

## Workflow

### Step 1: Quick Discovery

From the project description, determine:
- **Project type**: website, app, dashboard, blog, landing page, presentation
- **Audience**: who will use/see this
- **Personality**: 3-5 adjectives that fit the project

### Step 2: Design Decisions

Read the reference files and make opinionated choices:

1. Read [aesthetic profiles](${CLAUDE_PLUGIN_ROOT}/skills/styleguide/references/aesthetic-profiles.md) → pick the best match
2. Read [font pairings](${CLAUDE_PLUGIN_ROOT}/skills/styleguide/references/font-pairings.md) → pick the best match
3. Read [color moods](${CLAUDE_PLUGIN_ROOT}/skills/styleguide/references/color-moods.md) → pick the best match

### Step 3: Produce the Styleguide

Output a complete styleguide following the template in the **styleguide** skill. Include:
- Aesthetic direction and rationale
- Font pairing with weights and scale
- Color palette with hex codes and roles
- Spacing and layout guidance
- Motion philosophy

### Step 4: Media Asset Plan

Using the **media-prompt-craft** skill patterns, produce:

1. A **style prefix** for visual consistency
2. **Image generation prompts** for key visuals (hero, feature illustrations, backgrounds)
3. **Stock photo queries** for photography needs (team photos, product shots, textures)
4. **Icon list** with recommended library

Format as a ready-to-use checklist:
```
## Media Assets

### AI-Generated Images
- [ ] Hero background: "[prompt]"
- [ ] Feature illustration 1: "[prompt]"
- [ ] ...

### Stock Photos (Unsplash/Pexels)
- [ ] Team photo: "[search query]"
- [ ] ...

### Icons (from media-plugin/icon-library)
- [ ] [icon-name] — [purpose]
- [ ] ...
```

### Step 5: Implementation References

End with a "Next Steps" section pointing to specific plugins and skills:

```
## Next Steps

1. **Generate images** → use `media-plugin/image-generation` with the prompts above
2. **Find stock photos** → use `media-plugin/image-sourcing` with the queries above
3. **Fetch icons** → use `media-plugin/icon-library` for [library] icons
4. **Check contrast** → use `design-system` to verify WCAG compliance
5. **Build frontend** → reference `frontend-aesthetics` skill for component recipes
```

## Rules

1. **Be decisive** — pick ONE aesthetic profile, ONE font pairing, ONE color strategy. Don't present multiple options.
2. **Be specific** — include actual hex codes, font names, pixel values. Not "use a blue" but "use #2563EB as primary."
3. **Be fast** — this is the quick-entry command. Produce a complete, usable result in one pass.
4. **Always include the media asset plan** — the styleguide alone isn't actionable without prompts and queries.

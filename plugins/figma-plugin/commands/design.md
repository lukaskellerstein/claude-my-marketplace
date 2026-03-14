---
description: Design a website, app, or UI in Figma — orchestrates parallel agents for structure and media
argument-hint: "<description> <figma-url>"
allowed-tools: ["Read", "Write", "Bash", "Agent", "WebSearch", "WebFetch", "mcp__design-playwright__browser_navigate", "mcp__design-playwright__browser_evaluate", "mcp__design-playwright__browser_snapshot", "mcp__design-playwright__browser_click", "mcp__plugin_media-plugin_media-mcp__generate_image", "mcp__plugin_media-plugin_media-mcp__generate_video", "mcp__plugin_media-plugin_media-mcp__generate_music", "mcp__plugin_media-plugin_media-mcp__generate_speech"]
---

# /design — Figma Design Orchestrator

You are the **design orchestrator**. Your job is to plan the full design, then delegate work to specialized agents that run **in parallel** for maximum speed.

## Parse Arguments

Extract from the user's input:
- **Description**: What to design (e.g., "a Mars Space Agency website", "a SaaS dashboard")
- **Figma URL**: The Figma file URL (e.g., `https://www.figma.com/design/ABC/FileName`)

If either is missing, ask the user.

## Orchestration Workflow

### Phase 1: Connect to Figma + Verify

1. Navigate to the Figma URL using `mcp__design-playwright__browser_navigate`
2. Verify `figma` global access:
   ```javascript
   typeof figma !== 'undefined' ? 'connected' : 'not connected'
   ```
3. Verify Figma Bridge helpers:
   ```javascript
   typeof __figb === 'object' ? 'helpers ready' : 'no helpers'
   ```

If connection fails, troubleshoot (see figma-bridge skill).

### Phase 2: Plan the Design

Create a comprehensive design plan. **Every section must specify IMAGE, ICONS, COLORS and FONTS.**

```markdown
## Design Plan: [Project Name]

### Theme & Style
- Colors: [primary, secondary, accent, neutrals with hex codes]
- Font: [family] (weights: Regular, Medium, Semi Bold, Bold)
- Style: [modern/minimal/bold/playful/corporate — describe the visual feel]

### Font Stack
- Primary: [Font Family]
- Weights: Regular (400), Medium (500), Semi Bold (600), Bold (700)
- Scale: H1=48px Bold, H2=36px Bold, H3=24px Semi Bold, Body=16px Regular, Small=14px Regular, Caption=12px Regular

### Pages & Sections

#### Page 1: [Name]
Section 1 — [Name]:
  - Layout: [description]
  - IMAGE: "[search query or AI generation prompt]" → [source: Unsplash/AI]
  - ICONS: [icon-name-1], [icon-name-2], ...
  - FONTS: [specific sizes and weights used]
  - Content: [headlines, body text, CTAs]

Section 2 — [Name]:
  ...

#### Page 2: [Name] (if multi-page)
  ...

### Asset Summary
- Icons needed: [full list with icon library source]
- Images needed: [full list with search queries and sizing]
- AI-generated images: [list of prompts if stock won't work]
- Videos/GIFs: [if applicable]
```

### Phase 3: Initialize Figma + Spawn Parallel Agents

**This is the critical parallelization step.** Launch all agents in a SINGLE message so they run concurrently:

```
Spawn in ONE message (all parallel):
├─ media-creator Agent A: Fetch all icons (curl SVGs from Lucide/Heroicons/Tabler)
├─ media-creator Agent B: Search/download stock images (Unsplash/Pexels)
├─ media-creator Agent C: Generate AI images (if needed)
├─ media-creator Agent D: Generate videos/GIFs (if needed)
└─ Main thread: Initialize Figma (load fonts, create Design Language page)
```

**How to spawn agents:**

Use the `Agent` tool with multiple calls in a single message. Each agent gets a detailed prompt with:
- Exactly what assets to gather
- Expected return format
- No Figma work — agents only gather assets

**Main thread (while agents run):**
- Init status panel: `await __figs.init()`
- Load fonts: `await __figb.fonts([...all needed weights])`
- Create the Design Language page (colors, typography, effects, spacing)

### Phase 4: Collect Results + Build

After all agents complete:
1. Collect icon SVGs map: `{ iconName: svgString }`
2. Collect image URLs map: `{ sectionName: imageUrl }`
3. Collect generated media paths (if any)

Then spawn **design-structure** agents to build pages in Figma:

```
For single-page designs:
└─ design-structure Agent: Build the page with all assets baked in

For multi-page designs (spawn in ONE message, parallel):
├─ design-structure Agent A: Build Page 1 with its assets
├─ design-structure Agent B: Build Page 2 with its assets
└─ design-structure Agent C: Build Page 3 with its assets
```

**IMPORTANT:** Each design-structure agent must receive:
- The full design plan for its page(s)
- All icon SVGs it needs (embedded in the prompt)
- All image URLs it needs (embedded in the prompt)
- The Figma connection is shared — agents execute via `mcp__design-playwright__browser_evaluate`

### Phase 5: Verify + Cleanup

After all pages are built:
1. Run `__figb.verify()` on each page — check images > 0, vectors > 0
2. Take snapshots: `mcp__design-playwright__browser_snapshot`
3. Fix any issues with targeted scripts
4. Remove status panel: `__figs.remove()`

## Agent Prompt Templates

### media-creator Agent (Icons)
```
You are a media asset gatherer. Fetch the following SVG icons using curl/WebFetch.

Icons needed (all from Lucide unless noted):
- home, search, bell, user, arrow-right, check, star, ...

For each icon, fetch from: https://unpkg.com/lucide-static/icons/{name}.svg

Return a JSON map of { iconName: svgString } for ALL icons.
Do NOT do any Figma work. Only gather assets.
```

### media-creator Agent (Images)
```
You are a media asset gatherer. Find stock photos for the following sections.

Images needed:
- hero: "futuristic city skyline at night" → search Unsplash, use ?w=1440&q=80
- card1: "cloud computing abstract" → search Unsplash, use ?w=640&q=80
- avatar1: "professional headshot" → search Unsplash, use ?w=200&q=80

Search using: WebSearch "site:unsplash.com {query}"
Extract direct image URLs with size params.

Return a JSON map of { sectionName: imageUrl } for ALL images.
Do NOT do any Figma work. Only gather assets.
```

### design-structure Agent (Page Builder)
```
You are a Figma design builder. Build [Page Name] in the Figma file using the Plugin API.

Use mcp__design-playwright__browser_evaluate to execute chunked scripts.
Use __figb.* helpers for all operations.

Design plan for this page:
[paste the page plan here]

Assets available:
Icons: { home: '<svg>...', search: '<svg>...', ... }
Images: { hero: 'https://...', card1: 'https://...', ... }

Build each section with assets baked in. Max 5 elements per chunk.
Every frame with an image loads it in the same script.
Every button/nav item includes its icon inline.
```

## Rules

1. **NEVER work sequentially** — always spawn agents in parallel for asset gathering
2. **NEVER build empty frames** — every section includes its image and icons
3. **NEVER draw icons manually** — always fetch from icon libraries
4. **Design Language page first** — colors, typography, effects before any content pages
5. **Chunked execution** — max 5 UI elements per evaluate call
6. **Verify after each page** — `__figb.verify()` + visual snapshot
7. **Be creative** — gradients, shadows, rounded corners, rich typography, real images

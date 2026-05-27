---
name: visual-planning
description: ALWAYS use this skill FIRST, before producing or fetching ANY media asset — an image, video/GIF, chart, graph, diagram, infographic, SVG/icon, music, or speech/voiceover — and before any stock-photo search. It is the mandatory pre-generation gate. For a SINGLE asset it runs a short brief — clarify the ask → confirm style/design guidelines → pin the message → decide what's IN and OUT → draft the prompt/spec → review and tailor it → only THEN generate and verify. For a WHOLE deliverable you visually self-direct (a deck, doc, one-pager, pitch, whitepaper, case study, datasheet, landing page, report, or proposal that "should look good", "needs diagrams/visuals", or must "explain/sell visually") it FIRST plans the set — which concepts earn a visual, routes each by its JOB (explain/structure/numbers → diagram or chart via graph-generation; pure tone → real photo), binds them to ONE style — then loops the brief per asset. Fires on "generate/create/make an image|video|chart|diagram|infographic|logo|icon|song|voiceover", "find stock photos", "design a graphic", "make my deck/doc look good", "needs visuals". Skipping it is the #1 cause of ugly, off-message, or garbled output — AI-rendered text, abstract "tech slop", and visuals with no style cohesion. After planning/briefing, delegate to media-prompt-craft, image-generation, image-sourcing, video-generation, music-generation, speech-generation, graph-generation, svg-mastery, or icon-library (for infographics, follow the bundled references/infographic-design.md).
---

# Visual Planning

The **pre-generation gate** every media asset passes through. The engine skills know *how* to render; this skill makes sure you know **what** you're producing, **why**, **in what style**, and **what must not be in it** — *before* you spend a generation call. It works at two scopes:

- **One asset (or a stock search)** → run the **brief** (Mode A, the 7 steps).
- **A whole deliverable where YOU decide the visuals** → **plan the set** first (Mode B), then loop the brief over each planned asset.

> **Why this skill exists:** Ugly output almost never comes from a weak engine. It comes from generating *before* intent, style, and constraints are pinned — so you get a beautiful image of the wrong thing, a chart in clashing colors, an "infographic" full of garbled AI text, or five abstract glowing renders where the doc needed diagrams. One minute here saves three regenerations.

## First: which mode?

- The user **named one specific asset** ("draw an AWS diagram", "generate *this* image", "make a 10s loop") → **Mode A**.
- You're producing **one self-directed asset** → **Mode A**.
- You're producing a **document/deck/page with multiple self-directed visuals** ("make this pitch look good", "needs diagrams") → **Mode B**, then Mode A per asset.

## The Iron Rule (applies in BOTH modes — read this first)

Decide every visual by the **JOB it must do**, not by how it would look:

- **If its job is to EXPLAIN** — how the product works, its structure/architecture, a process or lifecycle, a before/after, a data/access flow, or any numbers — it is a **diagram or chart** → **`graph-generation`** (D3 / Mermaid / Draw.io). **No exceptions, no matter how tempting a glossy render looks.**
- **If its job is purely to SET TONE** — a cover/section header with no information to convey — it may be a **photograph** (preferred: `image-sourcing`) or, as a last resort, a restrained illustration (`image-generation`).

**AI image generation is NEVER used to explain anything.** It produces *decoration*, not *information*. A "canonical model", a "fragmented → unified" story, an "agent architecture", a "governed access" flow are all **explanations** → **diagrams**, full stop.

### Banned genre: abstract AI "tech slop"
These clichés look expensive and say nothing. **Never** generate them as explanatory product visuals:
- Glowing orbs / swirls / energy cores ("the platform"); glowing network-node spheres, cubes, or lattices ("the data / the graph")
- Holographic globes or continent maps with light arcs ("global / sovereign"); circuit-board cities or abstract "data highways"
- Shattered glass, floating documents, particle streams ("transformation"); anything navy-blue-with-gold-glow that could illustrate *any* tech company

If you catch yourself writing *"glowing holographic representation of [concept], dark background, blue and gold, futuristic, abstract"* — **stop.** That concept needs a **diagram** (`graph-generation`) or a **real photo**.

| If the visual contains… | It is a… | Route to |
|---|---|---|
| Boxes + arrows, components, services, vendor icons | Architecture / flow diagram | `graph-generation` (Draw.io / Mermaid) |
| Axes, bars, lines, points, percentages, numbers over time | Data chart | `graph-generation` (D3) |
| Steps, a process, a lifecycle, a decision tree | Flow / sequence / state | `graph-generation` (Mermaid) |
| A map, network, sankey, treemap, heatmap | Data-driven viz | `graph-generation` (D3) |
| Stats / timeline / "how it works" / comparison as one composed graphic | Infographic | read `references/infographic-design.md`, then graph-generation / svg-mastery |
| A photo of a person, place, product, or scene | Photograph | `image-sourcing` (real) or `image-generation` (custom) |
| An abstract background, texture, hero illustration | Illustration | `image-generation` |
| A small UI/process glyph or feature marker | Icon | `icon-library` |
| A custom logo-mark, animated badge, hand-tuned vector | Vector | `svg-mastery` |

---

## Mode A — Brief one asset (the 7 steps)

### 1. Clarify the ask
Pin down, in one line, **what artifact** and **its hard specs**: type (→ which engine, see step 5); where it's used (slide, doc, web hero, social, avatar, print); format specs (aspect ratio/dimensions, resolution/DPI, file type; for video/music: duration & loop; for speech: voice, language, pacing); and how many (one, a variation set, or a consistent series). If something is genuinely ambiguous *and changes the output*, ask **one** focused question; otherwise pick the obvious default and state it.

### 2. Confirm style & design guidelines
Is there a direction to obey? **Yes** (brand, `styleguide`, an existing deck/site) → extract a **style prefix**: palette, mood, photography/illustration style, composition rules — and reuse it on *every* asset so the set is cohesive. **No** direction yet and it matters → create one via the **`styleguide`** skill first. For audio, the equivalent is genre/tempo/instrumentation/tone-of-voice.

### 3. Pin the message / intent
State the **single thing** the asset must make the viewer/listener understand or feel ("Adoption tripled this year"; "calm, trustworthy, premium"; "these are the 4 steps"). If you can't write it in one sentence, it isn't ready — or it's two assets. Everything else serves this sentence; cut what doesn't.

### 4. Decide what's IN and what's OUT
- **IN** — required subjects, elements, data points, labels, focal point.
- **OUT** — what must NOT appear. This is where quality is won:
  - AI images/video: `no text, no watermark, no logos, no garbled UI, no extra fingers/limbs`, no off-brand colors — and **no real numbers/labels you need legible** (that content belongs in a composed graphic).
  - Diagrams/charts/infographics: no chartjunk, no 3-D, no legend if direct labels work.
  - No **"tech slop"** (see the banned list above).

### 5. Route + draft the prompt/spec
Apply the **Iron Rule** to pick the engine, then draft using **that engine's own craft skill** — don't free-hand it:

| Artifact | Engine skill to draft + render with |
|---|---|
| AI image / illustration / background / mockup | **image-generation** (prompt via **media-prompt-craft**) |
| Real photo (people/places/products) | **image-sourcing** (stock query via **media-prompt-craft**) |
| Video / GIF / animated background | **video-generation** (prompt via **media-prompt-craft**) |
| Chart, graph, diagram, map, data viz | **graph-generation** (D3 / Mermaid / Draw.io) |
| Infographic (stats, timeline, how-it-works, comparison) | **read `references/infographic-design.md`**, then graph-generation / svg-mastery |
| Icon / glyph | **icon-library** (fetch, don't generate) |
| Custom vector / logo-mark / animated SVG | **svg-mastery** |
| Music / audio bed | **music-generation** |
| Speech / voiceover / narration | **speech-generation** |

Assemble the draft as **[style prefix (step 2)] + [message/subjects (steps 3–4)] + [specs (step 1)] + [negatives (step 4)]**.

### 6. Review & tailor — BEFORE generating
Read the draft back against steps 1–4 and fix it on paper, not by regenerating: does it serve the **one message**? Is the **style prefix** present and consistent? Are all **specs** and the **OUT list** included? **Legibility check** — if the prompt relies on the AI rendering real text/numbers, **stop** and re-route that content to a composed graphic. For people/hands/products, prefer **image-sourcing** over generation.

### 7. Generate & verify
Invoke the engine / MCP tool, then **look at the result** against the brief: right message? on-style? legible? specs correct? If not, adjust the *prompt* (back to step 6) — don't just re-roll. If it's part of a series, lock the style prefix so the next asset matches.

### Quick brief (state this before generating)
> **Brief:** <artifact + specs> · **Style:** <prefix / "styleguide"> · **Message:** <one sentence> · **In:** <…> · **Out:** <…> · **Engine:** <skill>

---

## Mode B — Plan a deliverable, then loop the brief

When you're self-directing the visuals for a whole document/deck/page, plan the **set** before briefing any single asset.

### B1 — Understand the product
From the brief / `company.md`, extract in your own words: **what it is** (category, what it replaces), **who buys it & why**, **how it works** (3–7 core mechanics), **proof** (numbers worth showing), and **the emotional beat** the doc should leave. Don't draw yet.

### B2 — Decide WHICH concepts deserve a visual
A visual earns its place only if it **conveys something faster or more convincingly than a sentence**. Good candidates, in priority order (the first four are explanatory → diagrams):
1. **How it works / fits** — architecture or a 3-5 step flow → **diagram**
2. **Proof / traction** — the number that matters → **chart**
3. **Before vs. after** — pain vs. outcome → **before/after diagram**, not abstract art
4. **Concept / model** — e.g. a "canonical model", an "access governance" flow → **diagram**
5. **Scannable structure** — feature icons, not walls of text → **icon-library**
6. **Tone-setter (at most ONE)** — a cover/hero whose only job is mood → **real photo**

Aim for **3-5 deliberate visuals over 12 random ones.** If five "visuals" all turned out to be abstract glowing renders, you decorated instead of explained — re-plan, each explanatory concept becomes a diagram.

### B3 — Choose the technique per concept
For each surviving concept, pick the form + engine via the Iron Rule table. Be specific about the *form* — "stacked bar of adoption by quarter", not "a chart".

### B4 — Bind everything to ONE style
Lock a shared **palette + style prefix** (from brand, or the `styleguide` skill). One palette, one mood — applied to every D3 theme, Draw.io color, and image prompt. Match each visual's aspect ratio to its placement (`pptx`/`docx` list exact sizes).

### B5 — Produce the Visual Plan, then loop
Write the table below (confirm with the user if the deliverable is large), then **run Mode A on each row** — style is already locked, so step 2 just inherits the shared prefix.

```markdown
## Visual Plan — <deliverable>
**Style:** palette = <…>; mood = <…>; style prefix = "<…>"

| # | Concept to convey | Why it earns a visual | Technique (form) | Engine / skill | Placement & ratio |
|---|---|---|---|---|---|
| 1 | System architecture | Buyers must see it fits their stack | Architecture diagram w/ vendor icons | Draw.io (graph-generation) | full-width, 16:9 |
| 2 | Adoption growth | Proof of traction | Line chart, 6 quarters | D3 (graph-generation) | half-width, 4:3 |
| 3 | How it works | Simplify the pitch to 4 steps | Numbered horizontal flow | Mermaid (graph-generation) | full-width |
| 4 | Emotional hook | Set a modern, trustworthy tone | Hero photo, team/product | image-sourcing | banner, 3:1 |
| 5 | 6 key features | Make benefits scannable | Icon set, consistent stroke | icon-library | inline, 1:1 |
```

Gather all visuals **before** writing the document/deck generation code.

---

## When the gate is light or skippable
- **Mid-batch under a Mode B plan** — steps 1–4 are decided for the set; per asset just draft → review → generate (steps 5–7).
- **The user handed you an exact, final prompt** and wants it verbatim — still do a 10-second legibility/negatives check (step 6), then generate.
- **Editing an existing asset with no new creative intent** (resize, convert, optimize an existing SVG) — no brief needed.

## Cross-references
- **media-prompt-craft** — the prompt/stock-query syntax for image/video/photo (steps 5–6 for those engines).
- **graph-generation** — all charts, diagrams, architecture, maps, data viz (the destination for most explanatory rows).
- **`references/infographic-design.md`** (bundled) — how to compose infographics (stats, timelines, how-it-works, comparisons): classification gate + design principles. Read it when a row routes to "infographic".
- **image-sourcing** — real photos (preferred for people/places/products).
- **image-generation** — custom illustrations, backgrounds, mockups (NEVER diagrams).
- **icon-library** — pre-made SVG icons (don't generate these).
- **svg-mastery** — hand-tuned / animated vector marks.
- **video-generation / music-generation / speech-generation** — motion and audio engines invoked at step 7.
- **styleguide** (design-plugin) — derive the palette/mood when the product has no brand yet.
- **pptx / docx** (office-plugin) — consume the gathered visuals; see their image-sizing tables.

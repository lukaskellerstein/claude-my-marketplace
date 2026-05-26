---
name: visual-planning
description: ALWAYS use this skill BEFORE generating any visual (image, chart, diagram, infographic) for a document, deck, or marketing/sales asset where YOU decide what to show — rather than the user naming a specific diagram. Fires when producing a sales document, sales deck, pitch deck, one-pager, whitepaper, case study, product brief, datasheet, landing page, report, or proposal that "should look good", "needs diagrams", "needs visuals", "needs to be visually attractive", or "explain/sell the product visually". This is the planning brain that runs FIRST: understand the product → decide WHICH concepts deserve a visual → choose the RIGHT technique and engine for each → bind them to one visual style → then delegate to the execution skills. Skipping this step is the #1 cause of ugly output, because the agent reaches for AI image generation for things that should be real charts/diagrams, and visualizes arbitrary concepts with no style cohesion. Use this whenever a deliverable needs self-directed visuals, then hand each planned visual to graph-generation, image-sourcing, image-generation, svg-mastery, or icon-library.
---

# Visual Planning

The **planning brain** that runs *before* any visual is generated for a document, deck, or marketing/sales asset. The execution skills (`graph-generation`, `image-generation`, `image-sourcing`, `svg-mastery`, `icon-library`) know *how* to render. This skill decides **what to render, why, with which technique, and in what style** — then delegates.

Use it whenever **you** decide the visuals (a sales doc that "should look good"), not when the user names a specific diagram ("draw an AWS diagram" → go straight to `graph-generation`).

> **Why this skill exists:** Ugly output almost never comes from a weak rendering engine. It comes from (1) routing diagrams/charts through AI **image generation** instead of a real diagram engine, (2) visualizing arbitrary concepts with no editorial judgment, and (3) visuals that don't share one style. This skill fixes all three before a single asset is produced.

## The Iron Rule (read this first)

Decide every visual by the **JOB it must do**, not by how it would look:

- **If its job is to EXPLAIN** — show how the product works, its structure/architecture, a process or lifecycle, a before/after comparison, a data/access flow, or any numbers — it is a **diagram or chart** and goes to **`graph-generation`** (D3 / Mermaid / Draw.io). **No exceptions, no matter how tempting a glossy render looks.**
- **If its job is purely to SET TONE** — a section header or cover with no information to convey — it may be a photograph (preferred: `image-sourcing`) or, as a last resort, a restrained illustration (`image-generation`).

**AI image generation (`generate_image`) is NEVER used to explain anything.** It produces *decoration*, not *information*. A "canonical model", a "fragmented → unified" story, an "agent architecture", a "governed access" flow are all **explanations** → they are **diagrams**, full stop — even though none of them "contain boxes" until you draw them.

### Banned genre: abstract AI "tech slop"

These clichés are the #1 symptom of the failure this skill exists to prevent. They look expensive and say nothing. **Never generate them as explanatory product visuals:**

- Glowing orbs / swirls / energy cores ("the platform")
- Glowing network-node spheres, cubes, or lattices ("the data / the graph")
- Holographic globes or continent maps with light arcs ("global / sovereign")
- Circuit-board cities or abstract "data highways" ("the architecture / agents")
- Shattered glass, floating documents, particle streams ("transformation")
- Anything navy-blue-with-gold-glow that could illustrate *any* tech company

If you catch yourself writing a prompt like *"glowing holographic representation of [concept], dark background, blue and gold, futuristic, abstract"* — **stop**. That concept needs a **diagram** in `graph-generation`, or a **real photograph**. Never this.

| If the visual contains… | It is a… | Route to |
|---|---|---|
| Boxes + arrows, components, services, vendor icons | Architecture / flow diagram | `graph-generation` (Draw.io or Mermaid) |
| Axes, bars, lines, points, percentages, numbers over time | Data chart | `graph-generation` (D3) |
| Steps, a process, a lifecycle, a decision tree | Flow / sequence / state | `graph-generation` (Mermaid) |
| A map, network, sankey, treemap, heatmap | Data-driven viz | `graph-generation` (D3) |
| A photo of a person, place, product, or scene | Photograph | `image-sourcing` (real) or `image-generation` (custom) |
| An abstract background, texture, hero illustration | Illustration | `image-generation` |
| A small UI/process glyph or feature marker | Icon | `icon-library` |
| A custom logo-mark, animated badge, hand-tuned vector | Vector | `svg-mastery` |

If you ever feel tempted to write a `generate_image` prompt that says "diagram", "chart", "architecture", "flowchart", or "infographic with labels" — **stop**. That belongs in `graph-generation`.

## The 4-Step Workflow

### Step 1 — Understand the product

Read the product description / `company.md` / brief and extract, in your own words:

- **What it is** — category, what it replaces or competes with
- **Who buys it & why** — the audience and the pain it removes
- **How it works** — the 3-7 core mechanics or components
- **Proof** — any numbers worth showing (growth, scale, performance, savings, adoption)
- **The pitch's emotional beat** — the feeling the doc should leave (trustworthy, fast, modern, safe…)

Do not draw anything yet. If the product is unclear on a point that would drive a visual, ask one focused question.

### Step 2 — Decide WHICH concepts deserve a visual

Not everything earns a visual. A visual earns its place only if it **conveys something faster or more convincingly than a sentence**. For each candidate concept, ask: *Does seeing this change what the reader believes or understands?* If not, cut it.

Good candidates for a sales doc, in priority order — note that the first four are **explanatory → diagrams**:

1. **How it fits / how it works** — architecture or a 3-5 step flow → **diagram** (almost always worth it)
2. **Proof / traction** — the number that matters most → **chart**
3. **Before vs. after** — the pain vs. the outcome → **before/after diagram**, not abstract art
4. **Concept / model** — e.g. a "canonical model", an "access governance" flow → **diagram**
5. **Scannable structure** — feature icons, not walls of text → **icon-library**
6. **Tone-setter (at most ONE)** — a single cover/hero whose only job is mood → **real photograph** (`image-sourcing`). An abstract AI illustration is the *last* resort and is forbidden if it pretends to explain anything.

Aim for **quality over quantity**: 3-5 deliberate visuals beat 12 random ones. **If five "visuals" all turned out to be abstract glowing renders, you have done this wrong** — that means you decorated instead of explained. Re-plan: each explanatory concept becomes a diagram.

### Step 3 — Choose the RIGHT technique for each concept

For every concept that survived Step 2, pick the technique and engine using the Iron Rule table above. Be specific about the *form*, not just the engine — "stacked bar of adoption by quarter", not "a chart".

### Step 4 — Bind everything to ONE visual style

Before delegating, lock a shared style so the visuals look like a set:

- Derive a **palette** + **style prefix** from the product's brand or, if none exists, from the `styleguide` skill (design-plugin). One palette, one mood, applied to every D3 theme, Draw.io color, and image prompt.
- Pass the palette into `graph-generation` (theme-match the charts/diagrams) and the style prefix into every image prompt (via `media-prompt-craft`).
- Match every visual's aspect ratio to its placement (the `pptx`/`docx` skills list exact sizes).

## Output: the Visual Plan

Produce this table **before generating anything**, and confirm it with the user if the deliverable is large:

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

Then execute the plan top-to-bottom, delegating each row to its skill. Gather all visuals **before** writing the document/deck generation code.

## When NOT to use this skill

- The user named a specific diagram ("make a sequence diagram of login") → go directly to **graph-generation**.
- The user asked for one specific image/photo → go directly to **image-generation** / **image-sourcing**.
- There are no self-directed visuals to plan (pure text deliverable).

## Cross-references

- **graph-generation** — all charts, diagrams, architecture, maps, data viz (the destination for most plan rows)
- **image-sourcing** — real photos (preferred for people/places/products)
- **image-generation** — custom illustrations, backgrounds, mockups (NEVER diagrams)
- **icon-library** — pre-made SVG icons (don't generate these)
- **svg-mastery** — hand-tuned / animated vector marks
- **media-prompt-craft** (design-plugin) — turn the style prefix into per-image prompts
- **styleguide** (design-plugin) — derive the palette/mood when the product has no brand yet
- **pptx / docx** (office-plugin) — consume the gathered visuals; see their image-sizing tables

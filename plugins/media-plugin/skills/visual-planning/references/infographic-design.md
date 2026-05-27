# Infographic Design (reference)

Read this when `visual-planning` routes an asset to **"infographic"** — a single composed graphic that communicates information (stats, a timeline, "how it works", a comparison, parts-of-a-whole) in one self-contained, attractive layout. It decides **what kind of infographic it is**, then **how to compose it so it's legible, on-message, and attractive**.

> **Why this matters:** "Ugly infographic" almost always means one of three things: (1) it was sent to **AI image generation**, which fakes text and mangles numbers, so labels are garbled gibberish; (2) it tries to say **six things at once** with no hierarchy, so the reader sees a wall of equal-weight clutter; or (3) it has **no shared style** — random colors, mismatched icons, drifting alignment. Kill all three before a pixel is drawn.

## Step 0 — The classification gate (do this FIRST)

Every infographic is one of two fundamentally different things. Decide which **before** touching any engine:

| | **A. Data infographic** | **B. Decorative infographic-style hero** |
|---|---|---|
| **Its job** | Communicate **specific information** — real numbers, labels, steps, named parts, a timeline, a comparison | Set **tone** for a section/cover; it carries *no information the reader must read* |
| **Contains** | Text the reader must read correctly; exact figures; structured layout | A stylized, illustrative "infographic look" — shapes, icons, charts-as-texture — with **no legible content** |
| **Render with** | **`graph-generation`** (D3 for stat/timeline/comparison layouts; SVG for fully custom) | **`image-generation`** (AI image), under strict rules below |
| **Rule** | The default for *anything with real numbers or labels*. **No exceptions** — AI cannot render legible text or correct numbers. | Allowed **only** when there is genuinely nothing to read. The instant a real stat or label matters, it's type A. |

**If you are unsure, it is type A.** The cost of wrongly choosing B is garbled, fake, unprofessional output — the exact failure we're preventing. A "by the numbers" panel, a "how it works in 4 steps" graphic, a "before vs after" comparison, a "$2.4M / 99.97% / 42ms" stat card — **all type A, all composed, never AI-generated.**

> If you catch yourself writing a `generate_image` prompt containing real numbers, metric labels, step text, or "infographic with labels" — **stop.** That is a type A infographic → go to **graph-generation**.

---

## Path A — Data infographics (the common case)

Compose these in **`graph-generation`**: use the D3 patterns `stat-dashboard`, `timeline`, `radial-gauge`, `pie-donut`, or combine card/layout techniques for comparison panels and "how it works" flows. For a layout no pattern covers, hand-author **SVG** (`svg-mastery`). The principles below are what make it *good* — apply every one.

### 1. One infographic = one message
Write the single sentence the reader should walk away with ("Adoption tripled in a year", "Our pipeline has 4 stages", "We're 10× cheaper than X"). If you can't, the infographic isn't ready — or it's secretly two infographics. Cut everything that doesn't serve that sentence.

### 2. Build a visual hierarchy — exactly one hero
The reader's eye must land somewhere first. Give the infographic **one** dominant element (the hero number, the headline, the one chart that matters) at the largest size, then 2–5 supporting elements clearly smaller. Equal-weight everything = no hierarchy = the "wall of clutter" look. A rough scale:

| Role | Relative size | Example |
|---|---|---|
| Hero | 100% | `300%` growth, the headline stat |
| Section labels / sub-stats | 35–45% | "Revenue", "Uptime" |
| Supporting text / captions | 20–25% | unit notes, source, footnotes |

### 3. Pick the archetype that fits the data shape
Match the layout to *what the data is*, not to what looks fancy:

| If the message is… | Use archetype | Engine/pattern |
|---|---|---|
| A few key metrics | **Stat cards** (one hero + supporting) | D3 `stat-dashboard` |
| Change over time / milestones | **Timeline** | D3 `timeline` |
| Parts of a whole | **Donut / proportional** | D3 `pie-donut` (≤5 slices) |
| A single rate / progress | **Radial gauge / big number** | D3 `radial-gauge` |
| A sequence / "how it works" | **Numbered horizontal/vertical flow** | D3 or SVG cards + connectors |
| A vs. B | **Two-column comparison / before→after** | SVG or D3 card layout |
| Ranking | **Sorted bars with values labeled** | D3 `bar-chart`, value-labeled |

### 4. Label directly — kill legends and decoder rings
Put each value **on or beside** the thing it describes. Legends force the eye to ping-pong; direct labels read instantly. Show the number *and* its unit (`42ms`, not `42`). No legend unless a map/heatmap truly needs a color scale.

### 5. Restrained, intentional color
One accent color for the hero/most-important data, neutrals (greys) for everything else, plus at most 1–2 secondary accents for categories. Pull the palette from the project's brand or the **`styleguide`** skill — never random. Color must **encode meaning** (this metric, this category), never decorate. If removing a color loses no information, make it grey.

### 6. Maximize data-ink, declutter
Strip anything that isn't carrying information: heavy gridlines, 3-D effects, drop shadows, boxes around boxes, redundant axis ticks, background gradients. Light, thin, calm. Whitespace is a feature, not wasted space — it creates the grouping and breathing room that read as "professional".

### 7. Consistent iconography
If you use icons, get them from **`icon-library`** (one set, one stroke weight, one corner radius) — never AI-generate them and never mix sets. One icon per concept, sized to match the type scale, aligned to the same baseline grid.

### 8. Align to a grid; respect aspect ratio
Everything sits on a shared grid — left edges line up, gaps are uniform, cards are equal height. Misalignment is the single most common "amateur" tell. Match the canvas aspect ratio to where it lands (the `pptx`/`docx` skills list exact sizes; vertical 9:16 / 4:5 for social, 16:9 or full-width for decks/docs).

### 9. Typography
Two weights of one family is plenty: bold for hero/labels, regular for body. Establish the size scale from §2. Numbers in a tabular/lining figure style so columns align. Generous line spacing.

### Path A pre-flight (reject if any fails)
- [ ] One clear message; one dominant hero element.
- [ ] Every number has a unit and is **real** (no AI-faked figures).
- [ ] Color encodes meaning; ≤3 hues; pulled from the styleguide/brand.
- [ ] Labels are direct; no unnecessary legend.
- [ ] Icons are one consistent set (icon-library), or none.
- [ ] Elements align to a grid; cards equal height; uniform gaps.
- [ ] No chartjunk (3-D, shadows, heavy gridlines, gratuitous gradients).
- [ ] Rendered at ≥2× DPI, theme-matched to its destination.

---

## Path B — Decorative infographic-style hero (rare, strict rules)

Only when the graphic conveys **no information the reader must read** — a cover/section image that merely *evokes* "data", "process", "growth" as mood. Render via **`image-generation`**. This is a last resort; if a real stat or label matters, it's Path A.

**Non-negotiable rules for the prompt:**
1. **Never put real text, numbers, labels, or metrics in the prompt and expect them legible.** AI renders them as garbled gibberish. Treat all "text" as abstract texture.
2. Describe it as a **stylized illustration** ("clean flat-illustration in the style of an infographic, abstract data shapes, **no text, no numbers**"), not as a real chart of real data.
3. Bind it to the project **style prefix** (palette + mood) from **`media-prompt-craft`** so it matches the deck/doc.
4. Stay away from "AI tech slop" (glowing orbs, holographic globes, circuit-board cities, navy-and-gold abstracts) — see `image-generation`'s banned list.
5. Add `no text, no labels, no numbers, no watermark` to the negative/prompt tail.

Example (decorative only): *"Clean flat vector illustration in an infographic style, abstract bar and donut shapes as decorative motifs, soft [brand palette] tones, lots of whitespace, modern editorial feel — no text, no numbers, no labels."*

If you find yourself wanting the AI to render the actual bars/percentages/labels accurately → that's Path A. Go to `graph-generation`.

---

## Output

Before rendering, state one line: **`Infographic: <message> | Path A (archetype: …, engine: …) | style: <palette/prefix>`** — then delegate. For Path A, gather the composed asset from `graph-generation`/`svg-mastery`; for Path B, the image from `image-generation`. Run the relevant pre-flight before handing the asset on.

## See also
- **graph-generation** — composes Path A infographics (D3 `stat-dashboard`, `timeline`, `radial-gauge`, `pie-donut`; SVG for custom).
- **svg-mastery** — hand-authored custom infographic layouts.
- **image-generation** — Path B decorative hero only (never for legible data).
- **icon-library** — the one consistent icon set for Path A.
- **media-prompt-craft** — turns the style prefix into the Path B prompt.
- **styleguide** (design-plugin) — derives the palette/mood when there's no brand yet.
- **pptx / docx** (office-plugin) — consume the finished infographic; see their image-sizing tables.

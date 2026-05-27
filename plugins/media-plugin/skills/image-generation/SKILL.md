---
name: image-generation
description: Generate and work with images using the media-mcp server's generate_image tool. Use when the user asks to create images, generate visuals, make illustrations, create thumbnails, design graphics, produce concept art, create product mockups, or work with reference images. Supports multiple aspect ratios, resolutions up to 4K, reference image input, and Google Search grounding for realistic results.
---

# Image Generation

> **Step 0 — plan first.** Before generating, run the **visual-planning** skill: clarify the ask, lock the style, pin the message, decide what's IN/OUT, then draft and review the prompt. It's the gate that prevents off-message, off-style, or garbled output.

Use the `mcp__media-mcp__generate_image` tool to create images via Google Gemini.

## STOP — is this actually a diagram or chart?

AI image generation is **only** for photographs, illustrations, textures, backgrounds, and product mockups — visuals with no structured information to get wrong. It produces **ugly, garbled output** for anything with boxes, arrows, axes, labels, nodes, or data, because the model fakes text and mangles layout.

**Never use `generate_image` for:** architecture diagrams, flowcharts, charts/graphs, infographics with labels, system maps, network/topology diagrams, sequence/state/ER diagrams, dashboards, or any "diagram of X". Those go to the **graph-generation** skill (D3 / Mermaid / Draw.io), which renders crisp, professional, vendor-icon-accurate output. **Infographics** in particular: any infographic with real numbers/labels is composed in graph-generation — see **visual-planning**'s `references/infographic-design.md`, which classifies infographics and only allows `generate_image` for a purely *decorative* infographic-style hero with no legible text.

If you're producing visuals for a document/deck/sales asset and deciding what to show yourself, start with the **visual-planning** skill — it plans the whole set and routes each visual to the right engine.

### Do not generate abstract "AI tech slop" to explain a product

A polished render can still be the wrong visual. If a visual's job is to **explain** something about a product — how it works, its structure, a concept/model, a before→after, a data or access flow — it must be a **diagram** (`graph-generation`), never an abstract image. The following genres are **banned as explanatory product visuals** because they look expensive but convey nothing:

- glowing orbs / swirls / energy cores; glowing network-node spheres, cubes, or lattices
- holographic globes / continent maps with light arcs; circuit-board cities; abstract "data highways"
- shattered glass, floating documents, particle streams; generic navy-blue-with-gold-glow tech abstracts

If your prompt reads like *"glowing holographic [concept], dark background, blue and gold, futuristic, abstract"*, stop — that concept is a **diagram** (or, for pure tone-setting only, a **real photo** via image-sourcing).

## When to Use

- User asks to "create an image", "generate a picture", "make a visual", "design a graphic"
- User needs thumbnails, illustrations, concept art, mockups, diagrams, or icons
- User provides a reference image and wants variations or modifications
- User describes a scene, character, product, or concept they want visualized

> **Tip:** If the user needs a **real photograph** (e.g., stock photo of a real place, person, or product), consider using the **image-sourcing** skill instead, which finds and downloads existing photos from Unsplash, Pexels, and Pixabay.

## Tool Reference

### generate_image

**Key parameters:**

| Parameter | Type | Description |
|---|---|---|
| `prompt` | string (required) | Detailed description of the desired image |
| `model` | string | Model variant (default varies) |
| `aspect_ratio` | string | `"1:1"`, `"3:4"`, `"4:3"`, `"9:16"`, `"16:9"` |
| `resolution` | string | From `"512"` up to `"4k"` |
| `reference_images` | array | Reference images for style/content guidance. Each entry may be a **file path** (preferred — e.g. a previously generated/sourced image), a `data:image/...;base64,...` data-URI, or a raw base64 string. **Prefer file paths** — passing megabytes of base64 inline bloats the conversation history. |
| `thinking` | string | Thinking level for complex prompts |
| `google_search` | boolean | Enable Google Search grounding for realistic/factual images |

## Prompt Writing Guidelines

### Be specific and descriptive

Bad: "a dog"
Good: "A golden retriever sitting on a wooden porch at sunset, warm orange lighting, shallow depth of field, photorealistic style"

### Specify style explicitly

- **Photorealistic**: "photorealistic, high detail, natural lighting, DSLR quality"
- **Illustration**: "digital illustration, clean lines, vibrant colors, flat design"
- **Sketch**: "pencil sketch, hand-drawn, crosshatching, on white paper"
- **3D render**: "3D render, octane render, soft shadows, studio lighting"
- **Watercolor**: "watercolor painting, soft edges, paper texture, muted palette"

### Specify composition

- Framing: "close-up", "wide shot", "bird's eye view", "isometric"
- Lighting: "golden hour", "studio lighting", "dramatic shadows", "backlit"
- Background: "white background", "blurred bokeh", "minimalist", "detailed environment"

## Common Patterns

### Product mockup
```
Generate an image of a modern mobile app displayed on an iPhone 15,
the app shows a dashboard with charts, placed on a clean white desk
with subtle shadows, photorealistic, studio lighting
```

### UI/UX concept
```
Generate an image of a minimalist login page design, dark mode,
centered card with email and password fields, gradient purple-blue
background, modern sans-serif typography, UI design mockup style
```

### Architecture / diagrams / charts — DO NOT generate as images

Diagrams and charts are **not** image-generation tasks. A "cloud architecture diagram" or "microservices chart" generated as an AI image will come out with fake labels, wonky boxes, and no real vendor icons. Use the **graph-generation** skill instead (Draw.io for architecture with real AWS/Azure/GCP/Cisco/K8s icons, D3 for data charts, Mermaid for flows). This rule has no exceptions.

### Icon set
```
Generate an image of a set of 8 flat design icons for a finance app:
wallet, chart, transfer, settings, notification, card, history, profile.
Consistent style, rounded corners, monochrome blue on white, 2D flat design
```

### With reference image
```
Use the reference image as a style guide and create a similar
composition but with [different subject/scene/modification]
```

## Aspect Ratio Guide

| Ratio | Best for |
|---|---|
| `1:1` | Social media posts, profile pictures, icons |
| `4:3` | Presentations, UI mockups, traditional photos |
| `3:4` | Portraits, mobile screenshots, book covers |
| `16:9` | Banners, hero images, video thumbnails, slides |
| `9:16` | Mobile stories, vertical video thumbnails, phone wallpapers |

## Output Handling — MEDIA_OUTPUT_DIR

**When `MEDIA_OUTPUT_DIR` is set** (recommended): The MCP server saves the generated image to a file and returns only the file path. Always use just this path — do NOT request or embed the raw image data. This is critical because all MCP request/response messages are stored in the conversation history, and large base64 payloads pollute the context window, degrading performance.

**When `MEDIA_OUTPUT_DIR` is not set**: The MCP server has no choice but to return the image as base64 data in the response. This works but is suboptimal for conversation history size.

After generation you can:

1. **Use in documentation** — reference the returned file path in markdown
2. **Use as reference** — pass the file path back as a `reference_image` for variations
3. **Iterate** — refine the prompt based on results and regenerate

## Tips

- Enable `google_search: true` when generating images of real products, landmarks, or factual content
- Use higher resolution (`"4k"`) for final assets, lower (`"512"`) for quick iterations
- When generating multiple related images, describe a consistent style in every prompt to maintain visual coherence

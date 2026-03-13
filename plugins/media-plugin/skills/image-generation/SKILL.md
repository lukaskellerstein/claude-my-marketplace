---
name: image-generation
description: Generate and work with images using the media-mcp server's generate_image tool. Use when the user asks to create images, generate visuals, make illustrations, create thumbnails, design graphics, produce concept art, create product mockups, or work with reference images. Supports multiple aspect ratios, resolutions up to 4K, reference image input, and Google Search grounding for realistic results.
---

# Image Generation

Use the `mcp__media-mcp__generate_image` tool to create images via Google Gemini.

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
| `reference_images` | array | Paths to reference images for style/content guidance |
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

### Architecture diagram (visual)
```
Generate an image of a cloud architecture diagram showing
microservices connected to a central API gateway, with databases
and message queues, clean technical illustration style, white background,
using blue and gray color scheme
```

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

---
name: image-sourcing
description: Find and download existing images from the web using stock photo services like Unsplash, Pexels, and Pixabay. Use when the user wants to find real photographs, stock photos, or existing images rather than generating new ones with AI. Also useful when the user needs royalty-free images, creative commons photos, or reference material from the web.
---

# Image Sourcing from the Web

Use `WebSearch` and `WebFetch` (or `curl` via Bash) to find and download existing images from stock photo services and the web.

## When to Use

- User asks to "find an image", "get a photo", "download a picture", "search for images"
- User needs **real photographs** (not AI-generated) — e.g., photos of real places, people, products
- User wants **stock photos** or **royalty-free images** for a project
- User mentions Unsplash, Pexels, Pixabay, or other stock photo services
- User needs a quick placeholder or reference image without waiting for AI generation
- User wants images with known licensing (Creative Commons, royalty-free)

## When NOT to Use (Use Image Generation Instead)

- User wants a **custom illustration**, concept art, or something that doesn't exist
- User needs a **specific composition** that wouldn't be found in stock photos
- User wants to **modify or restyle** an existing image with AI

## Sourcing Workflow

### Step 1: Search for Images

Use `WebSearch` to find relevant images. Target stock photo services for quality and licensing clarity.

**Recommended search queries:**

```
site:unsplash.com {subject} photo
site:pexels.com {subject} photo
site:pixabay.com {subject}
{subject} royalty free photo
{subject} creative commons image
```

**Example:**
```
WebSearch: "site:unsplash.com mountain sunset landscape photo"
```

### Step 2: Get the Direct Image URL

Stock photo services provide direct download URLs:

- **Unsplash**: `https://unsplash.com/photos/{photo-id}` — use the download link from the page
- **Pexels**: `https://www.pexels.com/photo/{slug}-{id}/` — extract the image URL
- **Pixabay**: `https://pixabay.com/photos/{slug}-{id}/` — extract the image URL

Use `WebFetch` to load the photo page and extract the direct image URL if needed.

### Step 3: Download the Image

Download the image using `curl` via Bash to the output directory:

```bash
# Determine output directory
OUTPUT_DIR="${MEDIA_OUTPUT_DIR:-.}"

# Download from Unsplash (use the direct download URL)
curl -L -o "$OUTPUT_DIR/image-name.jpg" "https://images.unsplash.com/photo-{id}?w=1920&q=80"

# Download from Pexels
curl -L -o "$OUTPUT_DIR/image-name.jpg" "https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?w=1920"

# Download from Pixabay
curl -L -o "$OUTPUT_DIR/image-name.jpg" "{direct-image-url}"

# Generic download
curl -L -o "$OUTPUT_DIR/image-name.jpg" "{image-url}"
```

### Step 4: Report the Result

After downloading, report:
- The file path of the downloaded image
- The source URL and attribution info
- The license type (Unsplash License, Pexels License, Pixabay License, CC0, etc.)
- Suggest next steps if relevant

## Stock Photo Services

### Unsplash (Recommended)
- **URL**: https://unsplash.com
- **License**: Unsplash License — free for commercial and non-commercial use, no attribution required (but appreciated)
- **Quality**: High-resolution professional photography
- **Search**: `site:unsplash.com {keywords}`
- **Direct download pattern**: `https://images.unsplash.com/photo-{id}?w={width}&q=80`
- **Sizes**: Append `?w=640` (small), `?w=1280` (medium), `?w=1920` (large), `?w=3840` (4K)

### Pexels
- **URL**: https://www.pexels.com
- **License**: Pexels License — free for commercial and non-commercial use, no attribution required
- **Quality**: Professional photography and some video
- **Search**: `site:pexels.com {keywords}`

### Pixabay
- **URL**: https://pixabay.com
- **License**: Pixabay Content License — free for commercial and non-commercial use
- **Quality**: Mix of professional and community photos, illustrations, vectors
- **Search**: `site:pixabay.com {keywords}`

### Other Sources
- **Wikimedia Commons**: `site:commons.wikimedia.org {keywords}` — CC-licensed media
- **Flickr Creative Commons**: `site:flickr.com {keywords} creative commons`

## Common Patterns

### Hero image for a website
```
Search: "site:unsplash.com modern office workspace minimal"
Download at w=1920 for standard hero, w=3840 for retina
```

### Blog post thumbnail
```
Search: "site:unsplash.com {blog topic} photo"
Download at w=1280 for blog thumbnail
```

### Background texture
```
Search: "site:unsplash.com abstract texture background dark"
Download and suggest CSS background-image usage
```

### Team/people placeholder
```
Search: "site:unsplash.com professional headshot portrait"
Download for mockups or placeholders
```

### Product context photo
```
Search: "site:pexels.com {product category} lifestyle photo"
Download for marketing materials
```

## Size Guidelines

| Use Case | Recommended Width | Query Parameter |
|---|---|---|
| Thumbnail / icon | 640px | `?w=640&q=80` |
| Blog post / card | 1280px | `?w=1280&q=80` |
| Hero / banner | 1920px | `?w=1920&q=80` |
| Full-screen / 4K | 3840px | `?w=3840&q=80` |

## Attribution Best Practices

Even when not legally required, it's good practice to credit photographers:

```markdown
Photo by [Photographer Name](https://unsplash.com/@username) on [Unsplash](https://unsplash.com)
```

Always inform the user of the license terms so they can decide on attribution.

## Output Handling — MEDIA_OUTPUT_DIR

When `MEDIA_OUTPUT_DIR` is set, save downloaded images there to keep them alongside generated media assets. Use descriptive filenames that indicate the content (e.g., `mountain-sunset-hero.jpg` not `image1.jpg`).

## Tips

- Prefer **Unsplash** for highest quality professional photography
- Use **Pexels** as an alternative with similar quality and licensing
- Use **Pixabay** when you need illustrations or vectors in addition to photos
- Always download at an appropriate size — don't fetch 4K for a thumbnail
- When the user's need is ambiguous, ask whether they want an existing photo or an AI-generated image
- Downloaded images can be used as `reference_images` for the AI image generation tool to create variations

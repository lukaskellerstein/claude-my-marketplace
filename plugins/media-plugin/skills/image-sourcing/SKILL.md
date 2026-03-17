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

## CRITICAL RULES

1. **NEVER guess or construct image URLs.** You cannot know the URL of an image without finding it first. Do not fabricate URLs like `https://images.unsplash.com/photo-{id}` — these will not work.
2. **NEVER try to WebFetch Unsplash/Pexels/Pixabay photo pages** to extract download URLs. These sites are JavaScript-heavy and WebFetch cannot extract usable image URLs from them.
3. **Always search first, then present options to the user.** The workflow is: search → present results → let user choose → download.
4. **If you cannot find a suitable image, say so honestly.** Do not silently fall back to AI generation. Tell the user what you searched for and that no good match was found, then suggest alternatives (different search terms, or AI generation).

## Sourcing Workflow

### Step 1: Search for Images Using the Unsplash API

Use `WebFetch` to query the **Unsplash Source/Search API** which returns JSON with actual image URLs.

**Use the Unsplash search endpoint (no API key needed for basic search):**

```
WebFetch: https://unsplash.com/napi/search/photos?query={keywords}&per_page=9
```

This returns JSON with an array of `results`, each containing:
- `urls.regular` — direct image URL (1080px wide, good for most uses)
- `urls.small` — smaller version (400px)
- `urls.full` — full resolution
- `urls.raw` — raw image (append `?w=1920&q=80` for custom size)
- `description` or `alt_description` — what the image shows
- `user.name` — photographer name
- `user.links.html` — photographer profile URL
- `links.html` — link to the photo page on Unsplash

**Example:**
```
WebFetch: https://unsplash.com/napi/search/photos?query=mountain+sunset+landscape&per_page=9
```

You can also search **Pexels** and **Pixabay** via web search as a fallback:
```
WebSearch: "site:pexels.com {subject} photo"
WebSearch: "site:pixabay.com {subject}"
```

### Step 2: Review and Present Options to the User

From the API response, review the results:
- Look at the `description` and `alt_description` fields to understand what each image shows
- Select the 3-5 most relevant results
- Present them to the user with:
  - A brief description of each image
  - The photographer's name
  - The Unsplash page link (`links.html`) so the user can preview
  - A note on which one you'd recommend and why

**IMPORTANT:** Let the user choose which image(s) they want. Do not download without presenting options first, unless the user explicitly asked for "any" image or the first result.

### Step 3: Download the Selected Image

Once the user has chosen (or if they asked for "any"), download using the `urls.regular` or `urls.raw` URL from the API response:

```bash
# Determine output directory
OUTPUT_DIR="${MEDIA_OUTPUT_DIR:-.}"

# Download using the ACTUAL URL from the API response (not a guessed URL)
curl -L -o "$OUTPUT_DIR/descriptive-name.jpg" "ACTUAL_URL_FROM_API_RESPONSE"
```

**Size options using `urls.raw`:**
- Thumbnail: append `?w=640&q=80`
- Medium: append `?w=1280&q=80`
- Large: append `?w=1920&q=80`
- 4K: append `?w=3840&q=80`

Or just use `urls.regular` for a sensible default size.

### Step 4: Report the Result

After downloading, report:
- The file path of the downloaded image
- The source URL (Unsplash page link) and photographer name
- The license type (Unsplash License — free for commercial and non-commercial use)
- Suggested attribution text

## Fallback: When the Unsplash API Doesn't Work

If the Unsplash `napi` endpoint is blocked or returns errors:

1. **Use WebSearch** with queries like `{subject} photo site:unsplash.com` or `{subject} royalty free stock photo`
2. **Look at the search result snippets** — they often contain useful context about the images
3. **Present the search result links** to the user so they can browse and choose
4. **Do NOT try to WebFetch individual photo pages** on Unsplash/Pexels/Pixabay — these are JS-rendered and won't give you download URLs
5. If the user picks an image from search results, ask them to provide the direct image URL, or suggest using AI image generation instead

## Stock Photo Services

### Unsplash (Recommended — has usable API)
- **License**: Unsplash License — free for commercial and non-commercial use, no attribution required (but appreciated)
- **Quality**: High-resolution professional photography
- **API endpoint**: `https://unsplash.com/napi/search/photos?query={keywords}&per_page=9`

### Pexels
- **License**: Pexels License — free for commercial and non-commercial use, no attribution required
- **Quality**: Professional photography and some video
- **Search**: `site:pexels.com {keywords}` via WebSearch

### Pixabay
- **License**: Pixabay Content License — free for commercial and non-commercial use
- **Quality**: Mix of professional and community photos, illustrations, vectors
- **Search**: `site:pixabay.com {keywords}` via WebSearch

### Other Sources
- **Wikimedia Commons**: `site:commons.wikimedia.org {keywords}` — CC-licensed media
- **Flickr Creative Commons**: `site:flickr.com {keywords} creative commons`

## Attribution Best Practices

Even when not legally required, it's good practice to credit photographers:

```markdown
Photo by [Photographer Name](https://unsplash.com/@username) on [Unsplash](https://unsplash.com)
```

Always inform the user of the license terms so they can decide on attribution.

## Output Handling — MEDIA_OUTPUT_DIR

When `MEDIA_OUTPUT_DIR` is set, save downloaded images there to keep them alongside generated media assets. Use descriptive filenames that indicate the content (e.g., `mountain-sunset-hero.jpg` not `image1.jpg`).

## Tips

- Prefer **Unsplash** for highest quality — and use its API for reliable image URLs
- Use **Pexels** or **Pixabay** as alternatives via web search
- **Never guess or fabricate image URLs** — always get them from API responses or confirmed sources
- When the user's need is ambiguous, ask whether they want an existing photo or an AI-generated image
- If no suitable stock photo exists for the user's need, say so and suggest AI generation
- Downloaded images can be used as `reference_images` for the AI image generation tool to create variations

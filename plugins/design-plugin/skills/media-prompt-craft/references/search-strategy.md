# Stock Photo Search Strategy

How to construct effective search queries for stock photo platforms to find images that actually match your design vision, rather than settling for generic results.

---

## Query Construction Principles

### Subject + Mood + Setting

The best queries combine three layers:
1. **Subject** — what is in the image (person, object, scene)
2. **Mood** — how it feels (serene, dramatic, cozy)
3. **Setting** — where it takes place (office, outdoor, studio)

"Woman working" returns generic results. "Focused woman working laptop minimal home office morning light" returns usable results.

### Specificity Beats Breadth

Narrow queries return fewer but more relevant results. Start specific and broaden only if you get too few results.

- Bad: "business meeting"
- Better: "small team brainstorming whiteboard startup office"
- Best: "three people brainstorming whiteboard casual startup office natural light"

### Adjectives Matter More Than Nouns

Stock photo search engines weight descriptive terms heavily. The nouns determine what appears, but the adjectives determine what it looks and feels like.

Compare:
- "office" — thousands of generic results
- "bright minimal Scandinavian office plants" — immediately distinctive

### Combine Concrete + Abstract

Pair a concrete subject with an abstract quality:
- "hands typing laptop concentration"
- "mountain landscape solitude"
- "coffee shop warm community"

---

## Unsplash-Specific Tips

### How Unsplash Search Works
- Results are ranked by a combination of relevance, recency, and popularity (downloads/views)
- Recent uploads are boosted slightly, which means fresher imagery
- Searches match against photographer-provided tags, descriptions, and AI-detected content
- Color-based searching is supported (append color name or use the color filter)

### Effective Keywords on Unsplash
- Aesthetic terms work well: "minimalist", "moody", "cinematic", "editorial"
- Unsplash has a strong photography community, so photographic terms like "golden hour", "shallow depth of field", and "35mm" return high quality results
- Seasonal terms are effective: "autumn", "winter morning", "spring bloom"
- Material terms surface textures: "marble", "concrete", "linen", "wood grain"

### URL Parameters
Control image delivery directly via URL parameters:

| Parameter | Example | Effect |
|-----------|---------|--------|
| `?w=1200` | `unsplash.com/photo/abc?w=1200` | Set width to 1200px |
| `?h=800` | `unsplash.com/photo/abc?h=800` | Set height to 800px |
| `?q=80` | `unsplash.com/photo/abc?q=80` | Quality 80% (good balance) |
| `?fit=crop` | `unsplash.com/photo/abc?fit=crop` | Crop to exact dimensions |
| `?fm=webp` | `unsplash.com/photo/abc?fm=webp` | Convert to WebP format |

Combine them: `?w=1200&h=630&fit=crop&q=80&fm=webp` for an optimized Open Graph image.

### Orientation Filter
- Use `&orientation=landscape` for hero images and banners
- Use `&orientation=portrait` for mobile backgrounds and cards
- Use `&orientation=squarish` for social media and avatars

---

## Pexels-Specific Tips

### Multi-Word Queries
- Pexels handles multi-word queries well and treats them as a phrase search
- Use commas to separate distinct concepts: "office, minimal, bright"
- Pexels has strong category browsing that can complement search

### Color Filtering
- Pexels offers a dedicated color filter in the search interface
- Supports hex colors and named colors
- Useful for finding images that match a specific brand palette

### Orientation
- Filter by horizontal, vertical, or square
- Pexels tends to have more diversity in vertical/portrait images than some competitors

### Quality Notes
- Pexels curates submissions more strictly than some platforms
- Videos are also available with the same search terms
- Results tend to be more polished and production-ready

---

## Pixabay-Specific Tips

### Category Filtering
- Pixabay organizes by category: backgrounds, business, computer, education, fashion, food, nature, people, science, sports, transportation
- Combine category filter with search terms for tighter results

### Editor's Choice
- Pixabay marks exceptional images as "Editor's Choice"
- Filter for these when you need the highest quality
- Editor's Choice images tend to have better composition and lighting

### Search Modifiers
- Use quotes for exact phrase matching: "home office"
- Prefix with `-` to exclude: "office -corporate"
- Pixabay supports both photos and vector illustrations in the same search

### Format Notes
- Offers multiple download sizes without requiring URL parameters
- Provides SVG vectors alongside raster images for illustrations
- Has a wider range of illustration styles than Unsplash or Pexels

---

## Query Templates by Use Case

| Use Case | Bad Query | Good Query | Why It's Better |
|----------|-----------|------------|-----------------|
| Hero image | "website background" | "abstract soft gradient light blue white minimal" | Describes the visual qualities, not the usage |
| Team photo | "business team" | "diverse small team laughing casual office natural light" | Specifies mood, size, setting, and lighting |
| Product context | "laptop" | "laptop on clean desk minimal workspace morning side light" | Adds environment and atmosphere |
| Texture | "texture" | "white marble surface subtle veins close up flat lay" | Names the specific material and shooting style |
| Abstract bg | "abstract background" | "geometric shapes navy and gold dark subtle pattern" | Specifies colors, mood, and style |
| Lifestyle | "happy person" | "woman enjoying coffee quiet cafe morning reading relaxed" | Describes a specific moment with setting and action |
| Food | "food" | "artisan sourdough bread wooden board rustic kitchen morning" | Names specific food, surface, setting, and time |
| Architecture | "building" | "modern glass facade reflections blue sky upward perspective" | Specifies material, angle, and quality of light |
| Nature | "nature" | "misty forest path morning light rays through trees" | Creates a specific scene with atmosphere |

---

## Batch Search Strategy

When sourcing images for a complete project, consistency matters more than individual image quality. A mediocre set that feels cohesive beats a collection of individually strong images that clash.

### Step 1: Define Your Style Constants

Before searching, establish 3-4 style words that will appear in every query:

| Brand Aesthetic | Style Constants |
|----------------|----------------|
| Swiss Precision | "minimal, clean, bright, geometric" |
| Dark Premium | "dark, moody, elegant, dramatic lighting" |
| Warm Organic | "warm, natural, soft light, earth tones" |
| Bold Playful | "colorful, vibrant, energetic, fun" |

### Step 2: Build Query Template

Create a template with fixed style and variable subject:

```
[subject] + [style constants] + [format hint]
```

Examples for a Warm Organic brand:
- "woman working laptop warm natural soft light earth tones"
- "team meeting warm natural soft light earth tones"
- "coffee shop interior warm natural soft light earth tones"
- "hands typing keyboard warm natural soft light earth tones"

### Step 3: Search Systematically

Work through your image needs in one session:
1. Hero image
2. Feature section images (3-4)
3. Testimonial backgrounds or portraits
4. About page imagery
5. Blog post headers
6. Social media templates

### Step 4: Audit for Consistency

After collecting candidates, review them together:
- Do the color temperatures match?
- Is the lighting direction consistent?
- Do the people/settings feel like the same world?
- Would a user scrolling the site feel a visual throughline?

Replace any outliers. It is better to use a slightly less ideal image that fits the set than a stunning image that breaks the visual coherence.

---

## Common Mistakes

### Mistake 1: Searching for the Use Case, Not the Visual

| Wrong | Right | Why |
|-------|-------|-----|
| "hero image for SaaS" | "abstract gradient mesh soft blue" | Stock search engines don't know your layout |
| "about us section" | "diverse team casual office candid" | Describe what should be in the image |
| "call to action background" | "dark textured surface subtle light" | Describe the visual, not the UI component |

### Mistake 2: Using Cliche Terms

These terms return the most overused, generic stock photos:

| Cliche Query | Better Alternative |
|--------------|-------------------|
| "business handshake" | "two professionals meeting genuine smile office" |
| "teamwork" | "colleagues collaborating whiteboard casual focused" |
| "success" | "person on mountain summit sunrise achievement" |
| "innovation" | "engineer prototyping workshop concentration" |
| "diversity" | "mixed group friends laughing outdoor natural" |
| "technology" | "close up hands coding dark screen ambient glow" |
| "growth" | "seedling breaking through soil macro morning dew" |

### Mistake 3: Not Specifying Lighting

Lighting is the most important quality differentiator. Images lit by fluorescent overhead lights look cheap. Images with intentional lighting look professional.

Always add one of: "natural light", "soft window light", "golden hour", "dramatic side light", "bright even studio light", "moody ambient light."

### Mistake 4: Ignoring Negative Space

If you plan to overlay text on the image, you need negative space (empty areas). Add to your query:
- "with copy space"
- "negative space on left" (or right, top, bottom)
- "minimal composition with empty area"
- "clean background area for text"

### Mistake 5: Searching Once and Settling

Stock photo searching is iterative:
1. Start with your ideal query
2. Look at the best results and note what terms the photographer used in their tags
3. Refine your query with those terms
4. Repeat 2-3 times

Most people stop after step 1 and settle for mediocre results.

### Mistake 6: Mixing Eras and Styles

A photo shot in 2005 will look noticeably different from one shot in 2024, even if the subject is the same. Pay attention to:
- Camera quality and grain structure
- Color science (older photos tend toward warmer, less accurate colors)
- Styling (clothing, hair, interior design)
- Post-processing trends (heavy HDR was common in 2010-2015)

If you need modern-looking images, sort by newest or add "contemporary" to your query.

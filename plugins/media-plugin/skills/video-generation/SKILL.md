---
name: video-generation
description: Generate videos and GIFs using the media-mcp server's generate_video tool. Use when the user asks to create videos, animations, GIFs, motion graphics, product demos, explainer clips, or video content. Supports text-to-video, image-to-video (animate a still image), and video extension modes with native audio generation.
---

# Video Generation

Use the `mcp__media-mcp__generate_video` tool to create videos via Google Gemini Veo models.

## When to Use

- User asks to "create a video", "make a GIF", "animate this", "generate a clip"
- User wants to animate a static image
- User needs a product demo, explainer animation, or motion graphic
- User wants to extend an existing video clip
- User describes a scene or sequence they want as video

## Tool Reference

### generate_video

**Key parameters:**

| Parameter | Type | Description |
|---|---|---|
| `prompt` | string (required) | Description of the video content and motion |
| `model` | string | Veo model variant |
| `aspect_ratio` | string | `"16:9"` (landscape) or `"9:16"` (portrait/vertical) |
| `resolution` | string | Output resolution |
| `reference_images` | array | Up to 3 images — first frame, style reference, or scene context |

## Video Modes

### Text-to-Video
Generate video purely from a text description:
```
A drone shot flying over a coastal city at golden hour,
camera slowly tilting down to reveal the harbor,
cinematic, smooth motion, 4K quality
```

### Image-to-Video
Animate a still image by providing it as a reference:
```
Animate this product photo — the camera slowly orbits around
the product with a subtle zoom, soft studio lighting,
smooth continuous motion
```
Pass the image path in `reference_images`.

### Video Extension
Extend an existing clip by describing what happens next.

## Prompt Writing Guidelines

### Describe motion explicitly

Bad: "a city at night"
Good: "Camera slowly pans across a city skyline at night, neon lights flickering, cars moving on streets below, gentle zoom toward the tallest building"

### Specify camera movement

- "Static shot" — no camera movement
- "Slow pan left/right" — horizontal camera sweep
- "Tilt up/down" — vertical camera movement
- "Dolly in/out" — camera moves toward/away from subject
- "Orbit" — camera circles around subject
- "Drone shot" — aerial perspective with movement
- "Tracking shot" — camera follows a moving subject
- "Zoom in/out" — focal length change

### Specify pacing and mood

- "Slow, contemplative" — gentle transitions, long takes
- "Dynamic, energetic" — quick movements, high energy
- "Cinematic" — film-quality look, dramatic lighting
- "Timelapse" — sped-up passage of time

## Common Patterns

### Product showcase
```
A sleek smartphone rotating slowly on a reflective black surface,
studio lighting with soft highlights on the edges,
camera orbits 180 degrees, smooth continuous motion, premium feel
```

### Explainer animation
```
An animated diagram showing data flowing from a user's device
through an API gateway to microservices and back,
clean flat design style, arrows animate along the path,
smooth transitions between stages
```

### App demo
```
A screen recording style video showing a mobile app in use:
a finger taps the login button, the dashboard loads with
animated charts, then scrolls down to show a list view,
clean UI, modern design
```

### Nature/ambient
```
A serene forest stream with sunlight filtering through trees,
leaves gently swaying in the breeze, water flowing over smooth rocks,
cinematic slow motion, natural ambient sounds
```

### GIF-style loop
```
A simple looping animation of a loading spinner transforming
into a checkmark, flat design, green accent color on white background,
smooth 2-second loop
```

## Aspect Ratio Guide

| Ratio | Best for |
|---|---|
| `16:9` | YouTube, presentations, demos, landscape content |
| `9:16` | TikTok, Instagram Reels, YouTube Shorts, mobile-first |

## Output Handling — MEDIA_OUTPUT_DIR

**When `MEDIA_OUTPUT_DIR` is set** (recommended): The MCP server saves the generated video to a file and returns only the file path. Always use just this path — do NOT request or embed the raw video data. This is critical because all MCP request/response messages are stored in the conversation history, and large base64 payloads pollute the context window, degrading performance.

**When `MEDIA_OUTPUT_DIR` is not set**: The MCP server has no choice but to return the video as base64 data in the response. This works but is suboptimal for conversation history size.

After generation you can:

- **Convert to GIF**: `ffmpeg -i video.mp4 -vf "fps=15,scale=480:-1" output.gif`
- **Extract frames**: `ffmpeg -i video.mp4 -vf "fps=1" frame_%04d.png`
- **Trim**: `ffmpeg -i video.mp4 -ss 00:00:01 -to 00:00:03 -c copy trimmed.mp4`

## Tips

- Videos include native audio when appropriate — describe sounds in the prompt if you want specific audio
- For best results, describe both visual content AND motion/camera work
- Use reference images for image-to-video to maintain visual consistency
- Keep prompts focused — one clear scene per generation works better than complex multi-scene descriptions
- Generate at lower resolution for previews, then re-generate at higher resolution for final output

---
description: Generate a media asset — image, video, music, or speech — with guided prompts and sensible defaults
argument-hint: "<type> <description> (type: image|video|music|speech)"
allowed-tools: ["Read", "Write", "Bash", "Glob", "WebSearch", "WebFetch", "mcp__media-mcp__generate_image", "mcp__media-mcp__generate_video", "mcp__media-mcp__generate_music", "mcp__media-mcp__generate_speech"]
---

# Generate Media Asset

Quick command to generate a single media asset.

## Usage

```
/media-generate image A futuristic city skyline at sunset, cyberpunk style
/media-generate video A drone shot over mountains with clouds, cinematic
/media-generate music upbeat corporate background track, 120 BPM
/media-generate speech "Welcome to our product demo" --voice warm --style professional
/media-generate stock-image mountain sunset landscape for hero banner
/media-generate find-image professional team meeting office
```

## Steps

1. **Parse the arguments**: Extract the media type (first word) and the description (rest).

2. **Based on type, use the appropriate tool**:

   - **image**: Call `mcp__media-mcp__generate_image` with the description as prompt. Default to `16:9` aspect ratio unless the description suggests otherwise (portrait → `9:16`, square → `1:1`).

   - **stock-image** / **find-image**: Search for an existing image on stock photo services (Unsplash, Pexels, Pixabay) using `WebSearch`, then download with `curl` via Bash. Use the description as search keywords. Prefer Unsplash for high-quality photos. Download to `MEDIA_OUTPUT_DIR` if set.

   - **video**: Call `mcp__media-mcp__generate_video` with the description as prompt. Default to `16:9`.

   - **music**: Parse the description for BPM (look for "NNN BPM"), scale, and duration mentions. Build weighted prompts from the remaining description. Call `mcp__media-mcp__generate_music`.

   - **speech**: The description is the text to speak. Look for `--voice` and `--style` flags in the arguments. Call `mcp__media-mcp__generate_speech`.

3. **Report the result**: Show the file path or confirm generation, and suggest next steps (e.g., "use /media-generate video to animate this image").

## If type is missing or invalid

Ask the user what they want to generate:
```
What type of media would you like?
- image — AI-generated photos, illustrations, graphics, icons
- stock-image — find and download existing photos from Unsplash, Pexels, Pixabay
- video — clips, animations, GIFs
- music — background tracks, jingles, ambient audio
- speech — voiceover, narration, announcements
```

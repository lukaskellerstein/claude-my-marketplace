---
description: List, organize, and manage generated media assets in the output directory
argument-hint: "[list|organize|clean] [--dir=path]"
allowed-tools: ["Read", "Bash", "Glob", "Grep"]
---

# Manage Media Assets

List, organize, and manage previously generated media files.

## Usage

```
/media-assets list              # List all generated media files
/media-assets list --dir=./out  # List from specific directory
/media-assets organize          # Organize files into image/video/audio subfolders
/media-assets clean             # Show files that can be cleaned up (previews, drafts)
```

## Steps

### list (default)

1. Find the media output directory — check `MEDIA_OUTPUT_DIR` env var, fall back to current directory.
2. Find all media files:
   ```bash
   find "$DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" -o -name "*.mp4" -o -name "*.webm" -o -name "*.gif" -o -name "*.wav" -o -name "*.mp3" -o -name "*.ogg" -o -name "*.flac" \) | sort
   ```
3. Display grouped by type:
   ```
   Images (3):
     ./output/image_001.png (1.2 MB, 1920x1080)
     ./output/image_002.png (800 KB, 1024x1024)

   Videos (1):
     ./output/video_001.mp4 (5.4 MB, 00:08)

   Audio (2):
     ./output/music_001.wav (2.1 MB, 00:30)
     ./output/speech_001.wav (500 KB, 00:12)
   ```

### organize

1. Create subdirectories: `images/`, `videos/`, `audio/`
2. Move files to appropriate subdirectory based on extension
3. Report what was moved

### clean

1. Identify potential cleanup candidates:
   - Duplicate or similar files (same base name with different suffixes)
   - Very small files that may be failed generations
   - Files older than 30 days
2. Present the list and ask for confirmation before deleting anything — **never auto-delete**

---
name: speech-generation
description: Generate text-to-speech audio using the ElevenLabs MCP server's text_to_speech tool. Use when the user asks to create voiceovers, narration, audio from text, spoken dialogue, podcast-style audio, audiobook readings, announcements, or voice content. Supports voice selection by name or ID, multiple models (multilingual, flash, turbo), stability/similarity/style controls, speed adjustment, and multiple output formats.
---

# Speech Generation (Text-to-Speech)

Use the `mcp__ElevenLabs__text_to_speech` tool to convert text to natural-sounding speech via ElevenLabs.

## Quick Reference

| I want to create... | Read This | Preset to Start With |
|---------------------|-----------|---------------------|
| Product demo / explainer video | [voiceover.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voiceover.md) | Product Demo or Explainer Video |
| Marketing / promo voiceover | [voiceover.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voiceover.md) | Marketing / Promo |
| Audiobook / fiction | [narration.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/narration.md) | Fiction / Audiobook |
| Documentary narration | [narration.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/narration.md) | Documentary |
| Technical tutorial audio | [documentation.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/documentation.md) | Technical Tutorial |
| README / docs narration | [documentation.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/documentation.md) | README Narration |
| Podcast episode | [podcast.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/podcast.md) | Conversational Host |
| IVR / phone menu | [announcement.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/announcement.md) | IVR / Phone Menu |
| App notification sound | [announcement.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/announcement.md) | App Notification |
| Multi-language content | [multilingual.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/multilingual.md) | — |
| Custom parameter tuning | [voice-settings.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voice-settings.md) | See Named Presets table |

## When to Use

- User asks to "read this aloud", "create a voiceover", "generate narration"
- User wants audio versions of text content
- User needs podcast-style audio, announcements, or voice prompts
- User is creating audio for a video or presentation

## Tool Reference

### text_to_speech

**Key parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `text` | string (required) | — | The text to convert to speech |
| `voice_name` | string | — | Name of the voice (e.g. "Rachel", "Adam", "Bella") |
| `voice_id` | string | — | Voice ID (alternative to voice_name) |
| `model_id` | string | `eleven_multilingual_v2` | Model to use (see Models section) |
| `stability` | float (0–1) | 0.5 | Higher = more consistent, lower = more expressive |
| `similarity_boost` | float (0–1) | 0.75 | How closely to match the original voice |
| `style` | float (0–1) | 0 | Style exaggeration (increases latency if > 0) |
| `speed` | float (0.7–1.2) | 1.0 | Speech speed |
| `use_speaker_boost` | bool | true | Boost similarity to original speaker |
| `language` | string | "en" | ISO 639-1 language code |
| `output_format` | string | "mp3_44100_128" | Audio format (see Output Formats) |
| `output_directory` | string | ~/Desktop | Where to save the file |

**Only one of `voice_name` or `voice_id` can be provided.** If neither is given, the default voice is used.

## Models

| Model ID | Languages | Quality | When to Use |
|---|---|---------|-------------|
| `eleven_v3` | 70+ | Highest | **Best choice** — newest model, widest language support |
| `eleven_multilingual_v2` | 29 | High | Proven fallback if v3 produces artifacts |
| `eleven_flash_v2_5` | 32 | Good | Real-time / streaming, ultra-low latency |
| `eleven_turbo_v2_5` | 32 | Good | Batch processing, balanced speed/quality |
| `eleven_flash_v2` | 1 (EN) | Good | English-only, ultra-low latency |
| `eleven_turbo_v2` | 1 (EN) | Good | English-only, balanced |
| `eleven_monolingual_v1` | 1 (EN) | Basic | Legacy — avoid unless reproducing old output |

For detailed model comparison and selection guidance, see [voice-settings.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voice-settings.md).

## Voice Selection

Use `mcp__ElevenLabs__search_voices` to find voices already in the user's library, or `mcp__ElevenLabs__search_voice_library` to browse the full ElevenLabs voice library.

### Matching voices to content

| Content type | Voice criteria |
|---|---|
| Technical tutorial | Clear, measured, neutral pace |
| Marketing/promo | Energetic, warm, confident |
| Narration/story | Expressive, varied pacing |
| Announcement | Authoritative, clear, professional |
| Conversational | Natural, relaxed, friendly |

### Voice design

Use `mcp__ElevenLabs__text_to_voice` to generate a custom voice from a text description (e.g. "A warm female voice with a slight British accent"). This creates 3 preview variations. Save the best one with `mcp__ElevenLabs__create_voice_from_preview`.

### Voice cloning

Use `mcp__ElevenLabs__voice_clone` to create an instant voice clone from audio files.

## Voice Controls

Controls are summarized below. For parameter interaction details, named presets, and advanced tuning, see [voice-settings.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voice-settings.md).

| Parameter | Low | Medium | High |
|-----------|-----|--------|------|
| **Stability** (0–1) | Expressive, emotional (0.1–0.3) | Balanced default (0.4–0.6) | Consistent, monotone (0.7–1.0) |
| **Similarity Boost** (0–1) | More variation from base voice | — | Closely matches original (0.7–1.0) |
| **Style** (0–1) | Fastest generation (0) | Moderate expression (0.2–0.3) | Maximum style, higher latency (0.5+) |
| **Speed** (0.7–1.2) | Slow, deliberate (0.7) | Normal (1.0) | Fast-paced (1.2) |

## Output Formats

| Format | Description |
|---|---|
| `mp3_44100_128` | MP3 128kbps (default, good balance) |
| `mp3_44100_192` | MP3 192kbps (higher quality, Creator tier+) |
| `pcm_16000` | PCM 16kHz (raw audio) |
| `pcm_44100` | PCM 44.1kHz (high quality raw, Pro tier+) |
| `opus_48000_128` | Opus 128kbps (efficient streaming) |
| `ulaw_8000` | μ-law 8kHz (Twilio compatible) |

For platform-specific format recommendations, see [announcement.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/announcement.md).

## Common Patterns

### Documentation narration
See [documentation.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/documentation.md) for text cleaning, code block handling, and segmentation.
```
text: [cleaned documentation content]
voice_name: "Rachel"
model_id: "eleven_v3"
stability: 0.55
similarity_boost: 0.80
style: 0.10
speed: 0.90
```

### Video voiceover
See [voiceover.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voiceover.md) for timing tables, text prep, ffmpeg mixing, the timed voiceover pipeline, and golden rules.
```
text: "Introducing our new dashboard. With real-time analytics,
      you can track performance at a glance."
voice_name: "Adam"
model_id: "eleven_v3"
stability: 0.50
similarity_boost: 0.80
style: 0.25
speed: 0.95
```

### Announcement / notification
See [announcement.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/announcement.md) for brevity rules, templates, and platform formats.
```
text: "Deployment complete. All 12 services are running."
voice_name: "Bella"
model_id: "eleven_v3"
stability: 0.75
similarity_boost: 0.85
style: 0.05
speed: 1.05
```

### Story / narrative
See [narration.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/narration.md) for character voices, long-form strategy, and pacing.
```
text: [story content]
voice_name: "Rachel"
model_id: "eleven_v3"
stability: 0.25
similarity_boost: 0.80
style: 0.50
speed: 0.90
```

### Multi-language
See [multilingual.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/multilingual.md) for language tiers, pronunciation hints, and batch workflows.

Set `language` to the ISO 639-1 code and write text in the target language. Use `eleven_v3` (70+ languages) or `eleven_multilingual_v2` (29 languages).

### Podcast / multi-speaker
See [podcast.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/podcast.md) for multi-speaker workflow, voice pairing, and episode structure.

Generate each speaker's lines separately with different voices, then concatenate with natural gaps.

## Additional ElevenLabs Tools

| Tool | Use case |
|---|---|
| `mcp__ElevenLabs__speech_to_speech` | Transform audio from one voice to another |
| `mcp__ElevenLabs__speech_to_text` | Transcribe audio to text (with optional diarization) |
| `mcp__ElevenLabs__isolate_audio` | Isolate vocals from background noise |
| `mcp__ElevenLabs__voice_clone` | Clone a voice from audio files |
| `mcp__ElevenLabs__text_to_voice` | Design a new voice from a text description |

## Combining with Other Media Skills

### Voiceover + Video
1. Generate the video with `generate_video`
2. Generate the voiceover with `mcp__ElevenLabs__text_to_speech`
3. Combine with ffmpeg: `ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac output.mp4`

### Narration + Background Music
1. Generate narration with `mcp__ElevenLabs__text_to_speech`
2. Generate background music with `generate_music`
3. Mix audio: `ffmpeg -i narration.mp3 -i music.wav -filter_complex "[1:a]volume=0.2[bg];[0:a][bg]amix=inputs=2:duration=longest" output.mp3`

### Podcast Production
1. Generate each speaker's lines separately with different voices
2. Generate intro/outro jingle with `generate_music`
3. Concatenate: `ffmpeg -i intro.wav -i part1.mp3 -i part2.mp3 -i outro.wav -filter_complex "concat=n=4:v=0:a=1" podcast.mp3`

See [podcast.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/podcast.md) for the complete step-by-step workflow.

## Tips

- Write text as you want it spoken — use punctuation for natural pauses
- Use "..." for longer pauses: "And the winner is... congratulations!"
- Spell out abbreviations if you want them read as words: "API" vs "A.P.I."
- For numbers, write them as words if pronunciation matters: "twenty-three" vs "23"
- Test with a short sentence first to verify the voice before generating long content
- Use `output_directory` to control where files are saved (defaults to ~/Desktop)
- For advanced parameter tuning, consult [voice-settings.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voice-settings.md)
- For video voiceover, follow the [Golden Rules](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voiceover.md#golden-rules-for-video-voiceover) and [Timed Voiceover Pipeline](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voiceover.md#timed-voiceover-pipeline)
- Check [voice tiers](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voice-settings.md#voice-tiers--api-access) before selecting a voice — library/cloned voices need a paid plan
- Use the [Voice Selection Guide](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voiceover.md#voice-selection-guide) to match voice type to content — always test the voice before writing the full script

## Reference Files

| File | What It Covers | When to Read |
|------|---------------|--------------|
| [voice-settings.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voice-settings.md) | Parameter interactions, named presets, model selection, output formats | Tuning voice parameters or choosing a model |
| [voiceover.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/voiceover.md) | Product demos, explainers, marketing, corporate training | Creating audio for video content |
| [narration.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/narration.md) | Audiobooks, fiction, documentaries, children's stories | Long-form narrative or character voices |
| [documentation.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/documentation.md) | Tutorials, READMEs, API docs, e-learning | Converting technical docs to audio |
| [podcast.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/podcast.md) | Multi-speaker, interviews, episode structure | Podcast or dialogue production |
| [announcement.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/announcement.md) | IVR, notifications, system alerts, public address | Short-form announcements or telephony |
| [multilingual.md](${CLAUDE_PLUGIN_ROOT}/skills/speech-generation/references/multilingual.md) | Language support, pronunciation, localization | Non-English or multi-language content |

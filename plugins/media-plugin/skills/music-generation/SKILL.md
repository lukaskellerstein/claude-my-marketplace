---
name: music-generation
description: Generate music and instrumental audio using the media-mcp server's generate_music tool. Use when the user asks to create music, background tracks, sound effects, ambient audio, jingles, or instrumental compositions. Supports weighted text prompts for blending styles, BPM control, musical scale constraints, temperature for creativity, and duration settings.
---

# Music Generation

Use the `mcp__media-mcp__generate_music` tool to create instrumental music via Google Gemini Lyria RealTime.

## When to Use

- User asks to "create music", "generate a soundtrack", "make background music"
- User needs a jingle, intro music, ambient track, or sound design
- User wants music for a video, presentation, podcast, or app
- User describes a mood, genre, or musical style they want

## Tool Reference

### generate_music

**Key parameters:**

| Parameter | Type | Description |
|---|---|---|
| `prompts` | array (required) | Weighted text prompts describing the music (e.g., `[{"text": "epic orchestral", "weight": 1.0}]`) |
| `bpm` | number | Beats per minute (tempo) |
| `temperature` | number | Creativity level — lower = more predictable, higher = more experimental |
| `scale` | string | Musical scale constraint (e.g., `"C major"`, `"A minor"`) |
| `duration` | number | Length in seconds |

## Weighted Prompts

The prompt system uses weights to blend musical concepts. Higher weight = more influence.

### Single style
```json
[{"text": "calm ambient piano with soft reverb", "weight": 1.0}]
```

### Blended styles
```json
[
  {"text": "electronic synthwave", "weight": 0.7},
  {"text": "orchestral strings", "weight": 0.3}
]
```

### Genre + mood + instrumentation
```json
[
  {"text": "jazz", "weight": 0.5},
  {"text": "relaxed late-night mood", "weight": 0.3},
  {"text": "saxophone and upright bass", "weight": 0.4}
]
```

## Prompt Writing Guidelines

### Describe three dimensions

1. **Genre/style**: jazz, electronic, orchestral, lo-fi, rock, ambient, cinematic
2. **Mood/energy**: calm, energetic, dark, uplifting, melancholic, suspenseful, triumphant
3. **Instrumentation**: piano, guitar, synth, strings, drums, bass, brass, woodwinds

### Example prompts by use case

**Background music for a product video:**
```json
[
  {"text": "modern corporate background music", "weight": 0.6},
  {"text": "upbeat and professional", "weight": 0.3},
  {"text": "light percussion and clean electric guitar", "weight": 0.3}
]
```

**Podcast intro jingle:**
```json
[
  {"text": "short catchy podcast intro jingle", "weight": 0.7},
  {"text": "friendly and energetic", "weight": 0.4},
  {"text": "acoustic guitar and claps", "weight": 0.3}
]
```

**Ambient background for coding:**
```json
[
  {"text": "lo-fi ambient chill beats", "weight": 0.6},
  {"text": "soft rain and vinyl crackle texture", "weight": 0.3},
  {"text": "slow tempo relaxing", "weight": 0.3}
]
```

**Game soundtrack — boss battle:**
```json
[
  {"text": "epic orchestral battle music", "weight": 0.7},
  {"text": "intense fast-paced drums and brass", "weight": 0.5},
  {"text": "dark and dramatic", "weight": 0.3}
]
```

**Meditation/relaxation:**
```json
[
  {"text": "peaceful meditation music", "weight": 0.6},
  {"text": "singing bowls and soft pads", "weight": 0.4},
  {"text": "very slow, spacious, minimal", "weight": 0.3}
]
```

## BPM Guide

| BPM Range | Feel | Good for |
|---|---|---|
| 60-80 | Slow, calm, relaxed | Ambient, meditation, ballads |
| 80-100 | Moderate, walking pace | Lo-fi, chill, background |
| 100-120 | Medium, conversational | Pop, corporate, podcasts |
| 120-140 | Upbeat, energetic | Dance, workout, upbeat promos |
| 140-180 | Fast, intense | EDM, drum & bass, action |

## Scale Guide

| Scale | Character | Use for |
|---|---|---|
| C major | Bright, happy, neutral | Upbeat, corporate, jingles |
| A minor | Melancholic, emotional | Drama, introspective, cinematic |
| D major | Triumphant, warm | Celebrations, victories |
| E minor | Dark, mysterious | Suspense, tension, games |
| G major | Pastoral, gentle | Nature, relaxation |
| F major | Warm, peaceful | Lullabies, calm backgrounds |

## Temperature Guide

| Value | Effect |
|---|---|
| 0.1-0.3 | Very predictable, stays close to prompt description |
| 0.4-0.6 | Balanced — follows prompt but adds some variation |
| 0.7-0.9 | Creative — more experimental and surprising results |
| 1.0+ | Highly experimental — may diverge significantly from prompt |

## Output Handling — MEDIA_OUTPUT_DIR

**When `MEDIA_OUTPUT_DIR` is set** (recommended): The MCP server saves the generated audio to a file and returns only the file path. Always use just this path — do NOT request or embed the raw audio data. This is critical because all MCP request/response messages are stored in the conversation history, and large base64 payloads pollute the context window, degrading performance.

**When `MEDIA_OUTPUT_DIR` is not set**: The MCP server has no choice but to return the audio as base64 data in the response. This works but is suboptimal for conversation history size.

## Tips

- Start with a moderate temperature (0.5) and adjust based on results
- Use weighted prompts to blend genres rather than trying to describe everything in one text
- Specify BPM explicitly for rhythmic music — omit it for ambient/free-form
- Generated music is instrumental only — for vocals, combine with the speech generation skill
- For loopable background music, mention "seamless loop" in the prompt
- Generate multiple variations with different temperatures to find the best fit

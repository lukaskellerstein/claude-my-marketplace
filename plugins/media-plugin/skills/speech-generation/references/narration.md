# Narration Reference

Audiobooks, fiction, documentaries, storytelling, and long-form narrative content.

## Presets

| Use Case | stability | similarity_boost | style | speed | Voice Traits |
|----------|-----------|-------------------|-------|-------|-------------|
| **Fiction / Audiobook** | 0.25 | 0.80 | 0.50 | 0.90 | Expressive, dynamic range, emotionally responsive |
| **Documentary** | 0.55 | 0.80 | 0.20 | 0.90 | Authoritative, measured, gravitas. Think nature doc. |
| **Children's Story** | 0.30 | 0.75 | 0.45 | 0.85 | Warm, animated, playful. Slower for young listeners. |
| **Memoir / Personal** | 0.35 | 0.80 | 0.30 | 0.90 | Intimate, reflective, conversational warmth |
| **Horror / Thriller** | 0.20 | 0.80 | 0.55 | 0.85 | Low, tense, atmospheric. Maximum expressiveness. |

## Character Voice Differentiation

For fiction with multiple characters, use distinct voices for each speaker.

### Workflow

1. **Design voices** — For each character, define: voice_name/voice_id, preset adjustments, and a short description
2. **Create a voice map** — Document each character's voice settings before generating anything
3. **Generate per character** — Produce each character's lines as separate audio files
4. **Concatenate in order** — Stitch together with appropriate silence gaps

### Example Voice Map

| Character | Voice | stability | style | speed | Notes |
|-----------|-------|-----------|-------|-------|-------|
| Narrator | Rachel | 0.40 | 0.25 | 0.90 | Neutral, measured |
| Hero (Marcus) | Adam | 0.35 | 0.35 | 0.95 | Confident, warm |
| Villain (Dr. Voss) | custom clone | 0.20 | 0.55 | 0.85 | Low, menacing, deliberate |
| Child (Lily) | Bella | 0.30 | 0.40 | 1.00 | Light, curious, energetic |

### Concatenation

```bash
# Concatenate character lines with 0.3s silence gaps
ffmpeg -i narrator_01.mp3 -i marcus_01.mp3 -i narrator_02.mp3 -i voss_01.mp3 \
  -filter_complex \
  "[0:a]apad=pad_dur=0.3[a0]; \
   [1:a]apad=pad_dur=0.3[a1]; \
   [2:a]apad=pad_dur=0.3[a2]; \
   [3:a][a0][a1][a2]concat=n=4:v=0:a=1[out]" \
  -map "[out]" scene_01.mp3
```

## Long-Form Strategy

ElevenLabs works best with segments of **1000–2000 words**. Longer texts may produce quality degradation.

### Segmentation Rules

1. **Break at natural boundaries** — chapter ends, scene changes, section breaks
2. **Never break mid-sentence** — always end on a complete thought
3. **Overlap context** — include the last sentence of the previous segment at the start of the new one, then trim in post. This ensures natural continuation.
4. **Consistent settings** — use identical voice_id + all parameters across segments. See [voice-settings.md](voice-settings.md) "Consistency Across Segments".

### Chapter-to-Audio Workflow

1. Split text into segments (1000–2000 words each)
2. Generate each segment with locked parameters
3. Trim any overlap sentences
4. Crossfade-join segments:
```bash
ffmpeg -i chapter_seg1.mp3 -i chapter_seg2.mp3 \
  -filter_complex "acrossfade=d=0.5:c1=tri:c2=tri" chapter_complete.mp3
```

## Pacing and Dramatic Effect

### Pause Techniques

| Technique | How to Write It | Effect |
|-----------|----------------|--------|
| Beat pause | `...` | 0.3–0.5s pause. "She opened the door... and screamed." |
| Long pause | End paragraph + start new one | ~1s natural pause between thoughts |
| Dramatic reveal | `...` + new paragraph | Maximum tension. "The letter was from... \n\nher mother." |
| Breath / reset | `. ` (period + space) | Standard sentence-end pause |
| List cadence | Line breaks or semicolons | Rhythmic delivery for lists or sequences |

### Emotional Beats

Write the emotion into the text — the model responds to emotional content, not stage directions.

**Don't write:** `[sadly] I never saw him again.`
**Do write:** `I never saw him again. That thought still hurts, even now.`

**Don't write:** `[angry] Get out of my house!`
**Do write:** `Get out! Get out of my house! Now!`

## Post-Processing

### Add ambient background
```bash
# Layer ambient sound under narration at 15% volume
ffmpeg -i narration.mp3 -i ambient_rain.mp3 \
  -filter_complex "[1:a]volume=0.15[bg];[0:a][bg]amix=inputs=2:duration=first" \
  narration_with_ambience.mp3
```

### Add background music under narration
```bash
# Music at 20% volume, fade in/out
ffmpeg -i narration.mp3 -i background_music.mp3 \
  -filter_complex "[1:a]volume=0.2,afade=t=in:st=0:d=3,afade=t=out:st=55:d=5[bg];[0:a][bg]amix=inputs=2:duration=first" \
  narration_with_music.mp3
```

### Normalize loudness
```bash
# Normalize to broadcast standard (-16 LUFS)
ffmpeg -i narration.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 narration_normalized.mp3
```

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| Voice drifts across chapters | Parameters changed or voice_name resolved differently | Use voice_id, lock all params — see [voice-settings.md](voice-settings.md) |
| Characters sound too similar | Same voice with minor tweaks | Use completely different voice_names/IDs for each character |
| Long text sounds degraded | Segment too long (> 2000 words) | Break into 1000–2000 word segments |
| No emotional range | Stability too high | Lower stability to 0.20–0.35 for fiction |
| Awkward sentence breaks | Segmentation mid-thought | Always break at paragraph or chapter boundaries |

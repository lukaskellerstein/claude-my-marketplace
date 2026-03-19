# Podcast Reference

Podcast production, interviews, multi-speaker content, and conversational audio.

## Presets

| Use Case | stability | similarity_boost | style | speed | Voice Traits |
|----------|-----------|-------------------|-------|-------|-------------|
| **Conversational Host** | 0.40 | 0.75 | 0.25 | 1.00 | Warm, natural, engaging. The anchor voice. |
| **Interview Guest** | 0.35 | 0.75 | 0.20 | 0.95 | Slightly more varied, thoughtful. Not over-polished. |
| **Solo Monologue** | 0.45 | 0.80 | 0.20 | 0.95 | Focused, personal, storyteller energy. |
| **News/Commentary** | 0.60 | 0.80 | 0.15 | 1.00 | Clear, authoritative, measured. |
| **Casual Chat** | 0.35 | 0.70 | 0.30 | 1.05 | Loose, animated, friend-on-a-couch vibe. |

## Multi-Speaker Production

### Step-by-Step Workflow

1. **Write the full script** with clear speaker labels:
   ```
   HOST: Welcome back to Build Weekly. Today we're diving into microservices.
   GUEST: Thanks for having me. I've been running microservices in production for six years now.
   HOST: Let's start with the basics. When should a team NOT use microservices?
   GUEST: Honestly? Most of the time. If you're under fifty engineers, a monolith is probably better.
   ```

2. **Assign voices** — pick distinct voices for each speaker:
   | Speaker | voice_name | Preset Base |
   |---------|-----------|-------------|
   | HOST | Adam | Conversational Host |
   | GUEST | Rachel | Interview Guest |

3. **Generate each speaker's lines separately** — one call per speaker turn:
   - `HOST_01.mp3`: "Welcome back to Build Weekly..."
   - `GUEST_01.mp3`: "Thanks for having me..."
   - `HOST_02.mp3`: "Let's start with the basics..."
   - `GUEST_02.mp3`: "Honestly? Most of the time..."

4. **Concatenate with natural gaps**:
   ```bash
   # 0.4s gap between turns (natural conversation pause)
   ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.4 gap.mp3

   ffmpeg -i host_01.mp3 -i gap.mp3 -i guest_01.mp3 -i gap.mp3 \
     -i host_02.mp3 -i gap.mp3 -i guest_02.mp3 \
     -filter_complex "concat=n=7:v=0:a=1" conversation.mp3
   ```

5. **Add intro/outro music** (generate with `generate_music`):
   ```bash
   ffmpeg -i intro_music.wav -i conversation.mp3 -i outro_music.wav \
     -filter_complex \
     "[0:a]afade=t=out:st=8:d=2[intro]; \
      [2:a]afade=t=in:st=0:d=2[outro]; \
      [intro][1:a][outro]concat=n=3:v=0:a=1[out]" \
     -map "[out]" episode.mp3
   ```

## Voice Pairing Rules

Good multi-speaker audio needs **contrast**. Avoid pairing similar voices.

### Contrast Checklist

| Dimension | Goal |
|-----------|------|
| **Pitch** | Pair a lower-pitched voice with a higher-pitched voice |
| **Energy** | Pair a calm voice with an animated voice |
| **Pace** | Vary speed settings by 0.05–0.10 between speakers |
| **Warmth** | Mix a warm, friendly voice with a crisp, precise voice |

### Bad Pairings
- Two deep male voices with similar pacing
- Two high-energy voices at the same speed
- Same voice_name with only minor parameter tweaks

### Good Pairings
- Adam (deep, steady) + Bella (bright, energetic)
- Rachel (warm, measured) + a custom energetic male voice
- Deep documentary voice + light conversational voice

## Text Preparation for Dialogue

Podcast scripts should sound **spoken**, not **written**. Apply these rules:

### Contractions
| Written | Spoken |
|---------|--------|
| "I would not" | "I wouldn't" |
| "It is important" | "It's important" |
| "They are going to" | "They're gonna" (for casual) |
| "We have been" | "We've been" |

### Shorter Sentences
Podcast sentences are **10–15 words max**. People don't speak in paragraphs.

**Written style:** "The architecture we eventually settled on was a hybrid approach that combined the reliability of a monolith with the scalability benefits of microservices for our most demanding components."

**Podcast style:** "We went with a hybrid approach. Monolith for most things. Microservices where we needed scale."

### Filler and Rhythm
Add natural speech patterns sparingly:
- "So, ..." — transitional
- "Right." — acknowledgment
- "Look, ..." — emphasis
- "I mean, ..." — softening
- "Yeah, ..." — agreement

## Episode Structure Template

```
[COLD OPEN — 15-30s]
A compelling quote or hook from the episode.
"Microservices are a solution to an organizational problem, not a technical one."

[INTRO MUSIC — 10-15s]
Generated with generate_music. Fade out under host voice.

[HOST INTRO — 30-60s]
Welcome, episode context, guest introduction.

[MAIN CONVERSATION — varies]
Organized into 2-4 segments/topics.
Natural transitions between topics.

[WRAP-UP — 30-60s]
Key takeaways, where to find the guest.

[OUTRO — 15-30s]
Subscribe CTA, credits, outro music fade.
```

## Post-Production

### Normalize loudness across speakers
```bash
# Normalize to podcast standard (-16 LUFS)
ffmpeg -i episode.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 episode_normalized.mp3
```

### Add background music under conversation (very quiet)
```bash
ffmpeg -i conversation.mp3 -i bg_music.mp3 \
  -filter_complex "[1:a]volume=0.08[bg];[0:a][bg]amix=inputs=2:duration=first" \
  conversation_with_bg.mp3
```

### Crossfade between segments
```bash
ffmpeg -i segment1.mp3 -i segment2.mp3 \
  -filter_complex "acrossfade=d=1.0:c1=tri:c2=tri" combined.mp3
```

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| All speakers sound the same | Similar voices, same parameters | Use distinct voice_names and vary speed/style |
| Dialogue sounds stilted | Written-style script | Use contractions, short sentences, filler words |
| Awkward silence between turns | Gap too long or too short | Use 0.3–0.5s gaps for conversation, 0.8–1.0s for topic changes |
| Volume jumps between speakers | Different voices have different loudness | Normalize all clips to -16 LUFS before concatenation |
| Music drowns out speech | Background music too loud | Keep music at 5–10% volume (`volume=0.05` to `0.10`) |

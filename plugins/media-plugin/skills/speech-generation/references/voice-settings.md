# Voice Settings Reference

## Parameter Interaction Matrix

Parameters don't act in isolation — they combine to create the overall feel. Use this matrix to understand how they interact.

| Stability | Style | Speed | Result |
|-----------|-------|-------|--------|
| High (0.7+) | Low (0) | Normal (1.0) | Flat, robotic, consistent — IVR / system messages |
| High (0.7+) | Low (0) | Fast (1.1+) | Brisk, efficient — announcements, notifications |
| High (0.7+) | Medium (0.3) | Slow (0.85) | Authoritative, measured — corporate narration |
| Medium (0.4–0.6) | Low (0) | Normal (1.0) | Natural, neutral — documentation, tutorials |
| Medium (0.4–0.6) | Medium (0.3) | Normal (1.0) | Warm, engaging — product demos, explainers |
| Medium (0.4–0.6) | High (0.5+) | Normal (1.0) | Animated, enthusiastic — marketing, promos |
| Low (0.1–0.3) | Medium (0.3) | Slow (0.85–0.9) | Dramatic, expressive — fiction narration |
| Low (0.1–0.3) | High (0.5+) | Varied | Highly emotional, unpredictable — character voices |

**Key interaction rules:**
- High stability + high style cancel each other out — the model tries to be consistent AND expressive, producing muddy results. Pick one direction.
- Low stability + high speed produces rushed, chaotic output. If you want expressiveness, slow down.
- similarity_boost above 0.85 constrains the voice so much that style has diminished effect.

## Named Presets

Use these as starting points. Always reference the preset name in your generation calls for consistency.

| Preset Name | stability | similarity_boost | style | speed | Best For |
|-------------|-----------|-------------------|-------|-------|----------|
| **Professional Neutral** | 0.65 | 0.80 | 0.00 | 0.95 | Tutorials, documentation, corporate |
| **Warm Conversational** | 0.40 | 0.75 | 0.20 | 1.00 | Podcasts, explainers, product demos |
| **Dramatic Narrator** | 0.25 | 0.80 | 0.50 | 0.90 | Fiction, audiobooks, storytelling |
| **Energetic Presenter** | 0.40 | 0.75 | 0.40 | 1.05 | Marketing, promos, launches |
| **Robotic System** | 0.90 | 0.90 | 0.00 | 1.00 | IVR, system alerts, notifications |
| **Calm Educator** | 0.55 | 0.80 | 0.10 | 0.90 | E-learning, children's content |
| **News Anchor** | 0.70 | 0.85 | 0.15 | 1.00 | News reading, formal announcements |
| **Intimate Whisper** | 0.30 | 0.70 | 0.35 | 0.85 | ASMR, meditation, bedtime stories |

## Model Selection

| Model ID | Languages | Quality | Latency | When to Use |
|----------|-----------|---------|---------|-------------|
| `eleven_v3` | 70+ | Highest | Medium | **Default choice** — newest model, best quality, widest language support |
| `eleven_multilingual_v2` | 29 | High | Medium | Proven stability, good fallback if v3 produces artifacts |
| `eleven_flash_v2_5` | 32 | Good | Lowest | Real-time applications, interactive voice, streaming |
| `eleven_turbo_v2_5` | 32 | Good | Low | Balanced speed/quality for batch processing |
| `eleven_flash_v2` | 1 (EN) | Good | Lowest | English-only, ultra-low latency |
| `eleven_turbo_v2` | 1 (EN) | Good | Low | English-only, balanced |
| `eleven_monolingual_v1` | 1 (EN) | Basic | Low | Legacy — avoid unless reproducing old output |

**Decision tree:**
1. Need 70+ languages or highest quality? → `eleven_v3`
2. Need real-time / streaming? → `eleven_flash_v2_5`
3. English-only + fast? → `eleven_flash_v2`
4. Batch processing, moderate speed? → `eleven_turbo_v2_5`
5. Need proven multilingual stability? → `eleven_multilingual_v2`

## Output Format Selection

| Format | Sample Rate | Bitrate | File Size | Best For |
|--------|------------|---------|-----------|----------|
| `mp3_44100_128` | 44.1 kHz | 128 kbps | ~1 MB/min | **Default** — web, apps, general use |
| `mp3_44100_192` | 44.1 kHz | 192 kbps | ~1.5 MB/min | Higher quality playback (Creator tier+) |
| `pcm_16000` | 16 kHz | Raw | ~1.9 MB/min | Voice assistants, Dialogflow, STT pipelines |
| `pcm_44100` | 44.1 kHz | Raw | ~5.3 MB/min | Professional post-production (Pro tier+) |
| `opus_48000_128` | 48 kHz | 128 kbps | ~1 MB/min | WebRTC streaming, efficient compression |
| `ulaw_8000` | 8 kHz | Raw | ~0.5 MB/min | Twilio, telephony, IVR systems |

**Decision tree:**
1. Phone/IVR/Twilio? → `ulaw_8000`
2. Web streaming? → `opus_48000_128`
3. Post-production / editing? → `pcm_44100`
4. Voice assistant pipeline? → `pcm_16000`
5. Everything else → `mp3_44100_128`

## Speaker Boost

`use_speaker_boost` enhances similarity to the original voice. Rules:

- **Enable (default)** for: cloned voices, voices where identity matters, consistent multi-segment generation
- **Disable** for: heavily stylized output (high style values), creative voice design where you want more freedom, very short utterances (< 5 words) where boost can add artifacts
- **Interaction with similarity_boost**: Speaker boost + similarity_boost > 0.85 can over-constrain the voice, producing flat output. If using speaker boost, keep similarity_boost at 0.75–0.80.

## Voice Tiers & API Access

Not all voices are available on every plan:

| Tier | Examples | API Access |
|------|----------|------------|
| **Premade voices** | Roger, River, Liam, Rachel | Free tier — always available via API |
| **Library voices** | Voices added from ElevenLabs Voice Library | **Paid plan required** for API access |
| **Cloned / professional voices** | Custom voice clones | **Paid plan required** |

If you get "voice not available" errors, check whether the voice requires a paid plan. Use a premade voice (e.g., Roger — `CwhRBWXzGAHq8TQ4Fs17`) as a safe fallback.

### Adding a library voice

Library voices must be manually added by the user before they can be used via API:
1. Go to **ElevenLabs > Voices > Voice Library**
2. Search for the voice by name
3. Click **Add to my voices**
4. Verify with a test TTS call before generating all segments

## Rate Limits & Voice Verification

When sending many parallel TTS requests, the ElevenLabs API may **silently fall back to a different voice** without returning an error. This produces inconsistent output across segments.

**Detection:** Always check the `Voice used:` field in the API response and verify it matches the requested voice.

**Fix:** If a voice mismatch is detected, retry the request sequentially (one at a time) rather than in parallel.

## Consistency Across Segments

When generating multiple segments with the same voice (e.g., chapters, scenes, segments):

1. **Lock all parameters** — use identical stability, similarity_boost, style, speed, and model_id
2. **Use voice_id** (not voice_name) for deterministic voice selection
3. **Enable speaker boost** for tighter voice matching
4. **Set similarity_boost to 0.80–0.85** — high enough for consistency, not so high it flattens expression
5. **Generate a test segment first** and verify the voice before committing to a full batch
6. **Verify voice in response** matches the requested voice after each call (catches silent voice fallback under rate limits — see Rate Limits section above)

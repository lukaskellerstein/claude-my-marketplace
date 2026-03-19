# Voiceover Reference

Video voiceovers, product demos, explainer videos, and marketing content.

## Presets

| Use Case | stability | similarity_boost | style | speed | Voice Traits |
|----------|-----------|-------------------|-------|-------|-------------|
| **Product Demo** | 0.50 | 0.80 | 0.25 | 0.95 | Clear, confident, measured. Not salesy — let the product speak. |
| **Explainer Video** | 0.45 | 0.75 | 0.20 | 0.95 | Warm, approachable, teacher-like. Slightly slower for comprehension. |
| **Marketing / Promo** | 0.40 | 0.75 | 0.40 | 1.05 | Energetic, compelling, upbeat. Higher style for enthusiasm. |
| **Corporate Training** | 0.60 | 0.80 | 0.10 | 0.90 | Professional, neutral, patient. Higher stability for consistency. |
| **App Walkthrough** | 0.50 | 0.80 | 0.15 | 0.95 | Friendly, clear, helpful. Like a support agent guiding you. |

## Golden Rules for Video Voiceover

1. **Never use atempo (audio speed change).** It sounds unnatural immediately. Always rewrite the text to fit the time slot instead of stretching or compressing the audio.

2. **Section intro cards = title only.** When the video shows a title card with title + subtitle, the voiceover should say ONLY the title (e.g., "Civilian Intelligence."). The subtitle is already visible — reading it aloud is redundant and often overruns the slot.

3. **Natural pace over exact timing.** It's better to have speech end early (with natural silence) than to cram too many words into a slot. Silence between sections gives the viewer time to absorb visuals.

4. **Combine related sub-sections into flowing sentences.** Don't force one sentence per timestamp — it creates choppy, unnatural narration. Group 2–3 related visual moments into a single thought.

5. **Don't narrate what the viewer can see.** The voiceover should ADD context, not describe mouse clicks. "Click the button" is bad. "Every aircraft tracked in real time" is good.

6. **Avoid closed lists when the actual set is open.** When listing types, categories, or capabilities, use "and more" or similar phrasing to signal the list is not exhaustive. E.g., "artillery, drones, radar, infantry, and more" — not "artillery, armor, radar, or infantry."

7. **Watch for breath/artifact noise.** ElevenLabs sometimes adds audible breaths at the end of segments. If detected, trim trailing silence/noise using the reverse-silenceremove technique (see Timed Voiceover Pipeline, Step 4).

## Text Preparation

### Sentence Length
Keep sentences to **15–20 words max**. Long sentences produce unnatural phrasing and inconsistent pacing.

**Bad:**
> "Our new dashboard provides real-time analytics capabilities that allow you to track performance metrics at a glance while also offering customizable widgets for your team's specific needs."

**Good:**
> "Our new dashboard gives you real-time analytics. Track performance at a glance. Customize widgets for your team's specific needs."

### Emphasis and Pauses
- Use `...` for a beat pause (0.3–0.5s): "And the results... speak for themselves."
- Use `,` for a natural breath pause
- Use `.` for a full stop pause (~0.5s)
- Use a new paragraph for a scene/topic change (generates a longer pause)
- Write emphasis words in ALL CAPS sparingly: "This is EXACTLY what we needed."

### Script Structure for Video
```
[Opening hook — 1-2 sentences, grab attention]
Meet the new way to manage your projects.

[Problem statement — 2-3 sentences]
Juggling spreadsheets, emails, and chat messages wastes hours every week.
Your team deserves better.

[Solution — 3-5 sentences, match to visual transitions]
Introducing ProjectFlow.
One dashboard for everything.
Assign tasks in seconds. Track progress in real time.
No more status meetings... just results.

[Call to action — 1 sentence]
Start your free trial at projectflow.com.
```

## Timing and Duration

### Words per Minute (full-length scripts)

| Speed | Words per Minute | 30s Script | 60s Script | 90s Script |
|-------|-----------------|------------|------------|------------|
| 0.85 | ~130 wpm | ~65 words | ~130 words | ~195 words |
| 0.90 | ~140 wpm | ~70 words | ~140 words | ~210 words |
| 0.95 | ~145 wpm | ~73 words | ~145 words | ~218 words |
| 1.00 | ~150 wpm | ~75 words | ~150 words | ~225 words |
| 1.05 | ~160 wpm | ~80 words | ~160 words | ~240 words |
| 1.10 | ~170 wpm | ~85 words | ~170 words | ~255 words |

**Note:** These are approximations. Pauses from punctuation, ellipses, and paragraph breaks add time. For precise timing, generate a test segment and measure.

### Word Count per Time Slot (timed video segments)

**IMPORTANT:** Word counts depend heavily on the voice. Always generate a test segment first to measure the voice's actual pace before writing the full script.

#### How to measure voice pace
1. Generate a test segment with ~12–16 words of representative text
2. Check duration with `ffprobe`
3. Calculate: `words / duration = words/sec`
4. Use this rate for all word count calculations

#### Standard narrator (~2.4 words/sec) — e.g., Dexter, Nathan

Target **80% of the slot** with speech, leave 20% as breathing room:

| Slot Duration | Target Words | Max Words |
|---------------|-------------|-----------|
| 2s | 4–5 | 6 |
| 3s | 6–7 | 8 |
| 4s | 8–9 | 10 |
| 5s | 10–12 | 13 |
| 7s | 14–16 | 18 |
| 10s | 20–23 | 25 |
| 15s | 30–35 | 38 |
| 30s+ | Use ~2.4 w/s | Leave pauses |

#### Slow/cinematic voice (~1.5 words/sec) — e.g., Cinematic Trailer

Deep, dramatic voices speak ~40% slower. Cut text accordingly:

| Slot Duration | Target Words | Max Words |
|---------------|-------------|-----------|
| 3s | 3–4 | 5 |
| 4s | 4–5 | 6 |
| 5s | 6–7 | 8 |
| 7s | 8–10 | 11 |
| 10s | 12–14 | 15 |
| 15s | 18–20 | 23 |
| 30s+ | Use ~1.5 w/s | Leave pauses |

### Text-Fitting Tips

- **If speech is too long:** cut adjectives, merge clauses, use shorter synonyms
- **If speech is too short:** add a pause-worthy phrase, extend with "and" clauses
- **For long silent sections** (replays, demos): put speech at the START, let silence carry the visuals
- **Em dashes (—)** create natural micro-pauses that help fill time without adding words
- **Avoid location-specific references** (e.g., "Los Angeles") unless essential — they sound jarring if the video changes

## Mixing with Video

### Replace video audio entirely
```bash
ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4
```

### Mix voiceover with existing audio (voiceover louder)
```bash
ffmpeg -i video.mp4 -i voiceover.mp3 -filter_complex "[0:a]volume=0.3[bg];[1:a]volume=1.0[vo];[bg][vo]amix=inputs=2:duration=longest" -c:v copy output.mp4
```

### Add voiceover with fade-in/fade-out
```bash
ffmpeg -i video.mp4 -i voiceover.mp3 -filter_complex "[1:a]afade=t=in:st=0:d=0.5,afade=t=out:st=58:d=2[vo];[0:a][vo]amix=inputs=2:duration=longest" -c:v copy output.mp4
```

### Delay voiceover start (e.g., start at 3 seconds)
```bash
ffmpeg -i video.mp4 -i voiceover.mp3 -filter_complex "[1:a]adelay=3000|3000[vo];[0:a][vo]amix=inputs=2:duration=longest" -c:v copy output.mp4
```

## Timed Voiceover Pipeline

Complete step-by-step workflow for generating voiceover audio synced to video timestamps.

### Step 1: Write the script
1. Read the voiceover notes (timestamps + what's on screen)
2. Group related timestamps into natural segments
3. **Generate a test segment** to measure the voice's actual speaking pace (see "How to measure voice pace" above)
4. Write text for each segment using the measured pace and word count targets
5. Verify no segment's text exceeds its slot at the measured words/sec rate
6. Save script using the voiceover script template below

### Step 2: Generate audio segments
1. Generate each segment as a **separate TTS call** (one per time slot)
2. Use consistent voice settings across ALL segments — lock `model_id`, `stability`, `similarity_boost`, `style`, `speed`, `output_format`, and `language`
3. For silence segments (like logo intros), generate with ffmpeg:
   ```bash
   ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t <duration> -ab 128k <output>
   ```
4. **Verify voice consistency**: check the `Voice used:` field in every API response — ElevenLabs may silently fall back to a different voice under load (see [voice-settings.md](voice-settings.md#rate-limits--voice-verification))

### Step 3: Check durations
1. Run `ffprobe` on every segment to get actual speech duration
2. Compare against target slot duration
3. Flag any segment where speech exceeds slot by >0.5s — these will get trimmed and lose words
4. For flagged segments: **rewrite the text shorter** and regenerate (never use atempo)

### Step 4: Trim silence, pad, and assemble

#### Trim leading silence (CRITICAL)
ElevenLabs often adds **0.5–3.5 seconds of silence** at the start of generated audio. Without trimming, speech starts late in each segment:
```bash
ffmpeg -y -i <input> -af "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-30dB" -ar 44100 -ab 128k <trimmed>
```

#### Trim trailing breath/noise (when needed)
Some segments end with an audible breath artifact. Use the reverse-silenceremove technique to trim both ends:
```bash
ffmpeg -y -i <input> \
  -af "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-30dB,areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-30dB,areverse" \
  -ar 44100 -ab 128k <trimmed>
```

#### Pad and concatenate
1. Pad each trimmed segment with silence to its exact target duration:
   ```bash
   ffmpeg -y -i <trimmed> -af "apad=whole_dur=<target>" -t <target> -ar 44100 -ab 128k <output>
   ```
2. Create a concat list file with `file 'seg_XX.mp3'` entries
3. Concatenate all segments to **WAV** (primary output):
   ```bash
   ffmpeg -y -f concat -safe 0 -i concat_list.txt -ar 44100 -ac 1 -c:a pcm_s16le output.wav
   ```
4. Also create a clean MP3 re-encode (backup):
   ```bash
   ffmpeg -y -f concat -safe 0 -i concat_list.txt -ar 44100 -ab 128k -ac 1 -c:a libmp3lame output_clean.mp3
   ```

### Step 5: Final output
- **Always output WAV** as the primary file — video editors (especially DaVinci Resolve) handle WAV flawlessly
- Also output a clean single-pass MP3 as backup
- Never deliver a raw concatenated MP3 — it can cause playback issues in NLEs

## Voiceover Script Template

Use this timestamped table format for timed voiceover scripts:

```markdown
# [Project] — Voiceover Script

**Total duration:** [total] seconds
**Voice:** [voice name] (ID: [voice_id])
**Speed:** 0.9 | **Stability:** 0.6 | **Similarity:** 0.8 | **Style:** 0.15

## Section 1: [Section Name]

| # | Timestamp | Duration | Voiceover Text |
|---|-----------|----------|----------------|
| 1 | 00:00–00:04 | 4s | *[silence — logo intro]* |
| 2 | 00:04–00:08 | 4s | [Title only for section intro cards.] |
| 3 | 00:08–00:15 | 7s | [Voiceover text — target 14–16 words for 7s slot.] |

## Voice Recommendations

### Top pick: [Voice Name]
- **ID:** `[voice_id]`
- **Why:** [Why this voice fits the project]
- **Accent:** [Accent]
- **Category:** [Professional / Premade / Cloned]

### Safe fallback (no paid plan needed): [Premade Voice]
- **ID:** `[voice_id]`
- **Why:** Premade voice, works on any tier.
```

## Adjusting Timing After Assembly

When a segment needs to shift (e.g., a section should start 1 second later):
1. **Adjust the adjacent segments** — add time to the preceding segment, subtract from the current one
2. Re-pad only the affected segments (no need to regenerate TTS)
3. Rebuild the final file from the concat list
4. **Update the voiceover script** to reflect the new timestamps

When the video extends (e.g., new closing segment):
1. Add new segment(s) to the concat list
2. The total audio duration will change — update the script header accordingly

## Voice Selection Guide

The voice should match the **tone, audience, and content type** of the video.

### By content type

| Content Type | Ideal Voice Traits | Search Terms | Pace |
|-------------|-------------------|-------------|------|
| **Product demo / SaaS** | Confident, clear, modern, enthusiastic | "product demo", "explainer", "engaging presenter" | ~2.4 w/s |
| **Military / intelligence / defense** | Authoritative, serious, measured | "authoritative narrator", "documentary", "military" | ~2.0–2.4 w/s |
| **Corporate / training** | Professional, calm, trustworthy | "corporate", "professional narrator", "e-learning" | ~2.3 w/s |
| **Marketing / promo** | Energetic, dynamic, punchy | "commercial", "promo", "advertising" | ~2.5 w/s |
| **Documentary / storytelling** | Warm, deep, measured gravitas | "documentary narrator", "storytelling" | ~1.8–2.2 w/s |
| **Cinematic / trailer** | Epic, deep, dramatic | "cinematic trailer", "epic narrator" | ~1.5 w/s |

### Voice characteristics

| Characteristic | When to Use | When to Avoid |
|---------------|------------|---------------|
| **Enthusiastic/energetic** | Product demos, promos, launches | Somber content, military briefings |
| **Calm/professional** | Training, corporate, explainers | Content that needs excitement or urgency |
| **Deep/cinematic** | Trailers, intros, short dramatic segments | Long-form narration (pace too slow) |
| **Laid-back/casual** | Lifestyle, social media, conversational | Formal, technical, or defense content |
| **British accent** | International appeal, sophistication | Region-specific US audience |
| **American accent** | Broad appeal, tech/startup feel | When British gravitas is preferred |

### Voice selection pitfalls

- **Too cinematic for product demos** — deep trailer voices sound epic but speak at ~1.5 w/s, forcing heavy text cuts. They also feel out of place for feature walkthroughs.
- **Too calm/flat for demos** — voices marketed as "professional" or "calm" can lack the enthusiasm needed to keep viewers engaged through a 3–4 minute demo.
- **Too casual for serious content** — laid-back voices feel wrong for military, intelligence, or enterprise products.

### Key lesson

**Always test the voice BEFORE writing the full script.** Different voices have very different speaking paces (1.5–2.5 w/s), and the entire script must be written to match. Changing the voice after writing means rewriting most of the text.

## Video Editor Compatibility

**DaVinci Resolve:** Concatenated MP3 files can stop playing partway through the timeline, even though they play fine in VLC. DaVinci misreads frame boundaries from ffmpeg's concat demuxer. Always output WAV (pcm_s16le) or re-encode as a single-pass MP3 through libmp3lame.

**General NLE rule:** Prefer WAV for import into any video editor. WAV is universally supported and avoids codec-related playback issues.

## Common Pitfalls

| Pitfall | Why It Happens | Fix |
|---------|---------------|-----|
| Voice sounds different across segments | Parameters or model changed between calls | Lock all parameters, use voice_id not voice_name — see [voice-settings.md](voice-settings.md) |
| Rushed or breathless delivery | Sentences too long, no pause points | Break into 15–20 word sentences, add commas and periods |
| Flat/monotone for marketing content | Stability too high or style too low | Use Marketing preset: stability 0.40, style 0.40 |
| Unnatural emphasis | ALL CAPS overuse or awkward phrasing | Write as you'd naturally speak. Read your script aloud first. |
| Audio too short/long for video | No timing estimation | Use the WPM table above. Generate a test segment. |
| Pops and clicks at segment boundaries | Raw concatenation without crossfade | Use ffmpeg crossfade: `-filter_complex "acrossfade=d=0.1"` |
| Atempo distortion | Audio speed changed to fit time slot | Never use atempo — rewrite text to fit instead |
| Concat MP3 stops in DaVinci Resolve | Raw concat MP3 has broken frame boundaries | Output WAV, or re-encode as single-pass MP3 |
| Audio overruns time slot | Too many words for the slot duration | Check with ffprobe, rewrite shorter, regenerate |
| Leading silence in TTS output | ElevenLabs adds 0.5–3.5s silence at start | Trim with `silenceremove` before padding (see Pipeline Step 4) |
| Breath artifacts at segment end | ElevenLabs adds audible breaths | Use reverse-silenceremove technique (see Pipeline Step 4) |
| Closed lists sound limiting | "A, B, or C" implies nothing else exists | Use open phrasing: "A, B, C, and more" |
| Wrong voice for content pace | Cinematic voice at 1.5 w/s forces heavy text cuts | Test voice pace before writing script (see Voice Selection Guide) |

## Delivery Checklist

- [ ] All segments fit within their time slots (no trimming >0.5s)
- [ ] Leading silence trimmed from all TTS segments
- [ ] No audible breath artifacts at segment boundaries
- [ ] Section intros say title only (no subtitles read aloud)
- [ ] Lists use open phrasing ("and more") not closed ("or")
- [ ] Voice is consistent across all segments (check API responses)
- [ ] Final file is WAV format (for video editor compatibility)
- [ ] Clean MP3 backup also generated
- [ ] Total duration matches video length
- [ ] No atempo/speed changes applied to any audio
- [ ] Voiceover script matches the actual generated audio (text, timestamps, voice)

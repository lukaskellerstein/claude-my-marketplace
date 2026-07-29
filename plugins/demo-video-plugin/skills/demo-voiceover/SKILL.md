---
name: demo-voiceover
description: Generates demo narration with the ElevenLabs MCP server — one audio file per storyboard section, measured so the editor can cut picture to voice. Covers voice and model selection for product demos, fitting a line to a target duration, pronunciation of product names, optional word-level caption alignment, and music beds. Use at the voiceover stage of a demo video, when regenerating narration, or when changing the narrator.
---

# Demo Voiceover

Narration is generated **before** the recorded take, because its measured length is the
authoritative length of each section. The capture stage then fills that budget with dwell
time, and the editor cuts picture to voice — the way demos are actually made.

## Before generating anything

1. **The storyboard is approved** (GATE 1). Regenerating narration after a rewrite is wasted
   credits.
2. **Check the budget.** `check_subscription` reports remaining characters; the storyboard
   validator prints the estimated character count on every write. Compare them, and tell the
   user before spending if it is close.
3. **Pick the voice once** and record it in `meta.voice` so every section matches. A voice
   change mid-demo is instantly audible.

## Voice selection

Use `search_voices` (your library) or `search_voice_library` (public). For product demos:

| Want | Look for | Avoid |
|---|---|---|
| Credible technical narrator | Calm, mid-range, minimal vocal fry, clear consonants | Anything described as "energetic", "hype", "trailer" |
| Enterprise / finance audience | Measured, slightly formal, unhurried | Youthful, casual, upspeak |
| Developer audience | Conversational, dry, unperformed | Announcer, radio-ad cadence |
| Internal / colleagues | Plain and neutral | Marketing polish of any kind |

Two failure modes to avoid: a voice that performs enthusiasm (the audience discounts
everything it says), and a voice with a distinctive accent that mismatches the audience
without a reason.

Details and model trade-offs:
[voice-selection.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-voiceover/references/voice-selection.md).

## Generating

One file per section, named exactly `<section-id>.mp3` into `demo/audio/`:

```
mcp__demo-elevenlabs__text_to_speech
  text:              <section.voiceover verbatim>
  voice_id:          <meta.voice.voiceId>
  model_id:          eleven_multilingual_v2
  speed:             <meta.voice.speed, default 1.0>
  stability:         0.5
  similarity_boost:  0.75
  output_directory:  demo/audio
```

The file name is the join key for the whole pipeline. If the server appends a suffix, rename
it to `<section-id>.mp3` — the reconciler matches by prefix, but exact names keep the review
readable.

**Generate one section first and listen to it** before doing the rest, especially if the demo
contains a product name or acronym. Fixing pronunciation after ten files is ten regenerations.

## Measurement is automatic

The `probe-audio` hook ffprobes each new file, writes `demo/audio/<id>.json`, and compares it
to `targetSeconds`. Read its report. When it warns that a line is more than 20% off budget,
pick one:

- **Rewrite the line** to the suggested word count (usually correct — the picture was planned
  for that duration).
- **Change `targetSeconds`** if the content genuinely needs the time. The storyboard validator
  will then check the total budget again.
- **Adjust `speed`** (0.9–1.1). Beyond that range it is audible as fast or dragging. Setting
  it per-section makes the demo sound inconsistent; prefer rewriting.

Do **not** let a mismatch through to the editor and hope the reconciler absorbs it. It can
absorb ±15%, and every second it absorbs is slightly wrong motion.

## Pronunciation

The most common defect in an otherwise good demo.

- Product names, company names, and acronyms: listen to the first take. If wrong, spell it
  phonetically in the `text` you send ("Kubernetes" → "koo-ber-net-eez") while keeping the
  correct spelling in the storyboard and in captions.
- Version numbers: "v2.1" is safer written as "version two point one".
- Units and currency: "€1.2M" is safer as "one point two million euros".
- Note every phonetic override in `demo/brief.md` so a regeneration months later matches.

## Captions

`meta.captions` controls it: `section` (default), `word`, or `none`.

- **`section`** — the reconciler splits each line into phrase chunks distributed across the
  measured audio. Accurate enough to read, needs nothing extra, and is the right default.
- **`word`** — requires real alignment data at `demo/audio/<id>.align.json`. ElevenLabs' MCP
  server exposes no alignment tool, so this comes from the forced-alignment REST endpoint —
  see [caption-alignment.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-voiceover/references/caption-alignment.md).
  Without the file the reconciler falls back to phrase captions and warns.
- **`none`** — only when the video will always be watched with sound, which is rarely true.

Captions are on by default because most demos are first watched muted.

## Music

Optional, and easy to overdo. If the user wants a bed:

```
mcp__demo-elevenlabs__compose_music
  prompt: "understated ambient bed, no melody, steady, unobtrusive, corporate-neutral"
  music_length_ms: <total demo length + 3000>
  output_directory: demo/audio/music
```

Then set `meta.music.src` and re-reconcile. Defaults are −22 dB, ducking to −30 dB under
narration, with automatic 0.35s ramps at the edges of every narration range.

Rules: no melody or rhythm that competes with speech, no build-ups that imply a climax the
demo does not have, and nothing that changes character mid-video. If in doubt, ship without
music — a clear voice on silence sounds more credible than a voice over a track.

## Regenerating one section

After editing the line in `storyboard.json`, call `text_to_speech` again for just that
section (same voice, same parameters, same `<id>.mp3` name), then:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/reconcile.mjs --project .   # always, after any audio change
```

Never re-render without re-reconciling: the timeline holds the *old* measured duration, and
the result is a section whose narration is cut off or trailed by silence.

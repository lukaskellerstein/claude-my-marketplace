# Word-level caption alignment

The ElevenLabs MCP server has no alignment or timestamp tool. Word-level captions therefore
come from the **forced-alignment REST endpoint**, called directly with the same API key.

## Turnkey

```bash
bash scripts/align-captions.sh --project .              # every section with narration
bash scripts/align-captions.sh --project . 03-search    # one section
```

Then set `meta.captions: "word"` and re-run `reconcile.mjs`. Without the alignment files the
reconciler falls back to phrase captions and warns.

## What it does

```
POST https://api.elevenlabs.io/v1/forced-alignment
  header: xi-api-key: $ELEVENLABS_API_KEY
  form:   file=@demo/audio/03-search.mp3
          text=<the section's voiceover, verbatim>
```

Response:

```json
{
  "characters": [{ "text": "S", "start": 0.12, "end": 0.19 }],
  "words":      [{ "text": "Search", "start": 0.12, "end": 0.48, "loss": 0.02 }],
  "loss": 0.03
}
```

The script keeps `words[]` (text/start/end) at `demo/audio/<id>.align.json`. `reconcile.mjs`
groups them four at a time into caption chunks and converts the seconds to section-relative
frames.

## Requirements

- The `text` must be **the same text that was spoken**. Alignment against a rewritten line
  produces plausible-looking but wrong timings. Re-align after any narration change.
- Re-align after regenerating audio — a new take has different timings even with identical
  text.
- Audio and text must be the same section. Mismatches usually show up as a large `loss`.

## Reading `loss`

`loss` is the alignment confidence, per word and overall. A high overall value usually means
the text does not match the audio — most often a phonetic override was sent to
`text_to_speech` but the original spelling was sent to alignment. Send the **spoken** text to
both.

## Is it worth it?

Usually not. Phrase-level captions (the default) are derived from the measured audio duration
and distributed by word count. They read well, cost nothing, and stay correct automatically.

Word-level is worth it when:

- The demo is intended for social feeds where per-word highlighting is the convention.
- The narration is dense with terms the viewer needs to catch exactly.
- Accessibility requirements call for tighter synchronisation.

It is not worth it when the demo is embedded in docs or a landing page, where a stable
phrase-level caption box is calmer to read and does not draw the eye away from the UI.

## Failure handling

| Symptom | Cause |
|---|---|
| HTTP 401 | `ELEVENLABS_API_KEY` missing or wrong |
| HTTP 422 | Text and audio do not correspond, or the text is empty |
| `no words[] in response` | API shape changed — check the current API reference before adapting the script |
| Captions drift late in a section | Alignment ran against a previous take of the audio; re-align |

If alignment cannot be produced, leave `meta.captions` as `section`. Falling back is not a
degradation worth blocking a render over.

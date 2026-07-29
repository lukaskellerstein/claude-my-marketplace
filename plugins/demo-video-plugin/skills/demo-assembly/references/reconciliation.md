# Reconciliation rules

Implemented in `scripts/reconcile.mjs`. This is the edit decision list: it converts intent
(storyboard) plus reality (measured media) into frame-exact instructions.

## Constants

| Name | Value | Why |
|---|---|---|
| `LEAD_IN` | 0.25s | Narration starts slightly after the cut, so a transition never lands on a word. |
| `TAIL` | 0.6s | Quiet after the line, so the next cut does not clip the last syllable. |
| `MIN_RATE` | 0.85 | Slower than this reads as lag, not slow motion. |
| `MAX_RATE` | 1.15 | Faster than this reads as sped-up footage. |
| `WARP_LIMIT` | 0.15 | Hard ceiling on `|1 - playbackRate|`; the timeline validator enforces it. |
| `DEFAULT_TRANSITION` | 0.4s | Crossfade length between related sections. |

## Section length

```
audio-led (default):   needed = LEAD_IN + narrationDuration + TAIL
video-led:             needed = clipDuration        (extended if narration overruns)
no narration:          needed = targetSeconds
```

Measured durations come from the hook-written sidecars (`demo/capture/<id>.json`,
`demo/audio/<id>.json`), falling back to `ffprobe`. Planned values are never used for timing.

## Fitting the clip

```
ratio = clipDuration / needed

ratio > 1  (clip too long)
  ratio <= 1.15   -> playbackRate = ratio                      # play slightly fast
  else            -> playbackRate = 1.15
                     trimAfter    = frames(needed * 1.15)      # cut the dead tail
                     warn how much was trimmed

ratio < 1  (clip too short)
  ratio >= 0.85   -> playbackRate = ratio                      # play slightly slow
  else            -> playbackRate = 0.85
                     hold         = needed - clipDuration/0.85  # freeze the last frame
                     warn how long the hold is
```

Why this order: a sub-15% rate change is invisible on screen-recording motion, so it absorbs
small mismatches for free. Beyond that, **trimming a tail is invisible** (the tail is usually
dead time after the last action) while **stretching is not**, so overage is trimmed and
shortfall is held on a frozen frame with the camera still moving.

The hold is a `<Freeze>` inside the section, not a slowed clip: a 0.5× video looks broken, a
still frame under a slow zoom looks deliberate.

## Frames, not seconds

`trimBefore` and `trimAfter` are Remotion `OffthreadVideo` props measured in **frames**. This
is only safe because the capture hook transcodes to constant frame rate at the composition's
fps, so source frames map 1:1 to timeline frames. Feeding a raw 25fps VP8 WebM breaks
this, which is why raw WebM is rejected.

## Transitions and overlap

```
overlap    = (first section || kind === 'cut') ? 0 : frames(transitionIn.seconds)
startFrame = max(0, previousEnd - overlap)
```

Both sections are mounted during the overlap, and the incoming one fades in — which is why
`startFrame` can be less than the previous section's end and the timeline validator treats a
*gap* as an error but an overlap as normal.

A **surface change forces a hard cut** unless the storyboard set `transitionIn.kind`
explicitly. Web → Electron, app → code, or app → titlecard is a context change; dissolving
between them reads as a glitch.

Narration is delayed by `overlap + LEAD_IN`, so the voice starts after the transition
completes rather than under it.

## Captions

- `section` mode: split narration on sentence boundaries, then into ≤8-word chunks, and
  distribute across the measured audio duration proportionally to word count.
- `word` mode: read `demo/audio/<id>.align.json`, group four words per chunk, convert seconds
  to section-relative frames. Falls back to `section` with a warning if the file is absent.

All caption frames are relative to the section, because they render inside the section's
Sequence.

## Music ducking

`duckRanges` are the measured narration spans in absolute frames. The renderer applies
`gainDb` outside them, `duckDb` inside, with a 0.35s linear ramp on each side computed per
frame. No sidechain compression, no manual keyframes.

## Total duration

`durationInFrames` is the last section's end. The validator errors if the composition length
disagrees — too long ends on black, too short truncates the final section.

## When to change these rules

Editing `reconcile.mjs` is legitimate for a project with different needs (a faster house
style, tighter or looser lead-in, a different warp tolerance). Two cautions:

- Raising `WARP_LIMIT` hides capture problems rather than solving them. If several sections
  need more than 15%, the capture budgets were wrong — re-capture against the measured
  narration instead.
- Any change here changes every section at once. Re-render a draft and watch it, don't reason
  about it.

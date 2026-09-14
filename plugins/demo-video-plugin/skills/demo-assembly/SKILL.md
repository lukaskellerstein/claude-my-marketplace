---
name: demo-assembly
description: Assembles measured clips and narration into a finished demo video — reconciles real durations into a timeline, then renders it with Remotion or exports it as a Final Cut Pro project (FCPXML) for finishing with FCP titles and lower thirds. Covers the timeline contract, the bundled timeline-driven Remotion project, how to extend or replace it for custom compositions, transitions, camera moves, captions, music ducking, draft/final render presets, and the FCPXML export. Use at the reconcile, render, or editing stage of a demo video, when changing how the finished video looks, or when the user wants to edit or finish a demo in Final Cut Pro.
---

# Demo Assembly

Takes measured media and produces the cut. Two commands do the work; your job is to
understand what they decided and whether it was the right call.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/reconcile.mjs --project .    # -> demo/timeline.json
bash ${CLAUDE_PLUGIN_ROOT}/scripts/render.sh --draft            # -> demo/out/demo-draft.mp4
bash ${CLAUDE_PLUGIN_ROOT}/scripts/render.sh --final            # -> demo/out/demo.mp4
```

## Two finishes from one timeline

| Finish | Command | Ends with |
|---|---|---|
| Remotion (default) | `render.sh --final` | `demo/out/demo.mp4`, no person needed |
| Final Cut Pro | `node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline-to-fcpxml.mjs --project .` | `demo/out/demo.fcpxml`, finished and shared by a person in FCP |

Both read the same reconciled timeline, so the cut, the narration timing and the ducking are
identical; only graphics and hand polish differ. Offer the FCP finish when the user cares
about designed graphics — MotionVFX elements, FCP's title templates — or wants to fine-tune
by hand. Say plainly that its last step is theirs. Choosing the templates is the
`demo-graphics` skill; mapping, what does not carry over, and the import checklist:
[final-cut-pro.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-assembly/references/final-cut-pro.md).

## Do not hand-write the timeline

`demo/timeline.json` is generated, validated on write, and overwritten by the next reconcile.
To change the cut, change the input:

| Want to change | Change this |
|---|---|
| Section length | The narration text, or `targetSeconds` |
| What is on screen | Re-capture the clip |
| A transition, camera move, or label | `storyboard.json` (`transitionIn`, `camera`, `onScreenText`) |
| FCP graphics: templates, overlays, effects | `storyboard.json` (`meta.fcp`, `sections[].fcp`) — `demo-graphics` |
| Timing *rules* | `scripts/reconcile.mjs` |
| How anything *looks* | `demo/studio/src` |

Re-run reconcile after **any** change to a clip or an audio file. The timeline holds measured
durations; stale ones produce narration that is cut off or trailed by silence.

## What reconciliation decides

Full rules and the arithmetic in
[reconciliation.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-assembly/references/reconciliation.md).
Summary: narration duration defines each section (`0.25s` lead-in + narration + `0.6s` tail),
and the clip is fitted to it with playback rate first (capped at ±15%), then trimming a long
tail, then holding the final frame under a continuing camera move.

**Read the warnings it prints.** They are the honest report of what the edit had to hide:

| Warning | Meaning | Right response |
|---|---|---|
| `holds on the last frame` | Clip much shorter than its narration | Re-capture with longer dwells; shorten the line if re-capture is expensive |
| `trimmed Ns from the end` | Clip much longer | Check the final action survives the trim |
| `videoLed but narration is longer` | Marked video-led yet the voice overruns | Shorten the line or drop `videoLed` |
| `only a raw .webm exists` | Transcode did not run | Run `transcode-clip.sh`; check ffmpeg is installed |
| `no clip found` | Section not captured | Capture it — reconcile exits non-zero |

A demo with no warnings had its capture budgeted correctly. One or two small holds are normal.
Several large ones mean the capture stage should be re-run against the measured budgets, not
that the edit needs more tricks.

## The bundled Remotion project

`demo/studio` is a copy of the plugin's template. It reads `../timeline.json` at build time and
resolves media through `--public-dir=..`, so `demo/capture/*.mp4` and `demo/audio/*.mp3` are
used in place with no copying.

Structure and every component's job:
[remotion-template.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-assembly/references/remotion-template.md).

```
demo/studio/src/
  Root.tsx              composition, sized and timed from the timeline
  Timeline.tsx           section sequences + music bed with ducking
  components/SectionShell.tsx   incoming transition + overlay layer
  components/Camera.tsx         scale drift with a focus point
  components/{LowerThird,Captions}.tsx
  sections/{VideoSection,StillSection,TitleCard,CodeSection}.tsx
  lib/{timeline.ts,theme.ts}     types + the visual system
```

`VideoSection` is where the fit is executed: `playbackRate`, `trimBefore`/`trimAfter` (**in
frames**), and a `<Freeze>` on the last frame for the hold.

### Customising

Editing `demo/studio/src` is expected and supported — `init-demo.sh` never overwrites an
existing studio directory.

- **Brand it:** `lib/theme.ts` only. Colours, fonts, sizes, safe area. Nothing else needs to
  know.
- **New section type:** add a component, dispatch on `surface` in `Timeline.tsx`, and add the
  surface to the storyboard schema so validation accepts it.
- **Something genuinely custom** (animated logo, data-viz interstitial, kinetic titles): use
  the Remotion agent skills — `/remotion-markup` for animation and layout, `/remotion-captions`
  for subtitle work, `/remotion-render` for render invocation, `/remotion-docs` to look
  anything up. Delegate long iterations to the `demo-remotion-builder` subagent; render loops
  are noisy.

Keep the timeline contract intact when you customise. If a component stops reading
`startFrame`/`durationInFrames`, the measured pipeline no longer controls the cut and A/V sync
is on you.

## Rendering

Presets in
[render-presets.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-assembly/references/render-presets.md).

- `--draft` — 0.6 scale, CRF 28. For GATE 3. Always render a draft first.
- `--final` — full size, CRF 18, AAC 320k.
- `--codec prores` — for further editing in a real NLE.

`render.sh` validates the timeline first and refuses to render a broken one, installs the
studio's dependencies on first use, and picks concurrency from the core count.

## Checks before the final render

- [ ] Reconcile ran after the last media change.
- [ ] No `ERROR` from reconcile; warnings understood, not just seen.
- [ ] Draft watched, or frames reviewed (`demo-review`).
- [ ] Total length within ~10% of `meta.targetSeconds`.
- [ ] Narration audible over the music bed; no clipping.
- [ ] Captions readable and not overlapping app UI at the bottom of frame.
- [ ] First and last frames are intentional — not a half-loaded page or a frozen cursor.

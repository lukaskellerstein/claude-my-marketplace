# Render presets

```bash
bash scripts/render.sh --draft                    # review pass
bash scripts/render.sh --final                    # delivery
bash scripts/render.sh --final --codec prores     # hand off to an NLE
bash scripts/render.sh --final --out demo/out/demo-1080-social.mp4
```

`render.sh` validates the timeline first and refuses to render a broken one, installs the
studio's dependencies on first use, and sets concurrency to cores − 1 (override with
`--concurrency N`).

## The presets

| | draft | final |
|---|---|---|
| Scale | 0.6 | 1.0 |
| CRF | 28 | 18 |
| Codec | h264 | h264 (or prores) |
| Audio | AAC default | AAC 320k |
| Output | `demo/out/demo-draft.mp4` | `demo/out/demo.mp4` |
| Purpose | GATE 3 review, pacing and sync | delivery |

Always draft first. A draft renders in a fraction of the time, and every defect that matters
at GATE 3 — pacing, sync, empty states, cut-off narration — is visible at 0.6 scale.

## Quality settings that matter for screen recordings

- **CRF 18** is the sweet spot for UI content. CRF 23 shows mosquito noise around text; below
  16 the file grows with no visible gain.
- **`yuv420p`** is forced during clip transcode for compatibility. It softens fine coloured
  text slightly and there is no practical alternative for h264 delivery.
- **30 fps** throughout. Screen recordings gain nothing from 60 and cost double; the whole
  pipeline is CFR at the composition fps and mixing rates breaks the frame arithmetic.
- **`--enforce-audio-track`** is always on, so a section with no narration still has silent
  audio. Without it some players stumble at the join.

## ProRes

`--codec prores` for handing off to Final Cut, Premiere, or Resolve (`render.sh` applies the
HQ profile itself). Large files (gigabytes per minute) and no browser playback, so render an
h264 alongside it for review.

## Rendering a subset while iterating

```bash
cd demo/studio
npx remotion render src/index.ts Demo ../out/probe.mp4 --public-dir=.. --frames=0-300
npx remotion still  src/index.ts Demo ../out/frame.png --public-dir=.. --frame=420
```

Useful for checking one transition or one caption without a full render. Frame numbers come
from the timeline's `startFrame` values.

## The Studio

```bash
cd demo/studio && npm start
```

Scrubbing the timeline is the fastest way to inspect a transition, a caption position, or a
hold. Sections are named `<id> · <title>` in the Studio timeline, and each narration track
appears as `<id> VO`.

The Studio reads the same `../timeline.json`, so a reconcile in another terminal hot-reloads.

## Render failures

| Symptom | Cause |
|---|---|
| `Cannot find module '../../timeline.json'` | Reconcile has not run, or the studio was copied outside `demo/` |
| Media 404 during render | `--public-dir=..` missing, or a timeline `src` that does not match the file on disk — the timeline validator catches this first |
| Black frames where video should be | Raw WebM instead of transcoded MP4, or a `trimBefore` past the end of the clip |
| Audio absent | Narration file missing; check `demo/audio/<id>.json` exists |
| Render hangs early | Concurrency too high for available memory — re-run `render.sh` with `--concurrency 2` |
| Fonts differ from the Studio | A webfont failed to load in the render browser; system fonts avoid this entirely |

## Delivery

- **Docs / landing page**: h264 CRF 18, 1080p. Muted autoplay is common — captions matter.
- **Slides**: same file; check it plays offline in the presentation tool.
- **Social**: some platforms want square or vertical. That is a different composition, not a
  crop — a 16:9 screen recording cropped to 9:16 loses the UI. Build a separate composition
  with the video letterboxed into the safe area if it is genuinely needed.
- **Internal wiki**: check the file size limit before rendering; CRF 22 at 1080p is usually
  enough and roughly halves the file.

Report the final path, duration, and file size when you are done.

# Artifact contracts

Exact shapes and rules for every file the pipeline reads or writes. The authority is
executable: `scripts/validate-storyboard.mjs` for the storyboard, `scripts/validate-timeline.mjs`
for the timeline, and `demo/studio/src/lib/timeline.ts` for the exact timeline field types.
This document is the readable summary of what they enforce.

## Section ids

`NN-slug`, zero-padded, ordinal matching position: `01-hook`, `02-import`, `03-search`.

The id is the join key for the whole pipeline:

| Artifact | Path |
|---|---|
| clip | `demo/capture/03-search.mp4` |
| clip measurement | `demo/capture/03-search.json` |
| raw OBS take | `demo/capture/raw/03-search.mov` (`03-search.failed.mov` for a broken take) |
| action log (script captures) | `demo/capture/03-search.actions.json` |
| narration | `demo/audio/03-search.mp3` |
| narration measurement | `demo/audio/03-search.json` |
| alignment (optional) | `demo/audio/03-search.align.json` |
| timeline entry | `sections[].id === "03-search"` |

Renumbering after capture orphans the media. If the order must change, rename the media
files with the ids, or re-capture. `reconcile.mjs` matches audio by prefix, so
`03-search_1.mp3` from a regeneration still resolves — but the clip must match exactly.

## storyboard.json

Written by you at stage 2, validated on every write. The parts that matter most:

- `meta.title`, `meta.audience` — required. Every narration decision derives from the audience.
- `meta.targetSeconds` — required; section durations must sum to within 25% of it (10% warns).
- `meta.fps` — 24, 25, 30 (default), or 60.
- `meta.captureSize` (default `1600x900`) and `meta.outputSize` (default `1920x1080`).
  Capturing smaller than output is deliberate: UI text reads larger. See
  `demo-capture/references/cinematography.md`.
- `meta.captions` — `section` (default) | `word` | `none`.
- `meta.voice` — the narrator contract: `voiceId`, `modelId`, `speed`, `stability`,
  `similarityBoost`, plus anything else regeneration must reproduce (`style`, `language`,
  `use_speaker_boost`). Free-form — record every parameter you set.
- `meta.music` — `src` (relative to `demo/`), optional `gainDb` (−22), `duckDb` (−30).
- `meta.appUrl`, `meta.startCommand`, `meta.readySignal` — how the app is booted for capture.
- `meta.electron` — launch config for electron sections (`args`, `cwd`, `env`,
  `executablePath`, `freezeClock`).
- `meta.capture` — who drives and what records. `driver`: `mcp` | `launch` | `attach`;
  `recorder`: `playwright` | `obs` | `ffmpeg`; `attach`: the CDP endpoint (required for
  `attach`); `page`: part of the page URL or title; `input`: `cdp` | `dom`; `windowSize`;
  `obs`: `{ input, window, scene }`. See `demo-capture/references/obs.md`.
- `meta.fcp` — the Final Cut Pro export: `titleTemplate`, `lowerThirdTemplate`,
  `captionLanguage`, `projectName`, `version`. See
  `demo-assembly/references/final-cut-pro.md`.
- `sections[].beat` — `hook | problem | core-flow | wow | integration | proof | close`.
  At least one `core-flow` is required.
- `sections[].surface` — `web` and `electron` are captured; `still`, `code`, and
  `titlecard` are rendered by Remotion with no capture.
- `sections[].actions` — executable *intent*, not Playwright code. The operator resolves
  `target` from the accessibility snapshot.
- `sections[].successCriteria` — required for captured sections; the frame critic grades
  against it.
- `sections[].videoLed` — the clip defines the length instead of the narration. For a
  moment that must play at true speed.
- `sections[].onScreenText` — one string, two renderings: on captured/still/code sections
  it becomes the lower-third label; on a `titlecard` section it becomes the card's
  subtitle (no lower-third is added there).
- `sections[].code` — for `surface: code`: `content` (required — the literal snippet,
  pasted in; nothing reads `code.file` from disk at render time), plus optional `file`
  and `lines` (shown as the panel header) and `highlight` ("3-5", 1-based).
- `sections[].resetBefore` — run `demo/prep/reset.sh` before capturing this section.
- `sections[].setup` — actions the capture scripts run before recording starts.

### Action kinds

| kind | required | notes |
|---|---|---|
| `goto` | `path` | route or URL |
| `click`, `dblclick`, `hover` | `target` | pointer glides, then dwells, then acts |
| `type` | `target`, `text` | `wps` = chars/sec, default 6 |
| `press`, `shortcut` | `key` | keystroke badge appears for modifier combos; `target` picks the document |
| `scroll` | `by` | eased wheel steps, never a jump |
| `selectText` | `text` | selects that passage inside `target`, as a drag would (scripts only) |
| `waitFor` | `target` or nothing | `idleUpTo` caps the wait; `state: "hidden"` waits for it to go; `compress: "pause"` pauses OBS through it |
| `dwell` | `seconds` | deliberate pause for narration to land |
| `select`, `upload`, `drag` | `target` | |
| `menu` | `to` (`"File>New Window"`) | Electron native menu only (driver `launch`) |
| `window` | `to` (index) | Electron multi-window (driver `launch`) |
| `eval` | `text` | escape hatch; avoid in a demo unless it is invisible setup |

Common per-action fields: `dwellBefore` (default 0.5s), `dwellAfter`, `idleUpTo`, `note`.
For the capture scripts also: `in` (a chain of shadow hosts and iframes to resolve a `css=` or
`text=` target inside), `input` (`cdp` | `dom`), `showSeconds` (how much of a paused wait
stays on screen, default 1).

## Measurement sidecars

Written by hooks; consumed by `reconcile.mjs`.

```json
{ "id": "03-search", "file": "capture/03-search.mp4", "durationSeconds": 15.3,
  "width": 1600, "height": 900, "fps": 30 }
```

If a sidecar is missing, `reconcile.mjs` falls back to `ffprobe`. If both are unavailable
the section cannot be timed — the clip is treated as missing.

## Action logs

Written by `capture-attached.mjs`, and by `capture-electron.mjs` when it records with OBS —
never for Playwright video, whose clock starts at launch and would not match the clip.

```json
{ "id": "03-ask", "clock": "seconds on the recording, pauses removed",
  "actions": [ { "i": 0, "kind": "selectText", "target": "css=article", "t0": 1.0, "t1": 2.4, "ok": true } ] }
```

`t0`/`t1` are positions in the clip, so a camera move or a review finding can point at the
moment an action happened.

## demo/out/demo.fcpxml

Written by `timeline-to-fcpxml.mjs` from `timeline.json`, validated against the installed
Final Cut Pro's own DTD. Regenerable like every render — and like every render, hand edits
made inside FCP live in the FCP library, not here.

## timeline.json

Generated. Regenerated by every reconcile. Two things to know when reading it:

- **All frame values are frames**, including `trimBefore` / `trimAfter`, which are passed
  straight to Remotion's `OffthreadVideo`. Seconds fields are informational.
- `startFrame` already accounts for transition overlap: a crossfading section starts
  before the previous one ends, and both are mounted during the overlap.

Hand-editing it is a dead end — the next reconcile overwrites it. Change the storyboard,
the media, or `reconcile.mjs`.

## demo/studio

A copy of the bundled Remotion project. It reads `../timeline.json` at build time, and
media resolves through `--public-dir=..` so `staticFile('capture/03-search.mp4')` points
at `demo/capture/03-search.mp4` with no copying.

`init-demo.sh` never overwrites an existing studio directory. Customise it freely — that
is the escape hatch. `--force-studio` restores the bundled version.

## What is committed

Commit: `brief.md`, `inventory.json`, `storyboard.json`, `prep/` (except `prep/state/`), and
any customisation of `studio/src`. Everything else — clips, raw takes, narration,
`timeline.json`, renders, the FCPXML, isolated app state — is regenerable and gitignored by
`init-demo.sh`.

A reviewer should be able to read `storyboard.json` and know exactly what the video says
and shows, without watching it.

# demo-video-plugin

Turns a project repo into a narrated, edited demo video.

Reads the codebase → writes a storyboard with real narrative value → prepares deterministic
app state → drives the UI with Playwright and records one clip per section (web **and**
Electron) → generates ElevenLabs voiceover → reconciles *measured* durations into a timeline →
renders the final cut with Remotion.

```
/demo-setup                 # once per machine: ffmpeg, Playwright, Remotion, API key
/demo-video                 # then describe it: "90s demo of semantic search, for
                            #   engineering leads evaluating us"
```

(Everything is a skill — invoke by `/name`, or just ask for a demo video and the
`demo-video` skill triggers on its own.)

## Design

Two decisions do most of the work.

**JSON contracts, not improvisation.** Claude writes `storyboard.json`; deterministic scripts
measure media and compute the edit; a bundled, timeline-driven Remotion project renders it.
Claude never hand-writes editing code for a standard demo, so output does not depend on it
reinventing React each run.

**Audio-led, measured timeline.** Narration is generated *before* the recorded take, and its
measured duration is the authoritative length of each section — the way a human editor cuts
picture to voice. Nothing in the pipeline trusts a planned duration: Playwright's VP8 WebM
is fixed at 25fps with an unreliable container duration and poor seek behaviour in Remotion,
so every clip is transcoded to H.264 MP4 at the composition fps and probed, and every
narration file is probed too.

Plus one rule that removes most agent-driven capture failures: **never record the first take.**
Rehearse unrecorded, then record.

## Pipeline

```
/demo-video → preflight → research → storyboard →【GATE 1: narrative】
      → app prep → rehearse →【GATE 2: feasible】
      → voiceover (measured) → record (budgeted to the voice)
      → reconcile → draft render →【GATE 3: watch it】→ review → final render
```

Stages are individually re-runnable — in practice one section is re-cut several times while
the rest stays untouched.

## Skills

Every stage is a skill: it triggers on a matching request, or invoke it directly as
`/<skill-name>`.

| Skill | Owns |
|---|---|
| `demo-video` | The pipeline, artifact contracts, gates. The entry point — load before touching `demo/`. |
| `demo-setup` | Doctor + installer for the toolchain; scaffolds `demo/` |
| `demo-scripting` | Narrative: what earns screen time, beat structure, pacing math, narration writing |
| `demo-app-prep` | Deterministic, demo-worthy app state — seeding, frozen clocks, hidden dev UI |
| `demo-capture` | Cinematography, the Playwright MCP video tools, the Electron tiers |
| `demo-voiceover` | Voice/model selection, fitting a line to a duration, captions, music |
| `demo-assembly` | Reconciliation rules, the Remotion template, render presets |
| `demo-review` | QA rubric, frame reading, routing findings back to the right stage |

## Subagents

| Subagent | Why isolated |
|---|---|
| `demo-researcher` | Reads the whole repo; returns a small ranked capability inventory |
| `demo-capture-operator` | One per section, **sequential** — Playwright snapshots are huge, the output is one clip |
| `demo-remotion-builder` | Custom compositions; render/typecheck loops are noisy |
| `demo-frame-critic` | Reads dozens of frames; returns a ranked findings list |

Storyboard and narration text stay in the main thread — they need whole-demo coherence.

## Hooks

Each one prevents a specific expensive failure.

| Trigger | Does |
|---|---|
| `SessionStart` | Silent unless `demo/` exists; then reports missing tooling and which pipeline stage the artifacts are at |
| after `browser_stop_video` | Transcodes WebM → CFR H.264 MP4 and writes a measured duration sidecar |
| after `text_to_speech` | Probes the narration and warns when it is >20% off its budget |
| after writing `storyboard.json` | Shape + pacing + budget + filler-phrase validation (blocking) |
| after writing `timeline.json` | Media existence, duration match, gaps, warp limits (blocking) |

## Requirements

- **ffmpeg / ffprobe** — every transcode and measurement
- **Node ≥ 18** — scripts and Remotion
- **uvx** — runs the `demo-elevenlabs` MCP server
- **`ELEVENLABS_API_KEY`**
- **Playwright browsers** — `npx playwright install chromium`
- **Remotion plugin** — installed by `/demo-setup`:
  `claude plugin marketplace add remotion-dev/claude-code-plugin` +
  `claude plugin install remotion@remotion` (restart Claude Code). The Remotion *agent
  skills* are an optional manual install (https://www.remotion.dev/docs/ai), used only for
  custom compositions beyond the bundled template
- **`playwright` module** — only for Electron sections; `/demo-setup` installs it into
  `~/.cache/demo-video-plugin`

## MCP servers

| Server | Notes |
|---|---|
| `demo-playwright` | `@playwright/mcp` with **`--caps=devtools,vision,network,storage,testing`** (devtools gates the video tools; vision the coordinate mouse tools; network route-blocking; storage auth injection; testing the verify tools), headless, isolated, 1600×900, and the cursor-overlay init script |
| `demo-elevenlabs` | `uvx elevenlabs-mcp` for narration, voices, and music beds |

`demo-playwright` records at 1600×900 into a 1920×1080 composition on purpose: the 1.2×
upscale makes app text readable at normal playback sizes.

## Electron

Playwright MCP cannot drive Electron. Three tiers, preferred first:

1. **Capture the renderer in Chromium** (`surface: web`) — best quality, cursor overlay works.
   Usually most of a desktop demo.
2. **`scripts/capture-electron.mjs`** — real `_electron.launch({recordVideo})`, driven by the
   same storyboard actions. Handles native menus and multi-window. Size-checks its output,
   because empty WebM from Electron `recordVideo` is a known bug.
3. **`scripts/capture-screen-macos.sh`** — ffmpeg/avfoundation screen capture. Lower quality,
   real OS cursor, needs Screen Recording permission. Last resort, kept short.

## Layout

```
demo/                       created in the target project
  brief.md  storyboard.json  prep/           [committed]
  capture/  audio/  timeline.json  out/      [gitignored, regenerable]
  studio/                    Remotion project, reads ../timeline.json
```

`brief.md` + `storyboard.json` + `prep/` rebuild the entire video.

## Notable details

- **Playwright records no mouse cursor.** `assets/cursor-overlay.js` (via `--init-script`)
  draws one that eases toward the real pointer, with a click ripple and a keystroke badge.
  Without it the video looks like a test run.
- **Time-warp is capped at ±15%.** Beyond that the reconciler holds a frozen last frame under a
  continuing camera move rather than producing rubbery motion — and says so in its report.
- **A surface change forces a hard cut**, so web → desktop reads as intentional.
- **Captions are on by default**, because most demos are first watched muted.
- **The storyboard validator rejects demo filler** ("as you can see", "revolutionize") and
  unspeakable pacing.

## Extending

- Brand it: `demo/studio/src/lib/theme.ts` only.
- New section type: component + `Timeline.tsx` dispatch + the validator's `SURFACES` set.
- Ambitious compositions: the Remotion agent skills (`/remotion-markup`, `/remotion-captions`,
  `/remotion-docs`) via the `demo-remotion-builder` subagent.
- Different editorial house style: `scripts/reconcile.mjs` constants.

Keep the timeline contract — sections positioned by `startFrame`/`durationInFrames` — or the
measured pipeline stops controlling the cut.

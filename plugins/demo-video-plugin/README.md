# demo-video-plugin

Turns a project repo into a narrated, edited demo video.

Reads the codebase → writes a storyboard with real narrative value → prepares deterministic
app state → drives the UI with Playwright and records one clip per section (web **and**
Electron, recorded by Playwright or by **OBS**) → generates ElevenLabs voiceover → reconciles
*measured* durations into a timeline → renders the final cut with Remotion, or exports it as a
**Final Cut Pro** project dressed with Motion templates — **MotionVFX** DesignStudio elements
first-class.

```
/demo-video-plugin:demo-setup   # once per machine: ffmpeg, Playwright, Remotion, API key, OBS, FCP
/demo-video-plugin:demo-video   # then describe it: "90s demo of semantic search, for
                                #   engineering leads evaluating us"
```

(Everything is a skill — invoke it by its namespaced name, or just ask for a demo video and
the `demo-video` skill triggers on its own.)

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

And two separations that keep the pipeline honest about quality:

- **Who drives the app is separate from what records it.** Playwright drives; Playwright video
  *or* OBS records. OBS captures the real window at native pixels and 60 fps, so text stays
  readable, and it pauses through long waits so an agent run does not fill the clip.
- **The cut is separate from the finish.** One reconciled timeline renders headlessly in
  Remotion *or* exports as a Final Cut Pro project for hand-finishing, with the graphics
  chosen from the Motion templates on the Mac.

## Pipeline

```
/demo-video → preflight → research → storyboard →【GATE 1: narrative】
      → app prep → rehearse →【GATE 2: feasible】
      → voiceover (measured) → record (budgeted to the voice; Playwright or OBS)
      → reconcile → draft render →【GATE 3: watch it】→ review
      → final render (Remotion)
        and/or graphics →【GATE 4: look + downloads】→ FCPXML → finished by hand in Final Cut Pro
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
| `demo-app-prep` | Deterministic, demo-worthy app state — seeding, frozen clocks, hidden dev UI, isolated desktop-app state |
| `demo-capture` | Cinematography, drivers (MCP, launch, attach) and recorders (Playwright, OBS, ffmpeg) |
| `demo-voiceover` | Voice/model selection, fitting a line to a duration, captions, music |
| `demo-assembly` | Reconciliation rules, the Remotion template, render presets, the Final Cut Pro export |
| `demo-graphics` | Motion templates for the FCP finish — MotionVFX first: inventory, one look, one element per role, callouts on logged actions, the download gate |
| `demo-review` | QA rubric, frame reading, routing findings back to the right stage |

## Subagents

| Subagent | Why isolated |
|---|---|
| `demo-researcher` | Reads the whole repo; returns a small ranked capability inventory |
| `demo-capture-operator` | One per section, **sequential** — Playwright snapshots are huge, the output is one clip |
| `demo-remotion-builder` | Custom compositions; render/typecheck loops are noisy |
| `demo-frame-critic` | Reads dozens of frames; returns a ranked findings list |
| `demo-graphics-scout` | Reads contact sheets of templates against frames; returns one pick per slot and the download list |

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
- **`playwright` module** — for the script capture paths (launch, attach); `/demo-setup`
  installs it into `~/.cache/demo-video-plugin`
- **OBS 30+** (optional, for the OBS recorder) — WebSocket server enabled,
  `OBS_WEBSOCKET_PASSWORD` in the environment, Node ≥ 22 for the built-in WebSocket client
- **Final Cut Pro** (optional, for the FCP finish) — plus `xmllint`, which macOS ships
- **MotionVFX mExtension** (optional, for the FCP finish) — with a DesignStudio subscription;
  the plugin uses what the user downloaded and never downloads anything itself

## MCP servers

| Server | Notes |
|---|---|
| `demo-playwright` | `@playwright/mcp` with **`--caps=devtools,vision,network,storage,testing`** (devtools gates the video tools; vision the coordinate mouse tools; network route-blocking; storage auth injection; testing the verify tools), headless, isolated, 1600×900, and the cursor-overlay init script |
| `demo-elevenlabs` | `uvx elevenlabs-mcp` for narration, voices, and music beds |

`demo-playwright` records at 1600×900 into a 1920×1080 composition on purpose: the 1.2×
upscale makes app text readable at normal playback sizes.

## Capture: drivers and recorders

`meta.capture` in the storyboard picks both:

| | Options |
|---|---|
| **driver** | `mcp` — the headless Playwright MCP (web) · `launch` — `capture-electron.mjs` starts the Electron app per section · `attach` — `capture-attached.mjs` attaches over CDP to an app already running on its own (isolated data, wrapper scripts, packaged builds) |
| **recorder** | `playwright` — VP8 at 25 fps · `obs` — the real window through obs-websocket, native pixels, 60 fps, pauses through waits · `ffmpeg` — `capture-screen-macos.sh`, last resort |

```bash
node scripts/obs.mjs status                                   # reachable? can it pause?
node scripts/obs.mjs setup-scene --window "My App" --size 1600x900
node scripts/capture-attached.mjs --project . --dry           # rehearse
node scripts/capture-attached.mjs --project . --section 03-ask
```

The script paths add actions the MCP cannot do: `setup` before recording, `in` to reach
targets through shadow roots and sandboxed iframes, `selectText`, `waitFor` with
`compress: "pause"` or `state: "hidden"`, and `input: "dom"` for windows real input does not
reach. Guides: `skills/demo-capture/references/obs.md` and `electron.md`.

## Finish: Remotion or Final Cut Pro

```bash
bash scripts/render.sh --final                                # Remotion -> demo/out/demo.mp4
node scripts/timeline-to-fcpxml.mjs --project . --probe       # 10s smoke test -> demo/out/probe.fcpxml
node scripts/timeline-to-fcpxml.mjs --project .               # FCP      -> demo/out/demo.fcpxml
```

The FCPXML carries the same cut: clips with retimes and holds, transitions, narration, the
ducked music bed, captions and chapter markers. It is validated against the installed FCP's
DTD before anyone imports it.

DTD-valid is not the same as imports-correctly, so import `--probe` first: ten seconds of real
footage carrying every template the storyboard names, each text layer filled with a sentinel
(`FB5S#0`), built by the same exporter. Any import warning is a failed test.
`meta.authoritativeRenderer` says which film the user is approving — a Remotion draft renders
no Motion template. Guide: `skills/demo-assembly/references/final-cut-pro.md`.

### Graphics: Motion templates, MotionVFX first

On a Mac with MotionVFX's mExtension, the FCP finish can use its DesignStudio elements the way
it uses FCP's own templates: title cards on a background, lower thirds, Motion transitions at
section edges, effects on clips, and overlays — a click callout placed where the pointer went
on a logged action, a callout beside a result, an infographic for a number.

```bash
node scripts/fcp-templates.mjs                                # per kind: built-in, installed, placeholders
node scripts/fcp-templates.mjs --roles                        # downloaded templates per role
node scripts/fcp-templates.mjs --packs                        # MotionVFX theme packs
node scripts/fcp-templates.mjs --sheet out.png --role callout # contact sheet to look at
node scripts/fcp-templates.mjs --inspect "Cursor Click 4G9Y"  # length, text layers, drop zones
node scripts/fcp-templates.mjs --check --project .            # what the storyboard names: ready?
```

mExtension lists the whole catalog, but an element never downloaded is a placeholder that
renders *"The file is missing"*. The scanner tells the two apart and the export refuses to
write a file that names a placeholder — it prints what to download instead.

A placeholder has no picture on this Mac, so the plugin asks MotionVFX. Their public catalog
needs no login and covers all 9,699 FCP elements, with the real preview still, preview movie
and length:

```bash
node scripts/motionvfx-catalog.mjs --search "cursor click" --kind titles --limit 12 \
  --out demo/out/graphics/cursors --sheet demo/out/graphics/cursors.png
node scripts/motionvfx-catalog.mjs --preview 6SMY,FB5S --out demo/out/graphics/picks
node scripts/motionvfx-catalog.mjs --collections               # which collections are nearly complete
```

Every row says whether it is downloaded here. This is the only part of the plugin that uses
the network. Guide: `skills/demo-graphics/SKILL.md`.

### After approval

```bash
node scripts/fcp-finish-manifest.mjs --project .   # inputs hashed, templates, what is left by hand
node scripts/youtube-package.mjs --project .       # title, description, chapters from the measured cut
```

Then consolidate the FCP library, check the archive restores on a fresh path, and ask before
cleaning anything up: `skills/demo-video/references/delivery.md`. Neither script uploads,
publishes, commits or pushes, and approving a film authorises none of those.

## Layout

```
demo/                       created in the target project
  brief.md  storyboard.json  prep/           [committed]
  capture/  audio/  timeline.json  out/      [gitignored, regenerable]
  prep/state/                                 [gitignored — isolated app state]
  studio/                    Remotion project, reads ../timeline.json
  <videoId>/final/  <videoId>/youtube/       [committed, after approval]
```

`brief.md` + `storyboard.json` + `prep/` rebuild the entire video. When a repository holds
several videos, `meta.videoId` (`01-rex-overview`) keeps their deliveries apart.

## Notable details

- **Playwright records no mouse cursor, and OBS hides the OS one.** `assets/cursor-overlay.js`
  draws one that eases toward the real pointer — or is driven explicitly by the capture
  scripts, over iframes too — with a click ripple and a keystroke badge. Without it the video
  looks like a test run.
- **OBS lies about pausing.** `PauseRecord` answers success even when the output cannot pause,
  so the recorder waits for the `PAUSED` event and warns when it never comes.
- **Time-warp is capped at ±15%.** Beyond that the reconciler holds a frozen last frame under a
  continuing camera move rather than producing rubbery motion — and says so in its report.
- **A surface change forces a hard cut**, so web → desktop reads as intentional.
- **Captions are on by default**, because most demos are first watched muted.
- **The storyboard validator rejects demo filler** ("as you can see", "revolutionize") and
  unspeakable pacing.
- **A DTD-valid FCPXML can still import wrong.** Anchoring inside a connected storyline, an
  empty `text-style`, and moving a template that draws the footage all passed the DTD and all
  broke in Final Cut Pro. That is why `--probe` exists.

## Tests

```bash
node --test "tests/*.test.mjs"
```

They cover what silently breaks an export: placeholder detection, template resolution,
published-parameter keys, text-layer order, and the MotionVFX catalog requests (with a mocked
network, so they run offline).

## Extending

- Brand it: `demo/studio/src/lib/theme.ts` only.
- New section type: component + `Timeline.tsx` dispatch + the validator's `SURFACES` set.
- Ambitious compositions: the Remotion agent skills (`/remotion-markup`, `/remotion-captions`,
  `/remotion-docs`) via the `demo-remotion-builder` subagent.
- Different editorial house style: `scripts/reconcile.mjs` constants.

Keep the timeline contract — sections positioned by `startFrame`/`durationInFrames` — or the
measured pipeline stops controlling the cut.

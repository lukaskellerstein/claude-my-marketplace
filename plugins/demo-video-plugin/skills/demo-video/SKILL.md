---
name: demo-video
description: Orchestrates building a narrated demo video of a project — reads the codebase, writes a storyboard, prepares deterministic app state, drives the UI with Playwright to record clips (web and Electron, recorded by Playwright or by OBS), generates ElevenLabs voiceover, reconciles measured durations into a timeline, and renders the final cut with Remotion or exports it as a Final Cut Pro project. Use whenever the user asks for a demo video, screencast, product walkthrough, feature showcase, release video, or narrated recording of an app; also load this before touching anything under demo/ so the pipeline's contracts and stage gates are respected.
---

# Demo Video

Builds a demo video that is worth watching: a real narrative, a real app, real narration,
cut to a measured timeline.

**Load this skill before touching any `demo/` artifact.** It owns the pipeline, the file
contracts, and the gates. The stage skills own the craft.

## Two rules that decide whether this works

**1. JSON contracts, not improvisation.** You write `storyboard.json`. Deterministic
scripts do the measuring, the timing arithmetic, and the assembly. You do not hand-write
`timeline.json` and you do not hand-write editing code for a standard demo — the bundled
Remotion project already renders the timeline. This is why the result is reproducible.

**2. Never record the first take.** Rehearse every captured section unrecorded first. The
first attempt at driving an unfamiliar UI always misses a selector, waits too little, or
lands on an empty state. Rehearsing costs seconds; a bad recorded take costs the whole
section plus the narration cut to it.

## Pipeline

| # | Stage | Skill | Output |
|---|-------|-------|--------|
| 0 | Preflight | `demo-setup` | tooling verified, `demo/` scaffolded |
| 1 | Understand | `demo-scripting` (+ `demo-researcher` subagent) | `demo/inventory.json` |
| 2 | Script | `demo-scripting` | `demo/brief.md`, `demo/storyboard.json` → **GATE 1** |
| 3 | Prep app | `demo-app-prep` | `demo/prep/*`, app running, deterministic state |
| 4 | Rehearse | `demo-capture` | dry-run report → **GATE 2** |
| 5 | Voice | `demo-voiceover` | `demo/audio/<id>.mp3` + measured durations |
| 6 | Record | `demo-capture` | `demo/capture/<id>.mp4` + measured durations (Playwright or OBS) |
| 7 | Reconcile | `demo-assembly` | `demo/timeline.json` |
| 8 | Draft render | `demo-assembly` | `demo/out/demo-draft.mp4` → **GATE 3** |
| 9 | Review | `demo-review` (+ `demo-frame-critic`) | findings, fixes, re-takes |
| 10 | Final render | `demo-assembly` | `demo/out/demo.mp4`, and/or `demo/out/demo.fcpxml` for a Final Cut Pro finish |

Stages 4–10 are individually re-runnable. In practice one section gets re-cut several
times while the rest stays untouched — never re-run the whole pipeline to fix one section.

### Defaults when the request is vague

- **Focus**: no focus named means the project's core value, chosen from the researcher's
  inventory.
- **Length**: default 90s target (`meta.targetSeconds`).
- **Audience**: if not given, infer from the project and **confirm at GATE 1** — every
  narration choice depends on it.
- **Surface**: detect from the project (web, electron, or both).
- When done, report the final path, duration, and file size, along with anything you could
  not verify.

### Why voiceover comes before recording

Narration length is the authoritative length of a section, so generate it first, measure
it, and give the capture stage a per-section time budget it can hit with dwell times. The
alternative — recording first and stretching the picture to fit — produces rubbery motion
and frozen frames. Rehearsal (stage 4) happens before narration so no credits are spent on
a demo that cannot be captured.

## Gates — stop and ask

**GATE 1, after the storyboard.** Show the section list with beats, durations, and the
narration text. This is the cheapest moment to change the demo and the most expensive one
to skip. Do not spend ElevenLabs credits before the narrative is approved.

**GATE 2, after rehearsal.** Report which sections drove cleanly, which selectors were
ambiguous, and what the real timings were. If the app is not demo-ready, say so here.

**GATE 3, after the draft render.** A 0.6-scale draft renders in a fraction of the time.
The user watches it before the final. Never go straight to a final render.

## Artifact contract

```
demo/
  brief.md          audience, length, must-show, must-not-show     [commit]
  inventory.json    capability inventory from the researcher       [commit]
  storyboard.json   THE contract — validated on every write        [commit]
  prep/             seeding + determinism scripts                  [commit]
  prep/state/       isolated app state for capture (live/, golden/)
  capture/<id>.mp4  one clip per section + <id>.json measurement
  capture/raw/      OBS takes as recorded; <id>.failed.* for a take that broke
  capture/<id>.actions.json   script captures: every action, on the clip's clock
  audio/<id>.mp3    one narration per section + <id>.json
  timeline.json      GENERATED by reconcile.mjs — never hand-write
  studio/           Remotion project, reads ../timeline.json
  out/              renders, demo.fcpxml, extracted review frames
```

Committed files rebuild everything else. Media is regenerable and gitignored.

Section ids are `NN-slug` (`03-search`) and are the join key across every stage: clip,
narration, timeline entry, and review finding all use the same id. Getting an id wrong is
the one mistake that silently misaligns the whole video.

Details and edge cases: [artifact-contracts.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-video/references/artifact-contracts.md).

## What is automated for you

Do not do these by hand:

- **Clip transcode + measurement** — a hook runs after every `browser_stop_video`, and the
  capture scripts run the same step after every take, converting the recording to H.264 MP4
  at the composition fps and writing a duration sidecar. Playwright's VP8 WebM is fixed at
  25fps, seeks badly in Remotion, and reports an unreliable container duration; the sidecar
  is the truth.
- **Narration measurement** — a hook ffprobes every generated file and warns when a line
  came out far from its budget.
- **Validation** — `storyboard.json` and `timeline.json` are validated on every write.
  Errors are blocking. Read them; they are specific.
- **Timing arithmetic** — `scripts/reconcile.mjs` decides trims, playback rates, holds,
  transition overlaps, caption timing, and music ducking.

## Running it

```bash
# 0. once per machine
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh                    # check (OBS and FCP too)
bash ${CLAUDE_PLUGIN_ROOT}/scripts/init-demo.sh                # scaffold demo/

# 4, 6. script-driven capture (desktop apps, OBS)
node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-attached.mjs --project . --dry
node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-attached.mjs --project . --section 03-ask

# 7-8. after capture + narration exist
node ${CLAUDE_PLUGIN_ROOT}/scripts/reconcile.mjs --project .
bash ${CLAUDE_PLUGIN_ROOT}/scripts/render.sh --draft
bash ${CLAUDE_PLUGIN_ROOT}/scripts/extract-frames.sh demo/out/demo-draft.mp4
bash ${CLAUDE_PLUGIN_ROOT}/scripts/render.sh --final

# 10, optional: the same timeline as a Final Cut Pro project
node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline-to-fcpxml.mjs --project .
```

**Two finishes.** Remotion renders without a person and re-renders for free. The Final Cut
Pro export turns the same measured timeline into an FCP project for hand-finishing with FCP
titles and lower thirds — the last step there is a person pressing Share. Ask at GATE 1
which finish the user wants when `brief.md` does not say; details in
[final-cut-pro.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-assembly/references/final-cut-pro.md).

## Subagents

Delegate these; they are high-volume work with a small conclusion:

- **`demo-researcher`** — stage 1. Reads the codebase and returns a ranked capability
  inventory. Do not read a whole repo in the main thread.
- **`demo-capture-operator`** — stage 4/6 for the MCP driver, one invocation per section,
  **sequentially**. Playwright snapshots are enormous; the useful output is one clip and a
  short report. One browser per MCP server means parallel operators would fight over it.
  The `launch` and `attach` drivers are scripts: run them directly and read their JSON report.
- **`demo-remotion-builder`** — only when the demo needs custom compositions beyond the
  template. Render and typecheck loops are noisy.
- **`demo-frame-critic`** — stage 9. Reads extracted frames and grades them against each
  section's `successCriteria`.

Keep in the main thread: the brief, the storyboard, and the narration text. They need
whole-demo coherence and the user's input.

## Failure modes worth knowing before you start

| Symptom | What it means |
|---|---|
| Clip is 0–2s or a few KB | The take failed. Re-record. Never let it reach the timeline. |
| Video tools missing from `/mcp` | `demo-playwright` lacks `--caps=devtools`. Recording is impossible until fixed. |
| Everything looks empty on screen | App state was not seeded. Go back to `demo-app-prep`; do not narrate around it. |
| Reconcile reports a large hold | Clip much shorter than its narration. Re-capture with longer dwells, or shorten the line. |
| Reconcile reports a large trim | Clip much longer. Check the final action still survives the trim. |
| Electron clip is empty | Known Playwright/Electron `recordVideo` bug — record with `--recorder obs`. |
| Text in the clips looks soft | Playwright video is VP8 at 25 fps. Record with OBS (`demo-capture/references/obs.md`). |
| An agent or build wait fills a clip | Mark the `waitFor` with `compress: "pause"`; OBS pauses through it. |
| The desktop app shows someone's real data | It was launched with its default state. Isolate it (`demo-app-prep`, desktop apps) before recording anything. |

## Scope

This builds a demo of a working app. It does not fix the app. If a core flow is broken or
unfinished, say so and let the user decide whether to fix it, cut the section, or ship a
demo of what works — do not stage a fake version of a feature that does not exist, and do
not narrate a capability the recording does not show.

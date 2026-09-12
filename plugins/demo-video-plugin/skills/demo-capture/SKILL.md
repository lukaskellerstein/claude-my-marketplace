---
name: demo-capture
description: Records demo video clips by driving a running app — one clip per storyboard section, with human-feeling pointer motion, dwell timing, and per-character typing. Covers who drives the app (the Playwright MCP for web, a launched Electron app, or an already-running app attached over CDP) and what records it (Playwright video, OBS over obs-websocket for crisp native-pixel window capture, or a macOS screen-capture fallback), including pausing OBS through long waits. Use when recording, re-recording, or rehearsing any demo section, when setting up OBS for a demo, when a desktop app's launch must stay its own, or when captured footage looks like an automated test or its text looks soft.
---

# Demo Capture

Turns storyboard `actions` into clips that look like a person using the app.

## The two-pass rule

**Pass 1 — rehearse, unrecorded.** Drive every section with no recording. Discover which
targets resolve, how long things actually take, and what breaks. Report the real timings.

**Pass 2 — record.** Only after every section rehearses cleanly, and only after narration
exists so each section has a measured time budget to fill.

Skipping pass 1 produces a clip of an agent fumbling: a missed selector, a retry, a stray
click. That clip is unusable, and its narration is already cut to it.

## Before capturing anything

1. `demo/storyboard.json` must exist and validate.
2. The app must be running and seeded — if it is not, that is a **demo-app-prep** problem,
   not a capture problem; re-recording cannot fix an empty app.
3. For a recorded (non-dry) run, narration should already exist so each section has a
   measured budget. If `demo/audio/<id>.json` is missing, either generate narration first
   (demo-voiceover) or capture to `targetSeconds` and accept that the reconciler will have
   more to absorb.

After any capture, always re-run
`node ${CLAUDE_PLUGIN_ROOT}/scripts/reconcile.mjs --project .` — the timeline holds
measured durations, and a stale one produces narration that is cut off or trailed by
silence.

## Time budget per section

By the time you record, `demo/audio/<id>.json` gives the narration duration. The section
needs `0.25 + narration + 0.6` seconds of picture. Distribute the difference between that
and the actions' natural runtime as **dwell time** — pauses before clicks, holds on results.

Aim to land within ~10% of the budget. The reconciler can absorb ±15% by adjusting playback
rate, but every second it has to absorb is a second of slightly-wrong motion. Overshooting
slightly is better than undershooting: trimming a tail is invisible, a frozen final frame is
not.

## Recording, web (Playwright MCP)

Exact tool names, flags, and gotchas:
[playwright-mcp-video.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-capture/references/playwright-mcp-video.md).

The shape of one section:

```
browser_video_chapter   title = section title           (navigable chapters)
browser_start_video     filename = "<id>.webm", size = {width: 1600, height: 900}
  … actions, with motion and dwell …
  hold the final state ~0.6s
browser_stop_video
```

Then the `postprocess-clip` hook automatically transcodes to constant-frame-rate MP4 and
writes the measured duration. **Read the hook's report** — it tells you the real length, and
warns when a clip is suspiciously short.

Navigate and set up state *before* `browser_start_video`. The clip should open on the state
the section is about, not on a page load.

## Making it look human

Full rules in
[cinematography.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-capture/references/cinematography.md).
The non-negotiables:

- **The synthetic cursor is essential.** Playwright records no mouse pointer at all, and OBS
  is set to hide the OS pointer, which CDP input never moves. The overlay draws one that
  eases toward the real position (or is driven explicitly by the capture scripts), plus a
  click ripple and a keystroke badge. Without it, things click themselves.
- **Move, don't jump.** `browser_mouse_move_xy` in 8–15 steps toward the target, then dwell
  0.4–0.8s, then click. The dwell is what makes a click read as a decision.
- **Type at 5–7 characters/second**, never as one atomic fill.
- **Scroll in eased wheel increments**, never `scrollIntoView`.
- **Pause 0.5s after any state change** so the viewer's eye can land on what changed.
- **Leave the pointer somewhere neutral** at the end of a section.

## Who drives, and what records

Two separate choices, set in `meta.capture`:

| `driver` | Drives | Use for |
|---|---|---|
| `mcp` (web default) | the `demo-playwright` MCP, headless | web apps |
| `launch` (electron default) | `capture-electron.mjs` launches the app per section | Electron apps the pipeline may start: native menus, multi-window |
| `attach` | `capture-attached.mjs` attaches over CDP to an app that is already running | apps whose launch must stay their own — an isolated database, a wrapper script, a packaged build, a window rule |

| `recorder` | Records | Use for |
|---|---|---|
| `playwright` (default) | Playwright video: VP8, 25 fps | headless web, large UI |
| `obs` | a real window through OBS: native pixels, 60 fps | desktop apps, and any demo whose text must stay readable. Required by `attach` |
| `ffmpeg` | the screen, via `capture-screen-macos.sh` | a native menu or dialog nothing else can see |

Decide per demo, and prefer OBS whenever it is installed and the surface has a window: soft
text is the most common reason a screen recording looks cheap. Setup, pausing, the canvas and
every failure mode: [obs.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-capture/references/obs.md).
Electron specifics: [electron.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-capture/references/electron.md).

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/obs.mjs status                                    # OBS reachable, can it pause?
node ${CLAUDE_PLUGIN_ROOT}/scripts/obs.mjs setup-scene --window "My App" --size 1600x900

node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-attached.mjs --project . --dry           # rehearse
node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-attached.mjs --project . --section 03-ask

node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-electron.mjs --project . --dry
node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-electron.mjs --project . --recorder obs
```

Both scripts share one action runner (`scripts/lib/actions.mjs`), print a JSON report, and
leave per section: `capture/<id>.mp4`, its measured `<id>.json`, and with OBS the raw take in
`capture/raw/` plus `<id>.actions.json` — every action's start and end in seconds on the
clip's own clock.

### Actions only the scripts understand

| Field or kind | Does |
|---|---|
| `setup: [...]` on a section | actions run before recording starts, so the clip opens on state |
| `"in": ["#app-root", "iframe.doc"]` | resolves `target` (a `css=` selector or `text=`) through open shadow roots and same-origin iframes — including sandboxed frames with scripting off, which Playwright's own locators cannot enter |
| `selectText` `{ target, text }` | selects the passage inside the target the way a drag would, animating the cursor and firing `mouseup` |
| `waitFor` `compress: "pause"` | pauses OBS through a long wait (an agent run, a build) and resumes on the result |
| `waitFor` `state: "hidden"` | waits for something to disappear — a spinner, a Stop button |
| `input: "dom"` (or `meta.capture.input`) | dispatches events inside the page when real CDP input does not reach it |
| `press` with `target` | chooses which document receives the key |

Give a surface change a hard cut and a lower-third, so the viewer registers it as
intentional rather than as a glitch.

## When a section fails mid-take

Stop the recording, discard the clip, fix the cause, re-record **that section only**. Do not
try to salvage a take with a visible mistake in it, and do not narrate around it.

Common causes and fixes:

| Failure | Fix |
|---|---|
| Target not found | Rehearse again and read the accessibility snapshot for the real accessible name |
| Ambiguous target (matches several) | Make the storyboard `target` more specific, or add a nearby anchor |
| Action ran before the UI was ready | Add `waitFor` with `idleUpTo` rather than a blind `dwell` |
| Empty state on screen | Go back to `demo-app-prep`; this is not a capture problem |
| Clip is a few KB or under ~2s | The recording failed. MCP: check `--caps=devtools` is active. OBS: see obs.md |
| Toast or modal landed mid-take | Suppress it in prep, then re-record |
| A long wait fills the clip | Mark the `waitFor` with `compress: "pause"` and record with OBS |
| Clicks do nothing in an attached app | Real input is not reaching the window — set `input: "dom"` |
| Text looks soft | Switch the recorder to OBS, and check `setup-scene` reports `pixelExact: true` |
| `<id>.failed.mov` in `capture/raw/` | The take failed mid-way; the JSON report names the action |

## Report back

After each pass, report per section: clip path, **measured** duration versus budget, whether
`successCriteria` appears met, and any deviation from the scripted actions. The measured
duration is what the reconciler uses — never report the planned number as if it were real.

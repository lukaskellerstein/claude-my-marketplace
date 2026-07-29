---
name: demo-capture
description: Records demo video clips by driving a running app — one clip per storyboard section, with human-feeling pointer motion, dwell timing, and per-character typing. Covers the Playwright MCP video tools for web apps and a generated Playwright Electron script (plus a macOS screen-capture fallback) for desktop apps. Use when recording, re-recording, or rehearsing any demo section, or when captured footage looks like an automated test.
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

- **The synthetic cursor is essential.** Playwright records no mouse pointer at all. The
  `--init-script` overlay draws one that eases toward the real position, plus a click ripple
  and a keystroke badge. Without it, things click themselves.
- **Move, don't jump.** `browser_mouse_move_xy` in 8–15 steps toward the target, then dwell
  0.4–0.8s, then click. The dwell is what makes a click read as a decision.
- **Type at 5–7 characters/second**, never as one atomic fill.
- **Scroll in eased wheel increments**, never `scrollIntoView`.
- **Pause 0.5s after any state change** so the viewer's eye can land on what changed.
- **Leave the pointer somewhere neutral** at the end of a section.

## Recording, Electron

Playwright MCP cannot drive Electron. Three tiers, in preference order — details in
[electron.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-capture/references/electron.md):

1. **Capture the renderer in Chromium.** Most Electron apps serve a renderer that runs in a
   browser. Best quality, cursor overlay works, deterministic. Use `surface: web` for these
   beats even in a desktop-app demo.
2. **`scripts/capture-electron.mjs`** — a real Playwright `_electron.launch({recordVideo})`
   run, driven by the same storyboard actions. For native menus, dialogs, multi-window, tray,
   offline. It size-checks its own output because empty WebM is a known Electron bug.
3. **`scripts/capture-screen-macos.sh`** — OS screen capture. Lower quality, real OS cursor,
   needs Screen Recording permission. Last resort, kept short.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-electron.mjs --project . --dry        # rehearse
node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-electron.mjs --project .             # record
node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-electron.mjs --project . --section 07-native
```

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
| Clip is a few KB or under ~2s | The recording failed. Check `--caps=devtools` is active |
| Toast or modal landed mid-take | Suppress it in prep, then re-record |

## Report back

After each pass, report per section: clip path, **measured** duration versus budget, whether
`successCriteria` appears met, and any deviation from the scripted actions. The measured
duration is what the reconciler uses — never report the planned number as if it were real.

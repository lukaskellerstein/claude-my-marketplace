# Cinematography for screen recordings

What separates a demo recording from a test recording. All of it is about giving the viewer's
eye time and a path to follow.

## The pointer

**Playwright records no cursor.** The `--init-script` overlay
(`assets/cursor-overlay.js`) draws one that eases toward the real pointer, ripples on click,
and shows a badge for keyboard shortcuts. It is not decoration — without a pointer, UI
appears to operate itself and viewers cannot tell what caused what.

Motion rules:

| Do | Not |
|---|---|
| Move in 8–15 steps toward the target | Teleport with a single high-level click |
| Dwell 0.4–0.8s on the target before clicking | Click the instant the pointer arrives |
| Pause ~0.5s after the state changes | Immediately move on |
| Approach roughly along a straight line | Wander, or overshoot and correct |
| Park the pointer somewhere neutral at the end | Leave it hovering a tooltip into the cut |

The dwell before a click is the single highest-value detail. It is what turns motion into a
decision the viewer can follow.

## Typing

5–7 characters per second. Not instant, not letter-by-letter-slowly.

- Type the whole value; do not simulate typos and corrections (it reads as padding).
- For search fields with live results, let results settle before pressing Enter — that pause
  is often the most convincing moment in the demo.
- For long values (a URL, an API key), type a plausible prefix and let the rest paste, or
  pre-fill and narrate over it. Nobody wants eleven seconds of typing.

## Scrolling

Eased wheel increments (roughly 60px per step, ~45 steps/sec), never `scrollIntoView` and
never a single large wheel delta.

- Scroll slightly *past* the target, then back — the way a person finds something.
- Stop scrolling before narration mentions what is now visible, not after.
- Long lists: scroll enough to prove there is more, then stop. The point is volume, not the
  bottom of the list.

## Framing and size

**Capture at 1600×900, output at 1920×1080.** Capturing smaller than the output means the UI
is upscaled 1.2×, which makes app text readable at typical playback sizes. A native
1920×1080 capture of a desktop web app produces text too small to read in an embedded player
or on a phone.

- Both are 16:9, so the upscale is a clean fill with no crop.
- Do not capture below ~1440 wide unless the app's layout demands it — softness becomes
  visible past about 1.35× upscale.
- Check for responsive breakpoints at the capture size. 1600px may collapse a sidebar you
  wanted on screen.
- Never resize mid-recording.
- **With OBS**, make the window's content exactly the canvas size, so every pixel is the
  app's own. On a Retina display the window captures at 2× — use that as the canvas and
  zooms in the edit stay sharp. Details in `obs.md`.

## Camera moves in the edit

A completely static frame of a mostly static UI reads as a still image, and viewers
disengage. The Remotion layer applies a slow scale drift per section:

| `camera.kind` | Use for | Typical |
|---|---|---|
| `static` | Sections where the UI itself moves a lot | — |
| `kenburns` | Default for most sections | `from: 1.0, to: 1.06` |
| `zoomTo` | Narration references a specific detail | `to: 1.12`, `focus` on it |
| `punchIn` | Accent on a `wow` beat | `to: 1.08`, fast |

Keep `to` under ~1.15 for captured video. Stills tolerate more.

The camera move is also what makes a held final frame acceptable: when a clip runs out before
its narration, the picture is still moving even though the recording has stopped.

## Section boundaries

- **Open on state, not on load.** Navigate and settle before `browser_start_video`.
- **Wait ~0.5s** after starting the recording before the first action.
- **Hold the final state ~0.6s** before stopping, so the editor has a clean frame to cut on
  and the result is legible.
- **Cut, don't fade, on a context change** (web → Electron, app → code). A dissolve between
  unrelated surfaces reads as a glitch.
- 0.4s crossfade is the default between related sections. Over 0.8s feels slow in a demo.

## Attention

Only one thing should move at a time. If the app animates on entry, let the animation finish
before moving the pointer — competing motion means the viewer sees neither.

When narration names something on screen, the pointer should already be near it. Arriving
afterwards makes the viewer hunt.

## What not to do

- No `browser_video_show_actions` in a real demo — the action overlay looks like a test report.
- No visible devtools, no console, no Playwright inspector.
- No mouse movement during a pause meant for narration to land; stillness is the point.
- No zoom past ~1.15× on captured pixels.
- No section that ends the instant a button is clicked, with the result unseen.

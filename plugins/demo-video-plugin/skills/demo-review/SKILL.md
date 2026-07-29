---
name: demo-review
description: Quality-checks a rendered demo video before it ships — extracts frames, grades each section against its successCriteria, and finds spinners, empty states, clipped text, exposed secrets, audio/video desync, and pacing problems. Use after a draft render, before a final render, or when asked whether a demo video is good enough to ship.
---

# Demo Review

A rendered video is the first time anyone sees what the pipeline actually produced. Review it
before the final render, not after.

## How to look at it

You cannot watch a video, so sample it:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/extract-frames.sh demo/out/demo-draft.mp4 demo/out/frames 24
```

This writes 24 labelled frames plus `contact-sheet.png`. Read the contact sheet first — one
image, whole-video pacing — then individual frames for anything suspicious.

Delegate the frame reading to the **`demo-frame-critic`** subagent. Image tokens are heavy and
the useful output is a short findings list.

Also read the timeline's own report: `demo/timeline.json` → `report.warnings` names every place
the edit had to compensate. Those are exactly the places to look at first.

## The rubric

Grade in this order; earlier failures make later ones irrelevant. Full checks in
[qa-rubric.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-review/references/qa-rubric.md).

**1. Blocking — do not ship**
- A visible error, stack trace, or 404.
- Exposed secrets: tokens, keys, real email addresses, real customer names.
- Narration cut off mid-sentence, or narration describing something not on screen.
- An empty state or spinner occupying a meaningful part of a section.
- A clip that is obviously a failed take (blank, half-loaded, mid-navigation).

**2. Serious — fix before shipping**
- A/V desync: the picture reaches the result noticeably before or after the voice says it.
- A frozen final frame long enough to read as a stall.
- Clipped or overlapping text, captions covering the UI element being discussed.
- Placeholder data visible (`test@test.com`, `asdf`, Lorem Ipsum).
- A section that fails its own `successCriteria`.

**3. Quality — worth one iteration**
- Pacing: any section that feels longer than its content.
- Cursor teleporting, or clicking with no dwell.
- Music competing with the voice.
- A transition that reads as a glitch.
- First or last frame not deliberate.

## Grading against successCriteria

Each captured section declared what must be true on screen. Map frames to sections using
`startFrame` / `durationInFrames` and `fps` from the timeline, then check the frames inside
each range against that section's criteria. A section whose criteria cannot be verified from
any sampled frame needs a denser sample around it, not a pass.

## Checking A/V sync from frames

You cannot hear the audio, but you can bound it. For each section the timeline gives the
narration's start frame and measured duration. Take a frame from the last third of the
narration range: the result the line describes should already be visible. If the frame still
shows the action in progress, the picture is behind the voice.

The audio-led pipeline prevents most desync. When it appears, the cause is almost always a
clip re-captured without re-running reconcile.

## Reporting

Report findings as a ranked list, each with section id, frame timestamp, severity, and the
specific fix — which stage to re-run, not "improve the video":

```
BLOCKING  03-search @ 18.2s   Results list is empty; successCriteria requires ≥5 rows.
                              Fix: re-seed (demo-app-prep), then re-capture 03-search.
SERIOUS   05-audit  @ 41.0s   2.4s frozen final frame (timeline warned: hold 72 frames).
                              Fix: re-capture with longer dwell, or cut 6 words from the line.
QUALITY   02-import @ 11.5s   Cursor jumps to the Import button with no dwell.
                              Fix: re-capture with move-then-dwell-then-click.
```

Then state plainly whether it is shippable. If there are blocking findings, say so directly —
do not soften it. If it is clean, say that without hedging.

## The iteration loop

Fix the narrowest thing that resolves the finding:

| Finding | Re-run |
|---|---|
| Wrong data on screen | `demo-app-prep` → re-capture that section |
| Clip content wrong or fumbled | re-capture that section |
| Narration wording | edit storyboard → regenerate that section (demo-voiceover) |
| Timing, holds, trims | reconcile (after fixing the input that caused it) |
| Look of overlays | `demo/studio/src` |
| Narrative order or emphasis | back to `demo-scripting` — and be honest that this is a rewrite |

**Always re-run reconcile after re-capturing or re-voicing anything.** Then re-render the
draft and review again. Two review passes is normal; a third usually means a scripting problem
being treated as an editing problem.

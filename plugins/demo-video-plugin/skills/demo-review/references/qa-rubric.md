# Demo QA rubric

Work top to bottom. A blocking failure makes everything below it moot.

## 1. Blocking — do not ship

- [ ] No error toast, error page, stack trace, 404, or console overlay in any frame.
- [ ] No secrets: API keys, bearer tokens, session ids, `.env` contents, credentials in a URL.
- [ ] No real personal data: real names, real email addresses, real customer or company names,
      real invoice or account numbers. Synthetic data only.
- [ ] No narration cut off mid-sentence at a section boundary.
- [ ] No narration describing something the picture does not show.
- [ ] No empty state, skeleton, or spinner occupying a meaningful part of a section.
- [ ] No obviously failed clip: blank, half-loaded, mid-navigation, or a mis-click on camera.
- [ ] Nothing from `brief.md`'s do-not-show list.
- [ ] FCP finish: no *"The file is missing, please re-download the element"* in any frame.

## 2. Serious — fix before shipping

- [ ] A/V sync: the result is visible by the last third of the line that describes it.
- [ ] No frozen frame long enough to read as a stall (check `report.warnings` for holds).
- [ ] No text clipped, truncated mid-word, or overlapping other text.
- [ ] Captions do not cover the UI element being discussed.
- [ ] No placeholder content: `test@`, `asdf`, `foo`, Lorem Ipsum, `Untitled`, `1234`.
- [ ] Every section meets its own `successCriteria`.
- [ ] Sections are in the storyboard's order, with no missing or duplicated section.
- [ ] Total length within ~10% of `meta.targetSeconds`.
- [ ] Audio level consistent across sections; no clipping, no section markedly quieter.
- [ ] FCP finish: no graphic covers the element the narration names; no template shows its
      sample text or "DROP ZONE" art; callouts placed with `position` sit on or beside their
      target; no black band where footage should be (a moved template dragging the footage).
- [ ] FCP finish: every title is readable at its entrance, its settled hold and its exit —
      three samples per title family, not one.
- [ ] FCP finish: a logo is complete inside its mask for its whole hold (sample densely), in
      its own colours, and is the official file rather than a redrawn one.
- [ ] FCP finish: if captions were asked for, they are in the picture at a timestamp where a
      caption is active — an iTT sidecar is not burn-in.
- [ ] The exported film's decoded frame count equals `timeline.durationInFrames`. A Share
      export can be probed successfully while it is still being written.
- [ ] The film reviewed is the one `meta.authoritativeRenderer` names.

## 3. Quality — worth one iteration

- [ ] Pacing: no section feels longer than its content justifies.
- [ ] The cursor is visible, moves rather than teleports, and dwells before clicking.
- [ ] Typing is per-character, not instant.
- [ ] Scrolling is eased, not jumped.
- [ ] Transitions are 0.3–0.5s; surface changes are hard cuts.
- [ ] Camera drift is present but not noticeable as an effect.
- [ ] Music, if any, sits under the voice and ducks properly.
- [ ] Lower-thirds appear with the narration and leave; none linger the whole section.
- [ ] FCP finish: the graphics share one look; one element per role; 1–2 overlays a section.
- [ ] The first frame is a deliberate opening, not a half-painted page.
- [ ] The last frame is a deliberate hold, not a frozen cursor or mid-animation state.
- [ ] The `wow` beat actually lands — if nothing in the frames is surprising, the demo is a tour.

## Frame-by-frame reading guide

What to look for in a sampled frame:

| Look at | Failure signal |
|---|---|
| Lists and tables | Fewer than ~5 rows, identical rows, obviously generated names |
| Numbers | Zeros, `NaN`, `null`, `-`, magnitudes that contradict the narration |
| Buttons and inputs | Disabled states, validation errors, empty required fields |
| Corners of the frame | Dev banners, environment badges, chat bubbles, notification toasts |
| Bottom of frame | Caption overlapping app UI or a horizontal scrollbar |
| Text edges | Truncation with `…` where the full value matters |
| The cursor | Absent (overlay failed), or in an implausible position |
| Loading affordances | Spinners, skeletons, progress bars, "Loading…" |

## Mapping frames to sections

```
sectionAtTime(t) = the section where startFrame/fps <= t < (startFrame + durationInFrames)/fps
```

`extract-frames.sh` labels each frame with its timestamp, so this is arithmetic on the
timeline. When a finding lands near a boundary, extract extra frames around it before
concluding — a single frame inside a 0.4s crossfade shows two sections blended and looks like
a defect when it is not.

## Sampling density

- 20–24 frames for a 60–120s demo: roughly one every 4–5 seconds, 2–4 per section.
- Add a denser pass (`extract-frames.sh … 40`) when a section's `successCriteria` cannot be
  verified, or when the timeline warned about that section.
- Always check the very first and very last second explicitly; sampling inset by 2% can miss
  both.

## Judging pacing from a contact sheet

Consecutive frames that look nearly identical mean nothing changed for several seconds —
either a hold, a wait, or a section that is too long for its content. Cross-check against
`report.warnings`: a hold the reconciler already warned about is a capture problem, while
identical frames with no warning is a scripting problem.

Frames that change completely between every sample mean the demo may be moving too fast to
follow. Check the narration word rate for those sections.

## Before signing off

State explicitly:

1. Whether it is shippable, without hedging.
2. Every blocking and serious finding, with section id, timestamp, and the stage to re-run.
3. Anything you could not verify from frames (audio quality, pronunciation, music balance) so
   the user knows to check it by listening.

# Finishing in Final Cut Pro

One measured timeline, two finishes. Both start from the same `demo/timeline.json`, so the
cut is decided once — by the narration and the measured clips — and only the finish differs.

| | Remotion | Final Cut Pro |
|---|---|---|
| Render | one command, headless | a person presses Share |
| After the app changes | re-capture, re-render | re-export, re-import, **redo every hand edit** |
| Titles, lower thirds, transitions, callouts | `demo/studio/src/lib/theme.ts` — plain unless designed | Motion templates: FCP's own and MotionVFX DesignStudio elements (`demo-graphics` skill) |
| Captions | styled, burned in | FCP caption roles |
| Fine-tuning | edit code | direct manipulation — FCP is better at this |
| Review by Claude | frames from the render | frames from the exported file |

Remotion is the default because it closes the loop without a person. Choose the FCP finish
when designed graphics — MotionVFX in particular — or hand-tuned pacing matter more than
re-rendering for free.

## Commands

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/reconcile.mjs --project .
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs                        # templates per kind, MotionVFX status
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --check --project .    # every template the storyboard names
node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline-to-fcpxml.mjs --project .      # -> demo/out/demo.fcpxml
```

The export picks the newest FCPXML version the installed FCP imports and validates the file
against **that app's own DTD** (`Interchange.framework/…/FCPXMLv1_NN.dtd`) with `xmllint`. An
invalid file exits non-zero and is never handed to FCP.

## Choosing the look

The `demo-graphics` skill chooses the templates; this is what the export does with them.

```json
"fcp": {
  "titleTemplate": "Next-Gen Title 6SMY",
  "lowerThirdTemplate": "Next-Gen Lower3rd R1ED",
  "transitionTemplate": "Next-Gen Transition STAQ",
  "backgroundTemplate": "Gradient Flux I6P1",
  "captionLanguage": "en",
  "projectName": "Product demo",
  "version": "1.14"
}
```

Plus, per section, `sections[].fcp`: the same four template fields as overrides (`"none"`
turns one off), `text` for a title card, `lowerThirdText`, `effects`, and `overlays` — see
`demo-graphics`.

- Names come from `fcp-templates.mjs`, which reads all four kinds from disk: built-in
  templates are referenced as `.../<Kind>.localized/<category>/<name>.localized/<name>.<ext>`,
  installed ones (Motion, MotionVFX and other packs) as `~/<Kind>.localized/…`.
- **A MotionVFX placeholder stops the export.** An element listed by mExtension but never
  downloaded renders *"The file is missing, please re-download the element"*, so the export
  writes nothing and prints the names to download.
- A template that is not on this Mac falls back — Basic Title, Basic Lower Third, Cross
  Dissolve — or is skipped (backgrounds, effects, overlays), with a note. A storyboard stays
  exportable on a Mac without the packs.
- The template's own styling is kept: the export writes text, timing and position, nothing
  else, so the look is the template's. Text is written as plain `<text>`: given a
  `text-style`, even an empty one, FCP replaces the template's fonts with Abel 12 pt.
- Text fills a title's text layers in the template's file order, which `fcp-templates.mjs
  --inspect` prints — measured in FCP 12.3: the second string of `Keynote Lower3rd` lands on
  its big `Title 1` line, the third of `Next-Gen Title` on its big `Text 1` line.
- **Position.** Most MotionVFX templates draw the picture underneath into their own frame, so
  moving the whole title (`adjust-transform`) drags a copy of the footage along and leaves
  black behind. The export instead sets their mOSC `Content Position` — normalized to the
  template scene, y up, the scene fitted to the frame by height, measured against a grid in
  FCP. A template that draws the footage without that control is not moved, with a note.
  Every other template is moved with `adjust-transform`. `--inspect` says which applies.

## What the export contains

```
primary storyline   one gap, the length of the video
  lane  4+          graphics overlays (sections[].fcp.overlays), one lane per overlap
  lane  3           captions (iTT, meta.fcp.captionLanguage)
  lane  2           lower thirds (onScreenText), and title cards that have a background
  lane  1           connected storyline: clips with effects, title cards or their
                    backgrounds, Motion transitions or cross dissolves
  lane -1           narration, role dialogue
  lane -2           music bed, role music, ducking keyframes under every narration line
chapter markers     one per section title
```

Every time in the file is absolute, which keeps retimed clips from shifting what is anchored
to them. Nothing is anchored to an item inside the lane-1 storyline: the DTD allows it, but
FCP drops such items on import with *"Anchored items were ignored because this item does not
support them"*. To edit on the primary storyline, select the lane-1 storyline and choose
Edit → Overwrite to Primary Storyline.

| Timeline | FCPXML |
|---|---|
| captured section | `asset-clip`, in-point and duration from the reconcile |
| `playbackRate` ≠ 1, or a held last frame | a `timeMap` on the clip; a flat last segment is the hold |
| crossfade | the `transitionTemplate` (or a Cross Dissolve) centred on the edit, the overlap split into handles |
| `titlecard` | a `title` on the storyline — title, then subtitle, or `fcp.text` — or a generator `video`; with a background, the background carries the storyline and the card sits on lane 2 above it |
| `onScreenText` | a lower-third `title` on lane 2, text from `fcp.lowerThirdText` or `onScreenText` |
| `fcp.effects` | `filter-video` on the section's clip |
| `fcp.overlays` | a `title` or generator `video` from lane 4 up; placed with `<param name="Content Position" key="9999/…">` (MotionVFX mOSC templates) or `adjust-transform position` (percent of frame height, from the centre) |
| captions | `caption` elements |
| music `duckRanges` | `adjust-volume` keyframes; lines closer than two ramps merge into one duck |
| `camera` centred | `adjust-transform` scale keyframes |
| section start | `chapter-marker`, which Share turns into chapters |

## What does not carry over

The export prints a `note` for each:

- `fadeThroughBlack` and `slide` become Cross Dissolves, unless a `transitionTemplate` is set.
- A generator cannot be given text through FCPXML; its sample text stays until edited in FCP.
- Drop zones in a template stay empty and show "DROP ZONE" art; published parameters
  (colours, fonts) keep the template's values. A published parameter's key is
  `9999/<every group and layer above the object>/<object>/<channel>`, which `--inspect`
  computes; only `Content Position` is written today.
- A camera move toward a point other than the centre becomes a marker saying where; set it
  in FCP.
- `code` sections become a gap with a marker. Render that range from Remotion
  (`npx remotion render Demo out/<id>.mov --codec prores --frames=<start>-<end>` in
  `demo/studio`) and drop it in.
- Remotion's `theme.ts` styling does not exist in FCP; that is the point of this finish.

## Importing and finishing

1. File → Import → XML, or `open -a "<Final Cut Pro app name>" demo/out/demo.fcpxml`, and
   choose a library.
2. Media is referenced in place by absolute path. Do not move `demo/` after exporting, or
   relink in FCP.
3. Finish what the export cannot set — generator text, drop zones, colours — then fine-tune.
4. Share → Export File (or a YouTube preset) to `demo/out/demo-fcp.mp4`.
5. Review it like any render: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/extract-frames.sh demo/out/demo-fcp.mp4`.

## Rules

- **Hand edits come after picture lock.** A re-export makes a new project. It never updates
  the one you edited, so every edit made before a re-capture is lost.
- **FCP has no headless render.** The last step of this finish is a person. Say so in the
  report instead of implying the video is done.
- **First import on a new FCP version**: check that the held frames hold, the cross dissolves
  have handles, lower thirds carry their text, and captions sit in the caption lane. The DTD
  proves the file is well-formed FCPXML; only FCP proves it means what the timeline means.
- **A DTD-valid file can still import wrong.** Anchoring inside the connected storyline, an
  empty `text-style`, and `adjust-transform` on a template that draws the footage all pass the
  DTD and all broke in FCP. When the export changes, import it and look at frames: FCP's
  File → Export XML of the imported project shows what FCP kept.

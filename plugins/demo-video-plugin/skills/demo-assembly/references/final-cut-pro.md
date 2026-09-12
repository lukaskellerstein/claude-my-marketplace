# Finishing in Final Cut Pro

One measured timeline, two finishes. Both start from the same `demo/timeline.json`, so the
cut is decided once — by the narration and the measured clips — and only the finish differs.

| | Remotion | Final Cut Pro |
|---|---|---|
| Render | one command, headless | a person presses Share |
| After the app changes | re-capture, re-render | re-export, re-import, **redo every hand edit** |
| Titles and lower thirds | `demo/studio/src/lib/theme.ts` — plain unless designed | FCP's Motion templates, and any installed third-party pack |
| Captions | styled, burned in | FCP caption roles |
| Fine-tuning | edit code | direct manipulation — FCP is better at this |
| Review by Claude | frames from the render | frames from the exported file |

Remotion is the default because it closes the loop without a person. Choose the FCP finish
when titles, lower thirds or hand-tuned pacing matter more than re-rendering for free.

## Commands

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/reconcile.mjs --project .
node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline-to-fcpxml.mjs --project .      # -> demo/out/demo.fcpxml
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs                        # template categories
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --category "Lower Thirds"
```

The export picks the newest FCPXML version the installed FCP imports and validates the file
against **that app's own DTD** (`Interchange.framework/…/FCPXMLv1_NN.dtd`) with `xmllint`. An
invalid file exits non-zero and is never handed to FCP.

## Choosing the look

```json
"fcp": {
  "titleTemplate": "Basic Title",
  "lowerThirdTemplate": "Basic Lower Third",
  "captionLanguage": "en",
  "projectName": "Product demo",
  "version": "1.14"
}
```

- Names come from `fcp-templates.mjs`. Built-in templates are referenced as
  `.../Titles.localized/<category>/<name>.localized/<name>.moti`, templates you installed
  (Motion, motionVFX and other packs) as `~/Titles.localized/…`. The script builds both
  from the files on disk.
- A template that is not installed falls back to Basic Title or Basic Lower Third, with a
  note.
- The template's own styling is kept: the export writes the text and nothing else, so the
  look is the template's.

## What the export contains

```
primary storyline   one gap, the length of the video
  lane  3           captions (iTT, meta.fcp.captionLanguage)
  lane  2           lower thirds (onScreenText)
  lane  1           connected storyline: clips, title cards, cross dissolves
  lane -1           narration, role dialogue
  lane -2           music bed, role music, ducking keyframes under every narration line
chapter markers     one per section title
```

Every time in the file is absolute, which keeps retimed clips from shifting what is anchored
to them. To edit on the primary storyline, select the lane-1 storyline and choose
Edit → Overwrite to Primary Storyline.

| Timeline | FCPXML |
|---|---|
| captured section | `asset-clip`, in-point and duration from the reconcile |
| `playbackRate` ≠ 1, or a held last frame | a `timeMap` on the clip; a flat last segment is the hold |
| crossfade | a Cross Dissolve centred on the edit, the overlap split into handles |
| `titlecard` | a `title` on the storyline: title, then subtitle |
| `onScreenText` | a lower-third `title` on lane 2 |
| captions | `caption` elements |
| music `duckRanges` | `adjust-volume` keyframes; lines closer than two ramps merge into one duck |
| `camera` centred | `adjust-transform` scale keyframes |
| section start | `chapter-marker`, which Share turns into chapters |

## What does not carry over

The export prints a `note` for each:

- `fadeThroughBlack` and `slide` become Cross Dissolves.
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
3. Choose titles, adjust lower thirds, fine-tune.
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

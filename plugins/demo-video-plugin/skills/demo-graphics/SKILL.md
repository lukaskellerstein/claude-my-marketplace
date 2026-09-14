---
name: demo-graphics
description: Dresses the Final Cut Pro finish of a demo video with Motion templates — MotionVFX DesignStudio elements downloaded through mExtension first, Final Cut Pro's built-in templates otherwise. Inventories what is installed (downloaded or only a placeholder), picks one look and one element per role from the footage — title cards, lower thirds, section transitions, backgrounds, cursor and click callouts placed on logged actions, infographics, effects — judges candidates from their thumbnails against real frames, gates the downloads, and writes meta.fcp and sections[].fcp for the FCPXML export. Use when a demo is finished in Final Cut Pro, when the user mentions MotionVFX, mExtension, DesignStudio, Motion templates, or wants titles, lower thirds, transitions, callouts, backgrounds or infographics in the FCP version.
---

# Demo Graphics

The Final Cut Pro export puts the measured cut into FCP. This skill decides what it wears:
which Motion templates carry the title cards, the lower thirds, the transitions, and the
callouts over the product. On a Mac with MotionVFX, that is a catalog of thousands of
elements — the job is to choose a few that fit the footage, not to use many.

Remotion ignores everything here. It is the FCP finish only.

## Where it sits

After reconcile — the clips are captured, the action logs exist, the timing is known — and
before `timeline-to-fcpxml.mjs`. It ends at **GATE 4**: the user approves the look and
downloads anything not yet downloaded.

## Three rules

**1. Never export a placeholder.** mExtension lists its whole catalog in FCP, but an element
that was never downloaded is a stand-in that renders *"The file is missing, please
re-download the element"*. Only a downloaded element can be exported. The export refuses to
write a file that names a placeholder and prints the download list. You may still *choose* a
placeholder — see the catalog below — you just cannot export before the user downloads it.

**2. One look, few elements.** The product is the subject. One theme pack or one visual
family across the video; one element per role, repeated; 1–2 overlays in a section at most.
A demo dressed like a music video reads as hiding something.

**3. A template reference is not a finished title.** Naming a template puts it on the
timeline. It does not fill its media wells, fix a vendor default that is nearly black, clear
the field you did not use, or prove the text is readable over this footage. That work happens
in FCP, and the [binding checklist](#7-the-binding-checklist) is how you know it is done.

## 1. Inventory

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs                         # per kind: built-in, installed, placeholders
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --roles                 # downloaded templates per role
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --packs                  # MotionVFX theme packs and their parts
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --list --role callout    # names; --all adds placeholders
```

Roles come from names, so they are a shortlist, not a verdict: `lower-third`, `title`,
`intro`, `module`, `background`, `callout`, `cursor`, `frame`, `infographic`, `ui`, `text`,
`caption-style`, `transition`, `effect`. MotionVFX facts — codes, packs, collections, what
downloads contain: [motionvfx.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-graphics/references/motionvfx.md).

## 1b. The catalog beyond this Mac

A downloaded element has a thumbnail on disk. A placeholder has nothing, so it can only be
picked by its name — unless you ask MotionVFX. The public DesignStudio catalog needs no login
and covers everything: the real preview still, the real preview movie, the real length.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/motionvfx-catalog.mjs --search "cursor click" --kind titles \
  --limit 12 --out demo/out/graphics/cursors --sheet demo/out/graphics/cursors.png
node ${CLAUDE_PLUGIN_ROOT}/scripts/motionvfx-catalog.mjs --preview 6SMY,FB5S --out demo/out/graphics/picks
node ${CLAUDE_PLUGIN_ROOT}/scripts/motionvfx-catalog.mjs --collections    # what is nearly complete here
```

Each row says `downloaded`, `NOT downloaded` or `not in mExtension here`. Kinds are `titles`,
`generators`, `transitions`, `effects`. `--preview` also fetches the preview movie, so you can
judge entrance and exit, not one frozen frame. This is the only part of the plugin that uses
the network, and it sends nothing about this machine.

Use it when nothing downloaded fits a role, and to check a placeholder before asking the user
to spend one of their 500 daily downloads on it.

## 2. Decide what the demo needs

Read the storyboard and the timeline. Every slot has a trigger in them:

| Slot | Trigger in the demo | Role to shortlist | Storyboard field |
|---|---|---|---|
| Title card | a `titlecard` section | `title`, `intro` | `meta.fcp.titleTemplate`, per card `sections[].fcp.titleTemplate` |
| Card background | title cards need a ground | `background` | `meta.fcp.backgroundTemplate` |
| Lower third | `onScreenText` on a section | `lower-third` | `meta.fcp.lowerThirdTemplate`, `sections[].fcp.lowerThirdText` |
| Transition | every non-cut section edge | `transition` | `meta.fcp.transitionTemplate` |
| Click callout | a click the narration talks about, in `capture/<id>.actions.json` | `cursor`, `callout` | `sections[].fcp.overlays` with `at.action` |
| Point to a result | a result on screen the line names | `callout` | `sections[].fcp.overlays` with a position |
| Number or list | a figure or a list in the narration | `infographic`, `text` | `sections[].fcp.overlays` |
| Effect | rarely: a split or a light sweep | `effect` | `sections[].fcp.effects` |

Pick the look first. For a software product the tech packs fit (Next-Gen, New Technologies,
AI Development, Keynote); packs made for memories, weddings or youth do not. A pack gives a
title, a lower third, a transition and an intro that already match.

## 3. Shortlist, then look

Names narrow the catalog; pictures decide. For each slot, build a contact sheet of the
downloaded candidates and look at it next to a frame from the moment it will cover:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --sheet demo/out/graphics/lower-thirds.png --role lower-third
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --sheet demo/out/graphics/pack.png --pack Next-Gen
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --sheet demo/out/graphics/picks.png "Keynote Lower3rd FB5S" "Cursor Click 4G9Y"
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --inspect "Keynote Lower3rd FB5S"   # length, text layers, drop zones
```

A sheet holds up to 36 thumbnails; the legend numbers cells left to right, top to bottom.
Delegate the looking to the **`demo-graphics-scout`** subagent — dozens of images, one short
list of picks back.

What a good pick has:

- It matches the app: the palette does not fight the product's colours; text on it reads at
  1080p.
- It leaves the subject visible: a callout sits beside the thing the narration names, not on
  it; a lower third does not cover the UI the section is about.
- It belongs to the family: same pack, same type, same motion language as the other picks.
- Its length suits the slot (`--inspect`): a 6 s lower third in a 3 s window cuts its outro.
- It can go where the slot needs it: `--inspect` prints `position: yes` or `no`. A callout
  that must sit on a click needs `yes`.
- It has no drop zones, unless the user will fill them in FCP — empty ones show large grey
  "DROP ZONE" art.
- A title card on its own solid ground hides `backgroundTemplate` completely; set a background
  only under a card whose thumbnail is transparent.
- Its default colours survive this footage. Vendor defaults are made for a vendor's demo reel:
  measured here, one popular lower third ships nearly black text, and plain white titles vanish
  over a white document. Judge the still against a real frame, not against grey.

## 4. GATE 4 — the look and the downloads

Stop and show the user:

1. The look in one line (pack or family, and why it fits this product).
2. A table: slot, template name with code, sections where it appears, one-line reason.
3. The contact-sheet paths, so they can see the picks.
4. **The download list:** every pick that is still a placeholder. Only the user can download
   (Final Cut Pro → mExtension, search the 4-character code; 500 downloads a day). Say which
   picks you judged from the public catalog preview rather than from an installed thumbnail.
5. **What they will have to finish by hand** — drop zones, colours, a generator's text. Say it
   now, not after the export.

## 5. Write it into the storyboard

```json
"meta": {
  "fcp": {
    "titleTemplate": "Next-Gen Title 6SMY",
    "lowerThirdTemplate": "Next-Gen Lower3rd R1ED",
    "transitionTemplate": "Next-Gen Transition STAQ",
    "backgroundTemplate": "Gradient Flux I6P1"
  }
},
"sections": [
  { "id": "03-search", "surface": "web", "onScreenText": "Semantic search",
    "transitionIn": { "kind": "crossfade", "seconds": 0.83 },
    "fcp": {
      "lowerThirdText": ["Semantic search", "Finds by meaning"],
      "overlays": [
        { "template": "Cursor Click 4G9Y", "at": { "action": 2 }, "position": "action" },
        { "template": "Descriptive Callout U4TZ", "at": { "action": 3, "edge": "end" },
          "seconds": 2.5, "text": ["Ranked by meaning"], "position": [1480, 320] }
      ]
    } },
  { "id": "06-close", "surface": "titlecard",
    "fcp": { "titleTemplate": "Next-Gen Technology Intro HJKD", "backgroundTemplate": "none" } }
]
```

- **Names:** the full name with its code, as `fcp-templates.mjs` prints it. A name that is
  not on the Mac falls back (title, lower third, transition) or is skipped, with a note.
- **Per-section fields override `meta.fcp`**; `"none"` removes the global one for that section
  (a Cross Dissolve instead of the transition, no background on that card).
- **`text`** fills a title's text layers **in the order `--inspect` lists them** — the file
  order, measured in FCP, and often not the visual order: in `Keynote Lower3rd FB5S` entry 0
  is the small line and entry 1 the big one. A title card defaults to `[title, onScreenText]`,
  a lower third to `[onScreenText]`. `""` blanks a layer; the template's fonts stay.
- **Generators take no text** through FCPXML. A generator intro keeps its sample text until
  someone edits it in FCP; the export notes it. Prefer a title-kind intro when the text matters.
- **`at`**: seconds from the section's first frame; `{ "action": N }` for the moment action N
  started on the clip (`"edge": "end"` for when it finished); `{ "clip": s }` for a time on the
  clip. Clip times go through reconcile's fit, so they stay right after a retime.
- **`position`**: `[x, y]` in output pixels from the top left, an anchor (`top-right`, …), or
  `"action"` — where the pointer went for that action, from the action log. It moves the
  template's design centre there, so it is exact for elements designed at the centre (cursors,
  clicks, brackets, magnifiers) and an offset for the rest; leave lower thirds and titles where
  their designer put them. For MotionVFX templates the export sets their own position control,
  because moving the whole title would drag the footage along; a template without one
  (`--inspect`: `position: no`) is not moved.
- **`seconds`**: defaults to the template's own length, cut at the section end.
- **Transitions:** set `transitionIn.seconds` to the template's own length (`--inspect`) on the
  sections it plays into — reconcile owns the overlap. The export notes a big mismatch.

## 6. Probe, then export

**Import the probe before the film.** A file that validates against FCP's own DTD can still
import with warnings, or mean something other than the timeline meant — that is how the
"Anchored items were ignored" rule was found. The probe is ten seconds of real footage
carrying every template the storyboard names, with a sentinel (`FB5S#0`, `FB5S#1`) in every
text layer, built by the same exporter:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/reconcile.mjs --project .                 # resolves at / position into frames
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs --check --project .     # ready / placeholder / missing, per slot
node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline-to-fcpxml.mjs --project . --probe   # -> demo/out/probe.fcpxml
node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline-to-fcpxml.mjs --project .        # -> demo/out/demo.fcpxml
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-finish-manifest.mjs --project .       # what it is made of, what is left by hand
```

Import the probe into a throwaway library. **Treat any import warning as a failed test**, even
when the picture looks right. Then File → Export XML from that project and read it back: it
tells you which text layer each sentinel landed in and which parameters FCP kept. Only export
the film once the probe is clean.

Read every `note` the export prints. Then the user imports, finishes, and shares from FCP.

## 7. The binding checklist

Run this in FCP, per template family, before anyone calls the finish done. Each line is here
because it failed once.

- [ ] Every media well has real media in it. An empty one shows grey "DROP ZONE" art.
- [ ] Every text field has final copy, and fields you do not use are cleared — not left with
      the vendor's sample name.
- [ ] Colour and contrast checked **over real footage**, light frames and dark frames, not over
      a black canvas or the vendor preview.
- [ ] Judged over time: entrance, settled hold, exit. A 3-second title can have almost no
      readable hold once its animation is counted.
- [ ] Measured with the **longest** final copy, not the sentinel. Wrap long labels at a
      meaningful break and keep them inside the backing.
- [ ] A logo is the official file, unchanged, complete inside its mask for the whole hold.
      Sample it densely: a clipped wide mark reads as a reveal in a single frame.
- [ ] Nothing covers the thing the narration names at that moment.

## 8. Review the exported film

Review `demo/out/demo-fcp.mp4` with `demo-review`. Graphics add three checks: no *"The file
is missing"* text anywhere, no overlay covering what the narration names, and no more element
kinds than the story needs.

**A Remotion draft cannot approve this finish.** It does not render Motion templates. When the
storyboard says `"meta": { "authoritativeRenderer": "final-cut-pro" }`, the film under review is
the one exported from FCP, and nothing else closes the gate.

## What FCPXML cannot do

The export writes template, timing, text and position. It cannot:

- fill **drop zones** (`--inspect` lists them) — the user drags media in, in FCP;
- move a template that draws the footage under it but has **no position control**;
- change **published parameters** such as colours or fonts — the template's design stays;
- set text on a **generator**;
- make an overlay **follow a camera move** — `position: "action"` is where the pointer was on
  the unzoomed clip;
- set up elements that need **analysis inside FCP** (mTracker, mRotoAI).

Say which of these the user has to finish by hand, in the GATE 4 summary.

It also does not carry them **back**. A logo assigned to a media well in FCP does not survive
that project's own XML export, so the finished library — not the XML — is the editable
deliverable. Never re-import the XML over a hand-finished project: a re-export makes a new
project and every hand edit is lost. `fcp-finish-manifest.mjs` writes down what only exists in
the library, so the next person knows what the XML does not hold.

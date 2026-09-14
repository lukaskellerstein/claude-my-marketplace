# MotionVFX in Final Cut Pro

What the plugin relies on about MotionVFX, and where it comes from. The code side of these
facts lives in one file, `scripts/lib/motionvfx.mjs`; change both together.

## mExtension

MotionVFX's free FCP extension (`/Applications/motionVFX/Plugins/mExtension.app`, data in
`~/Movies/.mExtension`). Inside FCP it is a web view of motionvfx.com: the user browses
collections and elements and downloads them. There is no API and no readable catalog — its
own metadata is encrypted — so the plugin reads what mExtension writes into FCP's template
folders instead.

- Subscription: DesignStudio (motion design) and CineStudio. Downloads are capped at
  **500 elements a day**.
- Only a person can download. The plugin cannot, and must not try to drive mExtension.
- A failed download shows as `Server error!` in `~/Movies/.mExtension/logs/mExtension.log`
  and leaves the placeholder in place. The user retries it in mExtension.
- mExtension installs the fonts its elements use (licences in `~/Movies/.mExtension/Font Licenses`).

## On disk

```
~/Movies/Motion Templates.localized/
  Titles.localized/DesignStudio/Keynote Lower3rd FB5S/Keynote Lower3rd FB5S.moti   downloaded
  Titles.localized/DesignStudio/Follow Us V580/Follow Us V580.moti -> ../.mExt-Placeholders/Placeholder-192.moti
  Titles.localized/DesignStudio/.mExt-Placeholders/                                 the stand-ins
  Generators.localized/…  .motn     Transitions.localized/…  .motr     Effects.localized/…  .moef
  Titles.localized/mCaptions/<Group>/<Name CODE>/                                   caption styles
```

- **Placeholders.** The whole catalog is listed — about 10,800 elements on a subscribed Mac —
  but an element never downloaded is a symlink into `<Product>/.mExt-Placeholders/`. In a
  project it renders *"The file is missing, please re-download the element"*. FCP's browser
  shows it like any other title, which is why a name alone proves nothing.
- **Codes.** Names end in a 4-character code, unique across the catalog: `Keynote Lower3rd FB5S`.
  The code is what the user types into mExtension's search to download it. Codes can be
  letters only (`STAQ`).
- **A downloaded element folder** holds the template, `large.png` (640×360) and `small.png`
  thumbnails, an `.identity-<hash>` file, and sometimes a `Media/` folder. mCaptions styles
  also carry `<Name>.jpg` and a 5 s ProRes `<Name>.mov` preview.
- **Scene size.** DesignStudio templates are built at 3840×2160 or 5760×2160 and 24 fps; FCP
  fits the scene to the project by height, so a 5760-wide scene shows only its middle 3840.

## They draw the footage

Most elements (413 of 521 downloaded titles on the test Mac) contain a `Title Background`
layer: they draw the picture underneath into their own frame, to blur, magnify or clone it.
Consequences, all seen in FCP:

- Moving such a title with `adjust-transform` moves that copy of the footage too; the edge
  it leaves is black.
- Most of them (186) carry MotionVFX's **mOSC** plugin, whose published `Content Position`
  (`channel ./2/1/13`) moves only the element. Its value is a point normalized to the template
  scene, y up: `0.5 0.5` is the design position at frame centre; in a 5760×2160 scene `0.75
  0.75` lands at 87.5 % across, 25 % down in a 16:9 frame.
- The rest (236) have no such control — older designs rig position through a filter — and
  cannot be placed from FCPXML.
- The published key is `9999/<groups and layers above the object>/<object>/<channel>`; FCP
  keeps a key built that way and silently drops one that skips the top-level group.

`fcp-templates.mjs --inspect` reports which case a template is.

## DesignStudio collections

Two shapes of collection:

| Shape | Examples | What is in it |
|---|---|---|
| Theme pack | Next-Gen, New Technologies, AI Development, Keynote, Business Growth, Conference, Typography | `<Pack> Title`, `<Pack> Lower3rd`, five to seven `<Pack> Module`, `<Pack> Transition`, and one generator intro — a matched set |
| Element collection | mHowTo, mInfographics 2, mToolbar, mKeynote 2, mEdu | many single-purpose elements: cursors, clicks, callouts, UI mock-ups, charts, lists |

The collection an element came from is not on disk; mExtension keeps it in its encrypted
catalog. Packs are recognised by their shared name prefix (`fcp-templates.mjs --packs`).

What fits a software demo:

- **mHowTo** is made for screen tutorials: `Cursor Click`, `Cursor Move`, `Radial Click`,
  `Point Click`, `Magnifying Glass`, `Focus Brackets`, `Word Highlight`, UI mock-ups
  (`Search Bar`, `Pop-Up Menu`, `Switch`, `Slider`). The cursors overlap the plugin's own
  `cursor-overlay.js`; use one or the other in a section, not both.
- **mInfographics** and the pack **Modules**: charts, diagrams, timelines, step lists — for a
  number or a list the narration says out loud.
- **Tech theme packs** for titles, lower thirds, transitions and intros.
- **Backgrounds**: `Gradient Flux`, `Smooth Gradient`, `Grid` — full-frame titles, used here
  under title cards.
- **Drop-zone elements** (`Rounded Display`, `Monitor`, `Drop Zones …`) frame footage, but the
  footage has to be dropped in by hand in FCP.

What does not fit: packs themed for memorials, weddings, youth or travel; film looks
(`mFilmLook`) and glitch effects over UI, which cost legibility; `mTracker` and `mRotoAI`
templates, which need analysis inside FCP.

## Roles from names

`classify()` in `motionvfx.mjs` maps name keywords to roles, first match wins:

| Role | Keywords |
|---|---|
| `lower-third` | Lower3rd, Lower Third |
| `module` | `… Module` (pack parts) |
| `cursor` | Cursor, Click, Point Click, Radial Click, Pointer |
| `callout` | Callout, Arrow, Magnifying, Highlight, Focus Brackets, Selection, Speech/Thought Bubble, Badge, Tick |
| `background` | Gradient…, Grid, Flat, Curtain, Background, Backdrop |
| `frame` | Drop Zone, Placeholder, Avatar, Display, Monitor, Player, Footage |
| `infographic` | Chart, Diagram, Graph, Table, Percent, Timeline, Process, Pyramid, Counter, Progress, Steps |
| `ui` | Button, Slider, Switch, Search, Login, Pop-Up, Color, Icon, Playhead, Prompt |
| `title` | Title, Intro, Opener, Header, Slogan, Typography, Logo |
| `text` | everything else |

Generators are `intro` unless their name says background; transitions, effects and mCaptions
styles have their own roles. A wrong role costs a shortlist slot, never a wrong export — the
thumbnail is the check.

## Change watch

MotionVFX announced it is joining Apple. If mExtension, the placeholder mechanism, or the
folder layout changes, `fcp-templates.mjs` summary counts are the first thing to look wrong:
all placeholders and no downloads, or the reverse.

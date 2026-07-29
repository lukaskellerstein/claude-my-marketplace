---
name: demo-scripting
description: Turns a codebase into a demo narrative that has value — picks which capabilities earn screen time, structures them into beats, sets per-section durations, and writes the voiceover text at a speakable pace. Use at the scripting stage of a demo video, when writing or revising demo/storyboard.json, when the user asks what the demo should show, or when a demo feels like a feature tour instead of a story.
---

# Demo Scripting

A demo fails for one of two reasons: it shows the wrong things, or it shows the right
things in an order nobody cares about. Both are decided here, before a single frame is
recorded.

## Start from the decision, not the feature list

The viewer is making a decision — adopt this, approve this, upgrade to this, or use this
new capability. Write that decision down in `meta.audience` and let it eliminate material:
everything that does not move that decision is cut, no matter how much work it took to
build.

Three questions to answer before writing any section:

1. **What does the viewer do today instead?** That is your `problem` beat, and the source
   of every honest comparison.
2. **What is the one thing they should remember?** If you cannot name it, the demo has no
   spine and will read as a tour.
3. **What would make them say "wait, go back"?** That is your `wow` beat. A demo with no
   such moment is documentation.

If the user hasn't given you this, draft `demo/brief.md` from the codebase and confirm it.
Do not skip to the storyboard — a storyboard built on a guessed audience gets rewritten.

## Choosing what to show

The `demo-researcher` subagent returns a ranked capability inventory. Rank by
**demo value**, which is not the same as engineering effort:

| Rank high | Rank low |
|---|---|
| Solves a problem the audience has today | Technically impressive, no visible effect |
| Visible result within a few seconds | Requires setup the viewer must be told about |
| Hard or impossible in the alternative they use now | Table stakes every competitor has |
| Produces something the viewer would keep | Settings, admin, configuration |

Then cut to fit. A 90-second demo holds **3–5 substantive sections**. Six features shown
shallowly is worse than three shown convincingly.

Never show: unfinished flows, obviously fake data, anything in `brief.md`'s do-not-show
list, or a capability the recording will not actually demonstrate.

## Structure

Pick a beat template and adapt it — full templates with timings in
[beat-templates.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-scripting/references/beat-templates.md).

The default 90–120s shape:

```
hook        5-8s    the problem, or the outcome, stated concretely
problem     8-12s   what it costs today (optional if the hook carried it)
core-flow   12-18s  the main path, start to visible result
core-flow   12-18s  the second capability that matters
wow         10-15s  the moment that earns a reaction
integration 8-12s   how it fits what they already use (optional)
close       6-8s    what to do next
```

Rules that hold across templates:

- **Open on the problem or the outcome, never the product name.** "Month-end close takes
  most teams nine days" beats "Ledger is a modern accounting platform."
- **One idea per section.** If narration needs three "and"s, it is two sections.
- **Escalate.** Each section should be more interesting than the last. If your best
  material is section two, reorder.
- **Close with an action**, not a feature recap. The viewer already saw the features.

## Timing and pacing

Set `targetSeconds` per section, and make the narration fit it. The validator enforces this
on every write, so get it right the first time:

- **2.2–2.5 words per second** is natural narration pace. A 14-second section is ~32 words.
- Below 1.6 wps the picture outruns the voice; above 3.0 it is rushed. Outside 1.1–3.6 the
  validator errors.
- Section durations must sum to within 10% of `meta.targetSeconds` (25% is an error).
- Nothing over ~25 seconds. Split it.
- The reconciler adds ~0.85s of lead-in and tail per section. It is automatic, but it is
  why five 12s sections make a ~64s video, not 60s.

## Writing the narration

Full rules and rewrites in
[narration-style.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-scripting/references/narration-style.md).
The short version:

- **Never narrate the interaction.** The picture already shows the click. Say what it means:
  not "now I click Reconcile", but "the match runs on import, so the only rows left need a
  human decision".
- **Present tense, active, concrete.** Numbers and nouns from the actual domain.
- **No filler.** "As you can see", "simply", "powerful", "seamless", "revolutionize",
  "let's dive in" are rejected by the validator. Some are hard errors.
- **Write for muted playback too.** Captions are on by default; a line that only works with
  the picture will read as a non-sequitur in text.
- **Read it out loud at pace.** If you run out of breath, it is too long for the section.
- **Pronunciation:** product names, acronyms, and version numbers need a spelling note in
  `brief.md` for the voice stage.

## Writing the actions

Actions are intent, not code. Write what a person would do, in order, and let the capture
operator resolve targets from the accessibility snapshot.

```json
{ "kind": "type", "target": "Search box", "text": "auth flow diagrams", "wps": 6 },
{ "kind": "press", "key": "Enter" },
{ "kind": "waitFor", "target": "results list", "idleUpTo": 3.0 },
{ "kind": "hover", "target": "first result", "dwellBefore": 0.7 }
```

Two habits that make the capture usable:

- **Mark every wait with `idleUpTo`.** It caps the wait and tells the editor that range is
  compressible, which is how a 3-second spinner becomes a 1-second one in the cut.
- **Give the section a visible endpoint.** The last action should leave the result on
  screen — a section that cuts the instant a button is clicked has nothing to show.

And write `successCriteria` as something a person could check from a screenshot: "at least
5 matched rows visible, no spinner, no empty state". "Works correctly" is not gradeable.

## Anti-patterns

The failure modes that make a demo feel generic, and what to do instead:
[anti-patterns.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-scripting/references/anti-patterns.md).

## Revising an existing storyboard

Storyboard edits invalidate media. When revising, state exactly what the change costs:

- **Section ids are the join key.** Renaming or renumbering an id orphans its clip and
  audio. If order must change and media exists, rename the media files with the ids, or
  plan to re-capture.
- **Changing narration text invalidates that section's audio** — note which sections need
  regenerating (demo-voiceover).
- **Changing `targetSeconds` or `actions` invalidates that section's clip** — note which
  need re-capturing.
- Sections you leave untouched stay valid. Do not gratuitously rewrite sections the user
  did not ask about.

## Output

Write `demo/storyboard.json`. It is validated on write — read the errors, they are specific.
Then present at GATE 1: the section list with beats, durations, and the narration text, plus
the estimated ElevenLabs character count. Get approval before generating audio.

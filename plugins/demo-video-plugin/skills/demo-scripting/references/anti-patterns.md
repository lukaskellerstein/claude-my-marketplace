# Demo anti-patterns

The specific failures that make a demo feel generic, untrustworthy, or boring — and the fix.

## The feature tour

**Symptom:** one section per menu item, equal durations, no escalation. Narration is a list.

**Why it fails:** the viewer has no reason to care about item four. Nothing is at stake.

**Fix:** pick the one job the product does best and build the demo as that job start to
finish. Features appear because the job needs them, not because they exist.

## Narrating the cursor

**Symptom:** "now I click here", "let's navigate to the settings page", "I'll type a query".

**Why it fails:** it spends the only channel that can add information on describing the
channel that already shows it.

**Fix:** delete every sentence whose content is visible. If nothing is left, the section has
no point — cut it or find the stake.

## The empty app

**Symptom:** empty tables, "No results yet", placeholder avatars, `test@test.com`, one row
of data called "asdf".

**Why it fails:** it says nobody uses this. It is the single most common reason a demo of
good software looks bad.

**Fix:** seeding is a required stage, not a nicety. See `demo-app-prep`. Data should have
plausible volume, plausible names, and plausible magnitudes — and the numbers you narrate
must be the numbers on screen.

## The loading screen demo

**Symptom:** noticeable fractions of the video are spinners, skeletons, or blank states.

**Why it fails:** it reads as slow software even when the software is fast.

**Fix:** mark every wait `idleUpTo`, which lets the editor compress it. Warm caches during
rehearsal so the recorded take hits primed paths. If a genuine wait cannot be avoided,
narrate over it with something worth hearing — or cut to a `still` explaining what is
happening.

## The apology

**Symptom:** "ignore this error", "this is still a bit rough", "normally this is faster",
"pretend this says the right thing".

**Why it fails:** it draws attention to the flaw and tells the viewer the product is not
ready.

**Fix:** fix it, or cut the section. Never narrate around a visible defect. If the user
insists on shipping a demo containing one, say plainly which section is affected.

## The 4-minute demo

**Symptom:** total length over ~150 seconds with no chapters, because everything felt
important.

**Why it fails:** average watch time collapses. Nobody sees the close.

**Fix:** cut a capability instead of compressing every section. Two focused videos beat one
exhaustive one. If length is genuinely required, add chapter markers and titlecards so it is
navigable.

## The fake wow

**Symptom:** a `wow` beat that is a UI animation, a theme switch, or a chart that appears.

**Why it fails:** the viewer discounts polish. Motion is not a capability.

**Fix:** the wow must be work the viewer would otherwise do by hand — a derivation, an
automation across many items, a trace back to source, a result in a second that takes an
afternoon manually.

## The unmotivated tool

**Symptom:** the demo shows what the product does but never what the viewer does today.

**Why it fails:** without the alternative, "fast" and "automatic" have no scale.

**Fix:** one `problem` beat, ten seconds, naming the current process honestly. Everything
after it inherits that contrast for free.

## The vocabulary mismatch

**Symptom:** narration uses internal names — the service name, the model name, the ticket
vocabulary.

**Why it fails:** the audience does not have your glossary, and stops following.

**Fix:** use the words the audience uses for their own work. If a product term must be
introduced, define it once, in passing, in the sentence that first needs it.

## Robot capture

**Symptom:** instant cursor jumps, text appearing all at once, scrolls that teleport,
clicks with no pause, no visible pointer at all.

**Why it fails:** it looks like a test run, and viewers cannot follow what changed.

**Fix:** this is the capture stage's whole job — eased pointer motion, dwell before click,
per-character typing, eased scroll, and the synthetic cursor overlay. See
`demo-capture/references/cinematography.md`.

## The desync

**Symptom:** narration mentions something a beat before or after it appears.

**Why it fails:** it is the most noticeable defect in a finished demo, and it undermines
everything.

**Fix:** the audio-led pipeline prevents most of it. What remains comes from hand-edited
timelines and from re-recording a clip without re-reconciling. Always re-run reconcile after
re-capturing anything, and check A/V sync in the frame review.

## Over-produced

**Symptom:** logo sting, animated transitions between every section, background music
fighting the voice, kinetic-typography captions.

**Why it fails:** the viewer came to see the software. Production values that call attention
to themselves read as compensation.

**Fix:** cut or 0.4s crossfade, one lower-third per section, music at −22 dB ducked to −30,
plain captions. The default configuration is deliberately restrained; leave it that way
unless there is a brand reason not to.

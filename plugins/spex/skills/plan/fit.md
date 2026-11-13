# Fit: the note against the code

The run gets here right after the worktree, before any draft. The note was written at
new, before the earlier specs were built. So it is checked first against what they
really built, and against the code. Most times it fits.

## 1. Compare

Say `Fit: 1 analyst`, then start one `spex:analyst` with `<dir>. Fit.` It changes
nothing. It returns `misfits:`, one line for each name or fact of the note that the code
or a closed spec says otherwise, with the file and the line; or `fits`.

`fits`: say so in one line and go to `shape.md`. No agent sizes anything.

## 2. Size each misfit

The writer never judges its own change. Start one `spex:decider` with
`<dir>. Size each: <the misfit lines>`. For each one it returns `small` or `big`, and
why. It corrects nothing.

- **Big:** it touches a line of the person (a bullet under From your idea, a line marked
  `(you)`), the Success, "Not this", or the list of specs (a spec to add, drop or
  reorder).
- **Small:** everything else: a renamed type, a moved file, a value the code holds in
  another way.

## 3. Small: the code wins over a note

One `spex:analyst` for all the small ones, with `<dir>. Note: <the misfit>, small,
<the decider's reason>`, one line each. It follows the code, marks the line `(by agent)`
and writes why. The link of the line stays.

## 4. Big: the person decides

Stop with `❓ QUESTIONS`: one block of `reply.md` for each big misfit, all on one
screen.

- The heading names what the code has: `Does the button go on the shop Orders page, or
  on the admin one?`
- **Context:** the person's line, word for word, and what the code says, with the file.
- The options are the things the code offers. No option drops the line without saying
  so. The pick is the best one for their goal, with its reason.
- A misfit that changes the list of specs shows the new list on the same screen, each
  spec by its name: keep, change, drop, add.
- No NEXT block: the answer is the next step.

In auto mode the decider answers instead, with `<dir>. Answer: <the blocks>`. The digest
lists these answers first.

Then one `spex:analyst` with `<dir>. Note: <the misfit>, big, <the answer, word for
word>`. It writes the answer in place of the line, marked `(you)`; in auto mode `(by
agent)`. The old line stays visible in `source.md`: nobody edits that file.

## 5. Write each verdict down

The script writes `corrections.md`, never an agent. After each correction:

```
SPEX correction <dir> --title "plan · the note did not fit the code (small)"
  --found "<what the code says, file:line>" --was "<the old line>"
  --changed "<the new line>" --why "<the reason>" --closed
```

- A big one says `(big)` in the title and adds `--you-said "<the answer, word for
  word>"`. In auto mode it adds `--pick "<the decider's answer>"`, and its evidence and
  confidence go into `--why`.
- Never pass `--reaches`: the close of this spec writes it, when it gives the entry to
  the later notes.
- Hold the `C` ids and one line for each: the digest lists them under `The note did not
  fit the code:`.

## A second run

A corrected note fits, so `Fit.` returns `fits` for what was settled. A big misfit
that got no answer comes back, and you ask it again.

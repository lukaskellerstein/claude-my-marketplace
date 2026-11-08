---
name: ship
description: Ship a reviewed spex feature with no click — spex ship flips its approved records to built, retires the records it supersedes, commits when ship.commit says so and merges through ship.cmd (gh, glab, the forge API); then surface every answer given by default, and, for a step of a roadmap, route what it learned into the planned steps after it and re-plan the rest. Use when the user says "ship", "spex ship", "merge it", "close the feature", or when a NEXT block names /spex:ship. With --merged after a merge a person made.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Agent
---

# spex ship

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root.

## Steps

1. `SPEX gate ship <dir>`: every task done, verify green at this tree, a clean review.
   Refused: relay the `fix` text and stop.
2. When `spec.md` names a `roadmap`, do **The re-plan round** below now, before the
   commit, so the merge carries what this step learned.
3. `SPEX ship <dir>`, or `SPEX ship <dir> --merged` when the user said the branch is merged
   already. It closes the records (`approved` → `built`, the superseded ones → `retired`,
   in their own files), commits the tree when `ship.commit` is true (`"<feature>: <title>"`,
   the work dirs under `.spex/` left out), and runs `ship.cmd`: push, open the request,
   merge it. It is safe to rerun: a close that happened is skipped. Each other repo of
   `repos` the feature names goes first, with its own `ship`; this repo goes last, and a
   rerun skips the repos merged already.
   - `SHIP-CMD` (no `ship.cmd`): the close is done; a person merges the repos it names.
     Say so, with the branch, and that `/spex:ship <dir> --merged` finishes after the merge; stop.
   - `SHIP-BRANCH` (on `main`): nothing to merge; rerun with `--merged`.
   - `SHIP-FAILED`: read the tail. A failing check in the forge or a conflict is a cause to
     fix, not a question: fix it, rerun. A credential missing is a `needs`: name it, stop.
4. The answers given `by: default` and `by: agent` are in the output, each with its
   evidence: a person reads them now, because none gave them.
5. With `ship.commit: false`, say which files changed so the user can commit.
6. `SPEX report <dir> ship --status <done|concerns> --summary "…"`.

## The re-plan round

What this step learned must reach the steps that are not built yet, now, while it is
fresh. Nothing here rewrites a step that has started.

1. `SPEX show <dir> --lessons`: the concerns and questions of every run, the answers given by
   default or by the decider agent, the deferred findings, the blocks, the decisions, the
   superseded records.
2. `SPEX roadmap <name>` and `specs/<name>.roadmap.md`: the remaining steps and what each
   covers. Read the stubs that depend on this step, use a name it introduced, or name a
   section this step touched.
3. Route every item of step 1, and say where it went:
   - it changes a planned step: append one line to that stub's Open questions, sized, with
     the source last: `- ●●○ The runner keeps state in SQLite; plan the status command on
     it. ← 015 review`;
   - it changes live behavior: a `supersedes` record belongs in the step that will build
     it, so note it in that stub the same way;
   - a name this step introduced came out different, or not at all: fix the Uses lines of
     the stubs that name it, and this step's Introduces;
   - it changes how to work in this repo: it belongs in the repo's own docs, not in a spec;
     say so and leave it to the user;
   - it changes nothing ahead: drop it.
4. Propose changes to the remaining steps, each with its reason: split, merge, reorder, drop,
   add, or a new `depends_on`. Give the list, the lessons and the stubs to one
   `spex:decider`; it settles each change with its evidence. Edit the stubs' front matter
   and sections as it says, and note each change in the stub's Decisions with `(by agent)`.
   The user reads a stub when its turn comes. A new step is `SPEX new <slug> --planned
   --roadmap <name> --step <n> --depends-on <dirs> --source <file#section>`; a dropped one
   is `SPEX drop <dir> --reason "…"`. Move their coverage rows with them. "No change" is
   a fine verdict. Never ask the user.
5. `SPEX check` on every stub you touched and `SPEX roadmap <name> --coverage`; fix errors
   by their `fix` text.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 15 lines.
`✅ SHIPPED`, or `⏸ WAITING FOR YOU` while a person merges. Then the records built, the
records retired, and every default or agent answer — a person reads those now. For a
roadmap step: the items routed, by stub, and the re-plan changes made. NEXT names the next
planned step whose dependencies are built.

---
name: new
description: Shape a raw idea into a spec in rounds — size it (one step or a roadmap of planned steps), then every open question on one screen per round, each with a pick, until the user says done. The only way in; resumes a shaping spec, opens a planned step. With "auto" a decider answers and nobody is asked.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Agent, WebSearch, WebFetch
---

# spex new

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

The thinking phase: the user ends it, never you. `spec.md` is the spec in words.
`/spex:requirements` turns it into records, from a folder this skill approved.

## Inputs you read

- The user's text, pasted or a file. A big design stays where it is: read its outline and
  the sections you need, never copy it in.
- The repo's `README.md` or `CLAUDE.md`; `SPEX index` for the capabilities the idea touches
  (overlap with a live record is the first thing you say); the first line of every other
  `spec.md`, for a sibling idea.
- To resume, the argument is a folder: `SPEX gate new <dir>`. A `shaping` spec goes on from
  its open questions; a `planned` step opens once every `depends_on` folder is built, else
  the gate refuses: stop.

## Where you are

The first line of every reply, so a question is never taken for the plan or for other
work. Two words, never "planning":

- `SIZING <idea> · round 0 · one step or a roadmap?`
- `SHAPING specs/012-foo · step 1 of 13 · round 2 · open: 1 ●●● · 2 ●●○ · 0 ●○○`

The last line is the answer line. A round is its own reply; a side job gets its own.

## Round 0: restate, then size

1. Restate the idea in three sentences: what, for whom, why now. Name the one thing most
   unclear. The user confirms.
2. Size it. One step has one Success you can show, touches one or two scopes, fits `limits`
   and ships alone. More is a roadmap: steps as a list (number, slug, goal in one line,
   `depends_on`, design sections covered), thin path through the product first, depth
   after; every design section in a step or named as not planned, with the reason. The
   user edits the list.
3. One step: `SPEX new <slug> --shaping` prints `specs/NNN-slug`. A roadmap: one call per
   step, in order, `--roadmap <name> --step <n> --depends-on <dirs> --source <file#section>`,
   the first `--shaping`, the rest `--planned`, each stub with Why, What and Not this in
   three lines.
4. Write Why and What into `spec.md`. Every answer goes into the file in the round it
   arrives: the file is the memory. Round 1 is the next reply.

## A planned step, when its turn comes

After `SPEX gate new <dir>` read, in order: the stub; the sections its `source` names;
`SPEX show <dir> --inherited` (use its names); `SPEX index --scope`; its Open questions,
routed there by an earlier step's ship, each sized with a `←` source; those come first.

## Every round after that

One reply: every open question known so far, on one screen, nothing else. An answer opens
new holes; those join the next round.

1. Collect: the Open questions of `spec.md` and the holes the last answers opened. Order:
   goal, users, boundaries, constraints, success with a number. An alternative is two
   lines and the trade-off.
2. Research when a pick needs facts, never from memory: `Research: 3 questions → 3 agents`,
   one `spex:researcher` per question in one message, each told what its answer decides;
   one line per answer, source and confidence.
3. Ask: numbered, big first. Each: size mark, the question, one to three lines of context,
   `Pick:` what "ok" takes. `falls away if 2 is B` when one answer settles another; `new`
   on a hole the last round opened. At most 5; the rest one line each, `not asked yet`.
4. Last line: `answer by number · "ok" takes every pick · "done" approves the spec and ends
   shaping`.

Then update `spec.md`: answers under their sections, decisions under Decisions with reason
and source, open holes under Open questions, mark first; delete the `<!-- hint -->` of every
section you fill.

`●●●` does not work without it · `●●○` changes scope, cost or a decision · `●○○` wording.

## Auto mode

On with `auto` among the arguments (any position) or `auto: true` in `.spex/config.yaml`:
nobody is asked. Round 0 goes into the reply and on; the user can stop you. Then:

1. List every open question with its options and your recommendation. Never tell the
   decider that a question is the user's: there is none.
2. Facts first: one `spex:researcher` per question that needs facts, in parallel.
3. One `spex:decider` for the whole step: every question, the stub and the design sections
   it names, `SPEX show <dir> --inherited`, the code a question points at, the findings.
   Per question: answer, evidence, confidence, needs.
4. Every verdict → Decisions, with evidence, confidence and `(by agent)`, and one line each
   in the reply. A `needs` you can meet, or a new question → the same agent again. Then
   The end, steps 2 and 4, without "done": the user reads the decisions at `/spex:approve`.

## The end

"done" or "good enough" ends this step's shaping and approves the spec. The user says it,
never you. Then:

1. A question of the last round with no answer: say what "done" does, ask once: `"done"
   approves with 1 ●●○ open; "ok" takes my picks and ends, "done" again leaves it open.`
   A carried question becomes a question or an unknown in the next step.
2. Finish the file: every hint gone, Alternatives with the pick, Decisions with reasons.
   Plain words, real values, no code.
3. `SPEX approve specs/NNN-slug` flips `status: shaping` to `ready`. It refuses while a
   section is empty: fill it, run it again.
4. End with the path, the questions carried over, and `SPEX next specs/NNN-slug`.

## Reply

The end: 10 lines, then the NEXT block as `SPEX next` printed it, the two rules included,
never rewritten or shortened.

---
name: new
description: Shape a raw idea into a spec in rounds — size it (one step, or a roadmap where every design section has a step or a reason), then every open question on one screen per round, each with a pick, until the user says done. The only way in; resumes a shaping spec, opens a planned step. With "auto" a decider answers and nobody is asked.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Read(${CLAUDE_PLUGIN_ROOT}/skills/new/roadmap.md), Agent, WebSearch, WebFetch
---

# spex new

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root.

The thinking phase: the user ends it, never you. `spec.md` is the spec in words.
`/spex:requirements` turns it into records, from a folder this skill approved.

## Inputs you read

- The user's text, pasted or a file. A big design stays where it is: `SPEX outline <file>`
  lists its sections; read the ones you need, never copy it in.
- The repo's `README.md` or `CLAUDE.md`; `SPEX index` for the capabilities the idea touches
  (overlap with a live record is the first thing you say); the first line of every other
  `spec.md`; `SPEX roadmap`, for a roadmap of this idea that exists.
- To resume, the argument is a folder: `SPEX gate new <dir>`. A `shaping` spec goes on from
  its open questions; a `planned` step opens once every `depends_on` folder is built, else
  the gate refuses: stop.

## Every reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first). The banner names the
phase, never "planning":

- `**🔍 SIZING · <idea>**`, then `round 0 · one step or a roadmap?`
- `**💎 SHAPING · 029 Deploy One Push**`, then `spec 2 of 29 in roadmap nex-target ·
  question round 1` and the sizes, as `gate new` printed.

The answer line: `ok takes every pick · answer by number · done approves the spec and ends
shaping`. A round is its own reply; a side job gets its own.

## Round 0: restate, then size

1. Restate the idea in three sentences: what, for whom, why now. Name the one thing most
   unclear. The user confirms.
2. Size it. One step has one Success you can show, touches one or two scopes, fits `limits`
   and ships alone: `SPEX new <slug> --shaping` prints `specs/NNN-slug`. More is a roadmap,
   and so is a roadmap of this idea that exists: read
   `${CLAUDE_PLUGIN_ROOT}/skills/new/roadmap.md` and follow it.
3. Write Why and What into `spec.md`. Every answer goes into the file in the round it
   arrives: the file is the memory. Round 1 is the next reply.

## A planned step

`SPEX gate new <dir>` opens it and adds the missing sections. Then read, in order: the stub;
the sections its `source` names; `SPEX show <dir> --inherited` (use its names); `SPEX index
--scope`; its Open questions: the design's open items, and those an earlier step's ship
routed there, each sized with a `←` source; those come first. Check each Uses line against
the code; a missing name is a question.

## Every round after that

Round 1 drafts first: fill every section of `spec.md` from the design, the code and the
inherited steps, and draw the step under What as one Mermaid diagram (trigger, steps,
result). A question is only what the draft cannot settle, and names the line it changes.

1. Collect: the Open questions of `spec.md` and the holes the last answers opened. Order:
   goal, users, boundaries, constraints, success with a number.
2. Research when a pick needs facts, never from memory: `Research: 3 questions → 3 agents`,
   one `spex:researcher` per question in one message, each told what its answer decides;
   one line per answer, source and confidence.
3. Ask: one question block of `reply.md` each, big first. `falls away if 2 is B` when one
   answer settles another; `new` on a hole the last round opened. At most 5 blocks; the
   rest one line each, `not asked yet`.

Then update `spec.md`: answers under their sections, decisions under Decisions with reason
and source, open holes under Open questions, size mark first; delete the `<!-- hint -->`
of every section you fill. A step of a roadmap keeps Uses and Introduces true, names other
steps by folder, and writes a move of design scope as a Decision in both steps; `SPEX check
<dir>` tests the first two.

## Auto mode

On with `auto` among the arguments or `auto: true` in `.spex/config.yaml`:
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
   approves with 1 🟧 open; "ok" takes my picks and ends, "done" again leaves it open.`
   A carried question becomes a question or an unknown in the next step.
2. Finish the file: every hint gone, Alternatives with the pick, Decisions with reasons.
   Plain words, real values, no code but the one Mermaid diagram.
3. `SPEX approve specs/NNN-slug` flips `status: shaping` to `ready`. It refuses while a
   section is empty: fill it, run it again.
4. Reply `✅ SHAPED`: the path, the questions carried over, at most 10 lines.

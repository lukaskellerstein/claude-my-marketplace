---
name: clarify
description: Resolve the open questions of a spex spec, each with options and a recommended answer, and write the answers and the record changes back into requirements.yaml. Use when the user says "clarify", "spex clarify", "answer the spec questions", or when spex check reports REQ-QUESTION-OPEN. With "auto", or auto: true in .spex/config.yaml, a decider subagent answers every question (by: agent, with evidence and confidence) and nobody is asked; the user reads the answers at /spex:approve.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Agent
---

# spex clarify

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. `SPEX check <dir> --json`: the `REQ-QUESTION-OPEN` findings are the questions a person
   still owes. Then read `requirements.yaml` once for gaps the records leave open: scope,
   users and roles, data and its lifetime, interfaces, errors and rare cases, numbers
   (latency, size, limits), security and privacy, dependencies, out of scope, terms.
2. If the spec does not say *why* the feature exists, that is the first question.
3. Add at most 5 new questions per run, picked by impact × uncertainty. Ask only when the
   answer changes what gets built; otherwise write your call as an assumption in the record's
   `rationale` and move on. Each question: `ask`, `why` (one line), 2 to 5 `options` with one
   `recommended: true`. Nothing open and no gap you can name: change nothing, say so and go
   to step 7. Every question you add sends its approved records back to `draft`, and gate 1
   runs again.
4. Get the answers:
   - Conversation: ask the user one question at a time: the question, why it matters, the
     options, your recommendation. Wait for the answer before the next one.
   - Auto mode (`auto` or `--auto` among the arguments, in any position, or
     `.spex/config.yaml` has `auto: true`): nobody is asked. One `spex:researcher` per
     question that needs outside facts, in parallel; then one `spex:decider` for the file
     with every open question (the ones you added in step 3 too), the `spec:` document,
     `SPEX show <dir> --inherited` and the code a question points at. Never tell it that a
     question is the user's: there is none. Per question it returns answer, evidence,
     confidence, needs. Every verdict → `by: agent` with `evidence` and `confidence`.
     `needs` a file or a section, or a new question the verdicts or the facts raise → give
     it and ask the same agent again. The user reads the answers at `/spex:approve`.
5. Write each answer into `questions[]` (`answer`, `by: human | agent | default`, and
   `evidence` and `confidence` for an agent), then change the records the answer touches:
   text, scenarios, new records, retired assumptions.
   - A record that was `approved` goes back to `status: draft`; gate 1 runs again.
   - A record that is already on `main` is never edited (`SPEX check --base main` refuses it):
     write a new record with `relationships: [{type: supersedes, target: <old id>}]`.
   - Every new or changed record points at its source: `source: Q3`.
6. `SPEX check <dir>` until it has no error. Read the `fix` texts.
7. `SPEX report <dir> clarify --status <done|concerns> --summary "…"`, with one
   `--question` for anything a person still has to settle.

## Reply

At most 15 lines. `STATUS:` first. One line per question: id, the answer, who answered
(`human`, `agent` with the evidence, or `default`), and the records it changed. Last, the
output of `SPEX next <dir>`, as printed.

The NEXT block is copied as `SPEX next` printed it, the two rules included, never rewritten
into prose or shortened, and it does not count toward the line cap.

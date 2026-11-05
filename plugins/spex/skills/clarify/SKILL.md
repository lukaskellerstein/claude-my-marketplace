---
name: clarify
description: Resolve the open questions of a spex spec one at a time, each with options and a recommended answer, and write the answers and the record changes back into requirements.yaml. Use when the user says "clarify", "spex clarify", "answer the spec questions", or when spex check reports REQ-QUESTION-OPEN. With --auto (nobody to ask) it takes every recommended option and marks it by: default.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex clarify

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. `SPEX check <dir> --json`: the `REQ-QUESTION-OPEN` findings are the questions a person
   still owes. Then read `requirements.yaml` once for gaps the records leave open: scope,
   users and roles, data and its lifetime, interfaces, errors and rare cases, numbers
   (latency, size, limits), security and privacy, dependencies, out of scope, terms.
2. If the brief does not say *why* the feature exists, that is the first question.
3. Add at most 5 new questions per run, picked by impact × uncertainty. Ask only when the
   answer changes what gets built; otherwise write your call as an assumption in the record's
   `rationale` and move on. Each question: `ask`, `why` (one line), 2 to 5 `options` with one
   `recommended: true`.
4. Ask the user one question at a time: the question, why it matters, the options, your
   recommendation. Wait for the answer before the next one.
   With `--auto`, or when there is nobody to ask: take the recommended option and write
   `by: default`.
5. Write each answer into `questions[]` (`answer`, `by: human | default`), then change the
   records the answer touches: text, scenarios, new records, retired assumptions.
   - A record that was `approved` goes back to `status: draft`; gate 1 runs again.
   - A record that is already on `main` is never edited (`SPEX check --base main` refuses it):
     write a new record with `relationships: [{type: supersedes, target: <old id>}]`.
   - Every new or changed record points at its source: `source: Q3`.
6. `SPEX check <dir>` until it has no error. Read the `fix` texts.
7. `SPEX report <dir> clarify --status <done|concerns> --summary "…"`, with one
   `--question` for anything a person still has to settle.

## Reply

At most 15 lines. `STATUS:` first. One line per question: id, the answer, who answered
(`human` or `default`), and the records it changed.

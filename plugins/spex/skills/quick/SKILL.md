---
name: quick
description: The small-change path of spex — a bug or a change that touches one interface, needs no migration, fits in about three files and leaves no open question. Finds the root cause, writes a one-record spec folder marked quick, a regression test that fails first, and hands over to approve, tests and implement. Use when the user says "quick fix", "spex quick", "small change", "fix this bug with spex".
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex quick

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. Root cause first. Reproduce the bug (run the failing command or test) and read the code
   around it until you can say in one sentence why it happens. No fix without that sentence.
2. Check the three facts. The change touches one interface; it needs no data migration or
   other irreversible step; it fits in about three files; and nothing is left to ask. If any
   fact fails, say which one and point the user to `/spex:specify`. Stop there.
3. `SPEX new <slug>` (a short slug for the change). Write `requirements.yaml` with one record,
   two at most: for a bug an `unwanted-behavior` record (`If …, then the X shall …`) with
   `source: bug`, a scenario that holds the reproduction's real values, `status: draft`,
   and `goal` in one sentence. Declare the interface.
4. Write `tasks.yaml` with `quick: {reason: "<the one sentence from step 1>"}`, an
   `approach` of two or three lines, and one task (two at most): `paths` (the files, under
   three), `context`, `instructions` with the root cause and the fix, `done_when`,
   `status: todo`.
5. `SPEX check <dir>`. `TASK-QUICK` means a fact failed after all: go back to step 2.
6. Gate 1 still applies. Ask the user to approve (one yes/no question, the record shown).
   On yes run `SPEX approve <dir>`. With nobody to ask, stop with the folder and the record
   in the reply; a policy may approve it.
7. After approval continue as `/spex:tests` for the task (the regression test must fail
   first), then `/spex:implement`. Do not skip the red run.
8. `SPEX report <dir> quick --status <done|concerns|blocked> --summary "…"`.

## Reply

At most 15 lines. `STATUS:` first, the root cause in one sentence, the folder, the record,
and the next step.

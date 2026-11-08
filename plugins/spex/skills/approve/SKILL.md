---
name: approve
description: A person's approval, as a skill — runs spex approve <dir> [stage] at once for the stage that waits (the spec, the draft records with their proof plan, tasks.yaml, or tests.yaml alone), with no question, because typing the command is the approval. Then says what was approved, in a short digest with the file path, and prints what is next. Use when the user says "approve", "spex approve", "approve the spec", "approve the records", "approve the tasks", "approve the tests", or when a NEXT block names /spex:approve.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md)
---

# spex approve

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root.

The approval is the person's, and typing this command is it. Ask nothing. Run the command,
say what it approved, and stop. No other skill runs this command: it is the person's hand.

## Steps

1. Resolve the folder: the argument, or the one folder under `specs/` the user named in this
   chat. The stage is the second argument when the user gave one (`tasks` or `tests`).
2. `SPEX approve <dir> [stage] --json`. It approves the first stage that waits: the spec
   (`shaping` → `ready`), the draft records (gate 1, which stamps `tests.yaml` too),
   `tasks.yaml` (stamps `tests.yaml` too), or `tests.yaml` alone, as `approvals` in
   `.spex/config.yaml` says. On a refusal (an open question, a check error) relay the
   findings by their `fix` text and stop. Fix nothing yourself. When nothing waits, say so
   and print the NEXT block.
3. Say what was approved, cut short, with the file path, so the person can read it now:
   - the spec: `<dir>/spec.md`, its Why in one line, the decisions marked `(by agent)` with
     their confidence, the open questions carried over.
   - the records: `<dir>/requirements.yaml`, the count, every question answered
     `by: agent` (with its confidence and evidence) or `by: default`: no person gave those;
     and `<dir>/tests.yaml`, one line per test (`TS01 script · REQ-007-001/AC-1 · <name>`),
     each session with its `why`, every `needs` and `touches`.
   - the tasks: `<dir>/tasks.yaml`, the approach in one line, `T01 kind — title` per task,
     the `deferred` list when there is one; and the task tests added to `tests.yaml`.
   - the tests: `<dir>/tests.yaml` as above, for what changed since the last stamp.
4. Do not commit. Say which file changed.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 12 lines.
`✅ APPROVED`, or `⛔ NOT STARTED` with the `fix` text under What. Then the digest of step 3.

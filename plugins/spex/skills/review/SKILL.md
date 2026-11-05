---
name: review
description: Review a finished spex feature from its diff, read only — a spec verdict per requirement (met, partial, missing, contradicts, cannot-verify, plus unrequested changes) and a quality verdict with blocking findings only — and route each finding into a fix task, a question, a test fix or the deferred list. Use when the user says "review", "spex review", "verify the feature", or after the last task is done.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex review

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. `SPEX gate review <dir>`; if refused, report which tasks are not done and stop.
2. `SPEX show <dir> --review`. It writes the diff to `.spex/review/<feature>-<n>.diff` and
   prints the requirements, the tasks, the boundaries and the deferred list. If it refuses
   with `REVIEW-DIFF-BIG`, review per task: `SPEX show <dir> --review --task T01`, one task
   at a time. Read the diff file. Do not explore the codebase and do not rerun the tests:
   `spex run` already did, and the evidence is in `.spex/evidence/`.
3. Spec verdict, one line per requirement: `met`, `partial`, `missing`, `contradicts`, or
   `cannot-verify` when the diff cannot show it. Then list `unrequested` changes: code no
   requirement asked for. The implementer's report is a claim, not evidence; only the diff
   and the evidence count.
4. Quality verdict: blocking findings only — a bug, a security hole, data loss, a broken
   boundary, a signature that differs from `produces`. Style is not blocking.
5. Route every finding. Append only; never rewrite or reorder what exists.
   - `patch`: append a task to `tasks.yaml` with `kind: fix`, `source: "<finding>"`, the
     requirement ids, `paths`, `context`, `instructions`, `done_when`, `status: todo`.
   - `spec-gap`: the records do not cover a case. Append a question to `questions[]` with
     options and a recommendation; `clarify` owns the change.
   - `test-bug`: a test asserts the wrong thing. Name the scenario (`REQ-…/AC-n`) and what is
     wrong, for `/spex:tests --fix`. Do not edit the test.
   - `defer`: ask the user; only on a yes append to `deferred[]` (`finding`, `why`, `by`).
   If nothing is found, `tasks.yaml` stays byte for byte the same.
6. `SPEX check <dir>`; fix errors by their `fix` text.
7. `SPEX report <dir> review --status <done|concerns> --summary "…"`, one `--concern` per
   finding, one `--question` per spec gap. `done` means clean; `concerns` means findings
   were routed. The round count is on the first line of the show output; past
   `review_rounds`, stop and hand the feature to a person.

## Reply

At most 15 lines. `STATUS:` first. Then the spec verdict (one line per requirement), the
unrequested changes, the blocking findings with their route, and the deferred items.

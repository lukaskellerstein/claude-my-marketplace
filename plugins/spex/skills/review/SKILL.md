---
name: review
description: Review a verified spex feature from its diff, read only, for what no test sees — unrequested changes, a broken boundary, a signature that differs from produces, a bug or a hole the tests missed — and route each finding into a fix task, a question, a test rewritten by a test-developer subagent, or the deferred list. The script already proved the tests; the reviewer never reruns them. Use when the user says "review", "spex review", or after /spex:verify is green.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Agent, Read(${CLAUDE_PLUGIN_ROOT}/skills/*/SKILL.md)
---

# spex review

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. `SPEX gate review <dir>`; refused: relay the `fix` text (a task left, or no green
   `spex verify` at this tree) and stop.
2. `SPEX show <dir> --review`. It writes the diff to `.spex/review/<feature>-<n>.diff` and
   prints the evidence line (which verify round proved the tests), the requirements, the
   tasks, the boundaries and the deferred list. If it refuses with `REVIEW-DIFF-BIG`, review
   per task: `SPEX show <dir> --review --task T01`, one task at a time. Read the diff file.
   Do not explore the codebase and do not rerun the tests: the script proved them, and the
   evidence is in `.spex/evidence/`.
   **More than three tasks:** say `Review: 6 tasks → 6 agents`, then start one
   `spex:reviewer` subagent per task, all in one message, each with one line:
   `<dir> <task>. Review its slice.` Each returns its spec verdict, unrequested changes and
   blocking findings with file and line. Treat them as claims: open the diff at every
   blocking finding before you route it. The quality verdict over the whole diff (step 4)
   stays yours, because duplication and coherence live between the slices.
3. Spec verdict, one line per requirement. A requirement whose tests are green is `met` by
   the evidence; read the diff for `cannot-verify` ones (no test can see them) and for
   `contradicts` (the code does other or more than the record). Then list `unrequested`
   changes: code no requirement asked for. The developer's report is a claim, not evidence.
4. Quality verdict: blocking findings only — a bug, a security hole, data loss, a broken
   boundary, a signature that differs from `produces`. Style is not blocking.
5. Route every finding. Append only; never rewrite or reorder what exists.
   - `patch`: append a task to `tasks.yaml` with `kind: fix`, `source: "<finding>"`, the
     requirement ids, `paths`, `context`, `instructions`, `done_when`, `status: todo`. Its
     proof: when the finding is a missed case of a record, append the task id to the
     `covers` of that record's tests in `tests.yaml`; a finding no test sees gets one
     `spex:test-analyst` with `<dir> <task id>: <finding>`, which plans one.
   - `spec-gap`: the records do not cover a case. Append a question to `questions[]` with
     options and a recommendation, then settle it here the way `/spex:clarify` does in auto
     mode: read `${CLAUDE_PLUGIN_ROOT}/skills/clarify/SKILL.md` and do its steps 4 to 7
     with the decider. The record change it makes sets the record back to `draft`.
   - `test-bug`: a green test asserts other than its claim, and the code was written to it.
     Say `Fix test: TSxx → 1 test developer` and start one `spex:test-developer` with
     `<dir> TSxx: <what is wrong>`; it rewrites that one test from its plan record, never
     reads the source, and proves it. Then `SPEX run <dir> --test TSxx`: red means the code
     met the wrong test, so route a `patch` with the finding as `source`; green means the
     code meets the claim already. Never edit the test yourself.
   - `defer`: never ask the user. One `spex:decider` gets the finding, the records it
     touches and the feature's Why; on its verdict to defer, append to `deferred[]`
     (`finding`, `why`, `by: agent`), else route it as `patch`.
   If nothing is found, `tasks.yaml` stays byte for byte the same.
6. `SPEX check <dir>`; fix errors by their `fix` text.
7. `SPEX report <dir> review --status <done|concerns> --summary "…"`, one `--concern` per
   finding, one `--question` per spec gap. `done` means clean: ship is next. `concerns`
   means findings were routed, and the NEXT block names the stage that takes them. The
   round count is on the first line of the show output; past `review_rounds`, stop and
   hand the feature to a person.

## Reply

At most 15 lines. `STATUS:` first. Then the spec verdict (one line per requirement), the
unrequested changes, the blocking findings with their route, and the deferred items. Last,
the output of `SPEX next <dir>`, as printed.

The NEXT block is copied as `SPEX next` printed it, the two rules included, never rewritten
into prose or shortened, and it does not count toward the line cap.

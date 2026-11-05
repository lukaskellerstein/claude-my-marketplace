---
name: implement
description: Implement one spex task — make its acceptance tests pass inside its write allowlist, with a fresh spex run as the only proof and spex done as the only completion. Use when the user says "implement T01", "spex implement", "build the next task", or after the tests for a task are red.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex implement

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. Task id: the argument, or `SPEX next <dir>`. Then `SPEX gate implement <dir> <task>`.
   The gate runs the task's acceptance tests itself and needs them to fail. If it is refused
   (a dependency not done, a scenario without a test, tests that already pass), report
   `STATUS: blocked` with the findings and stop. Do not work around a gate.
2. `SPEX show <dir> <task>`. That is your spec: the task, its requirement records and
   scenarios, the boundaries, the decisions, the design slice, the composed verify commands.
   Then read the files under `context`, and only those. Nothing else from `specs/` by
   default. When you need more, pull it by id — `SPEX show <dir> REQ-007-003`,
   `SPEX show <dir> --design`, `SPEX show <dir> --decisions` — and remember each pull for
   the report.
3. Track your steps: list them before you start, tick them as you go.
4. Write only inside `paths`. Never touch a `protected` path or an acceptance test. If an
   acceptance test looks wrong, do not fix it: report `STATUS: blocked` with
   `--concern "REQ-…/AC-n: <the exact assertion> expects …, the record says …"` and stop.
5. Red first. Run the task's acceptance tests and your own unit tests before the code; they
   fail. Write the smallest code that makes them pass. The acceptance tests are the outer
   loop; your unit tests under `paths` are the inner loop.
6. Use the names and values the plan gives (`instructions`, `produces`, `consumes`) exactly.
   A different name breaks the task that comes after you.
7. If the task cannot fit in `paths` and `limits`: say how to split it, report
   `STATUS: too-big`, and stop. Never do half of a task.
8. `SPEX run <dir> <task>` is your loop. Read the tail of the first failing command, fix,
   run again.
9. `SPEX done <dir> <task>`. It runs every verify command again by itself and flips the
   status only when they pass at that moment. Nothing under `.spex/` counts as proof, and
   the status is never edited by hand.
10. `SPEX report <dir> implement <task> --status done --summary "…" --file <path>…
    --pulled <id>…`, with `--concern` for anything the reviewer should look at.

## Reply

At most 15 lines. `STATUS:` first, then what changed (files), the verify result, the pulls,
and the concerns.

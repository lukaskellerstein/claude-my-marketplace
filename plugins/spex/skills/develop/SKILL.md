---
name: develop
description: Build spex tasks — one task here, or, given only the spec folder, every ready task through fresh developer subagents, wave by wave, with spex done (the task's own tests green) as the only completion. A wrong test is judged by a decider and rewritten by a test-developer subagent, never by the developer or the user. Use when the user says "develop T01", "spex develop", "implement", "build everything", or when a NEXT block names /spex:develop.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/SKILL.md), Agent
---

# spex develop

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root.

Arguments: `<dir> <task>` builds one task here. `<dir>` alone orchestrates every ready task
through subagents until none is ready.

## One task, here

1. A `blocked` task: a person read its reason and named it, so `SPEX unblock <dir> <task>`
   first. A block with `--ask`: this run is the yes. Then `SPEX gate develop <dir> <task>`
   (tests exist, `needs` met, tests red). Refused: reply `⛔ NOT STARTED` and stop. Never
   work around a gate.
2. `SPEX show <dir> <task>` is your spec: the task, its tests, records, boundaries,
   decisions and design slice. Read the files under `context`, and only
   those. Pull more by id (`SPEX show <dir> REQ-…`, `--design`, `--decisions`), named in
   the report.
3. Write only inside `paths`, as the slice prints them. Never a `protected` path, never a test folder, never
   `tests.yaml`. A test that asserts other than its claim: do not fix it or code around it;
   do **A wrong test** below, then step 7.
4. Red first: the tests fail before the code. Write the smallest code that makes them pass,
   with the names and values the plan gives (`instructions`, `produces`, `consumes`).
5. Too big for `paths` and `limits`: say how to split it, reply `✂️ TOO BIG`, stop. Never
   half a task. A write to a real system no test's `touches` covers (money, no undo): do
   the rest, `SPEX block <dir> <task> --reason "…" --ask "<yes/no question>"`, stop.
6. `SPEX run <dir> <task>` is your loop: read the tail of the first failing command, fix,
   run again.
7. `SPEX done <dir> <task>`. It runs the task's tests and `fast_checks` itself and flips
   the status only on a pass now. Nothing under `.spex/` is proof; never edit the status.
8. `SPEX report <dir> develop <task> --status done --summary "…" --file <path>…
   --pulled <id>…`, `--concern` for the reviewer.

## Orchestrate

Your context holds the task list and results, never the code.

1. `SPEX next <dir> --all`. The `ready:` line lists the waves: tasks joined with `+` write
   different files and run together; the others one by one.
   If the stage is not `develop`, print the block and stop.
2. For one wave, start one `spex:developer` subagent per task, all in one message, and say
   so in one line first: `Develop: T03 + T04 → 2 agents`. The brief is one line:
   `<dir> <task>. Build it; the orchestrator runs spex done.` Nothing else: it reads its
   spec with `spex show`.
3. When they return: for each `STATUS: done`, `SPEX done <dir> <task>`. A fail means not
   done, whatever the report said: `SPEX block <dir> <task> --reason "<failing command>"`.
   For `test-bug`, do **A wrong test**. For `blocked` or `too-big`, `SPEX block` with the
   subagent's reason, and its `ask:` line as `--ask`. One exception, `blocked` by
   `RUN-GREEN` at the gate: one `spex:decider` says whether the code already does what the
   task's claims say. Yes: `SPEX done <dir> <task>`. No: **A wrong test** from its step 2.
   Never ask the user.
4. Back to step 1 until `next` says no task is ready. A blocked task stops only itself.
5. `SPEX report <dir> develop --status <done|concerns> --summary "…"`, one `--concern`
   per blocked task.

## A wrong test

The tests are the process's own work, so the process fixes them: never the developer, who
could bend a test to the code, and never the user. The claim is `TSnn: <file>:<line>
<assertion> expects …, the record (or done_when) says …`.

1. One `spex:decider`, one question: `Q1 — TSnn: is the test, the code or the spec wrong?
   A the test, B the code, C the spec. Read SPEX show <dir> <task>, the test at
   <file>:<line>, the claim, the code under <paths>. The claim decides: a test that asserts
   other or more than its claim is wrong; a test the claim supports is right.`
2. A: say `Fix test: TSnn → 1 test developer`, then start one `spex:test-developer` with
   `<dir> TSnn: <the claim>`. It rewrites that one test from its plan record and proves it;
   `blocked` means the record is wrong: one `spex:test-analyst` with `<dir> TSnn: <why>`,
   then the test developer again. Then: orchestrating, `SPEX done <dir> <task>`; a fail
   means the code is not finished, so a fresh developer takes the task again as a wave of
   one. Here, go on with your loop.
3. B: the test is right. Orchestrating, a fresh developer takes the task again with the
   verdict in its brief: `<dir> <task>. TSnn is right: <evidence>. Make it pass.` Here,
   make it pass yourself.
4. C: a spec gap. Route it as `/spex:review` step 5 does (read its SKILL.md), then `SPEX
   block <dir> <task> --reason "<claim and verdict>"` until the record is approved again.
5. One round per task. A second `test-bug` on the same task: `SPEX block <dir> <task>
   --reason "<the claim and both verdicts>"`. A person reads it, fixes the cause and runs
   `/spex:develop <dir> <task>`, which unblocks first.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first). Banner: `✅ IMPLEMENTED ·
<task> · <title>`, `✅ 3 of 4` when orchestrating, or `✂️ TOO BIG`. Many: `T03 ✅ T05 ⏸`.

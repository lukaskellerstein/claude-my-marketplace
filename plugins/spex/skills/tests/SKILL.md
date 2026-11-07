---
name: tests
description: Write the test code the proof plan (tests.yaml) asks for — every script test without a file, batch after batch, through test-developer subagents that never read the source and prove each test red with spex run --test --expect fail — before any code exists. Use when the user says "tests", "spex tests", "write the tests", "tests TS03", or when a NEXT block names /spex:tests.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Agent
---

# spex tests

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

The plan is in `tests.yaml` (the test analyst's); this skill turns its script tests into
files. One run covers every script test without a file, one batch at a time: a batch is the
tests in plan order, up to `limits.tests_scenarios` (12 by default). Session tests have no
file: a tester performs them at `/spex:verify`. Shell tests have no file: their steps run.
Your context holds the batch and the results, never a test body: the test developers write.

## Steps

1. `SPEX gate tests <dir> [TS…]`, with the ids the user gave or none for the batch. Refused:
   report its `fix` text and stop. Its `tests:` line names the batch; an empty one means
   every script has its file: go to step 6.
2. `SPEX show <dir> --tests <ids…>` once, to group the batch: tests that name the same
   `file` go to one developer; the rest by driver, two or three per developer.
3. Say `Write: TS01 TS02 → 1 developer, TS03 → 1 developer`, then start one
   `spex:test-developer` per group, all in one message. The brief is one line:
   `<dir> TS01 TS02. Write them; the orchestrator checks.` Nothing else: the subagent reads
   its brief with `spex show`.
4. When they return: `SPEX check <dir>` and `SPEX coverage <dir>`. Every test of the batch
   must be `ok` under `## files`. Then one `SPEX run <dir> --test <TS> --expect fail` per
   test: each must print `red as expected`.
   - `RUN-GREEN`: the test passes before the code exists. With a `mutation` proof in the
     developer's report the record is met already: keep the test and report
     `--concern "<TS> already green: <evidence>"`; `/spex:develop` closes that task.
     Without one it asserts nothing new: a fresh developer takes that one test again with
     the finding in its brief.
   - `RUN-SKIPPED` or `RUN-NO-TESTS`: a fresh developer with the finding; a test that skips
     is neither red nor green.
   - `STATUS: blocked` from a developer: its `why` names a step no script can do, or a
     value no interface gives. That is the plan's fault, not the developer's: start one
     `spex:test-analyst` with `<dir> <TS>: <why>`; it rewrites that record (a session, a
     `needs`, another value). Then step 3 for that test, once.
5. `SPEX next <dir>`. While its stage is still `tests`, go back to step 1 for the next batch.
   The run ends when the stage changes, so the NEXT block never names this skill again.
6. `SPEX report <dir> tests --status <done|concerns|blocked> --summary "…"`, with the test
   ids of every batch in the summary.

Never ask the user. A call these steps do not cover goes to one `spex:decider`: the
question, the options, your pick, and the files that decide it. Take its verdict, write it
as a `--concern` in the report, and go on. You never write or edit a test yourself, and
never `tests.yaml`: the wall between the claim, its plan and its code holds here too.

## Reply

At most 15 lines. `STATUS:` first, then one line per batch: the tests, their files, each
red run's result, and the records the analyst rewrote. Last, the output of `SPEX next
<dir>`, as printed.

The NEXT block is copied as `SPEX next` printed it, the two rules included, never rewritten
into prose or shortened, and it does not count toward the line cap.

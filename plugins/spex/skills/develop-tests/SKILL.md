---
name: develop-tests
description: Write the test code the proof plan (tests.yaml) asks for — every script test without a file, batch after batch, through test-developer subagents that never read the source and prove each test red with spex run --test --expect fail — before any code exists. Use when the user says "develop tests", "spex develop-tests", "write the tests", "develop-tests TS03", or when a NEXT block names /spex:develop-tests.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Agent
---

# spex develop-tests

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root.

The plan is in `tests.yaml` (the test analyst's); this skill turns its script tests into
files. One run covers every script test without a file, one batch at a time: a batch is the
tests in plan order, up to `limits.tests_scenarios` (12 by default). Session tests have no
file: a tester performs them at `/spex:run-tests`. Shell tests have no file: their steps run.
Your context holds the batch and the results, never a test body: the test developers write.

## Steps

1. `SPEX gate tests <dir> [TS…]`, with the ids the user gave or none for the batch. Refused:
   `SPEX coverage <dir>` once, for the tests already written, then the Reply with
   `⛔ NOT STARTED`, and stop. Its `tests:` line names the batch; an empty one means
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

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 15 lines.
`✅ TESTS WRITTEN`, `⏸ WAITING FOR YOU` (blocked) or `⛔ NOT STARTED` (refused). Then this
table in a code block. A row with no test is left out; consecutive ids are a range
(`TS01–TS09`), with the count after it.

```
red as expected  TS01–TS09, TS11, TS12 (11)  test_001_training_job.py, test_001_evaluations_api.py
already green    TS10  mutation proof: <evidence>; kept as a concern
not red          TS05  RUN-SKIPPED: <finding>; a fresh developer took it again
rewritten        TS07  by the test analyst: <why>
not written      TS13–TS22 (10)  <the next batch | what the gate said>
why              <refused or blocked only: one line per finding code, what it saw>
choose           <refused or blocked only: A) the first fix text, your pick  B) the next one>
```

`why` says what is wrong in plain words; `choose` lists each distinct `fix` text once,
lettered, so the user answers with one letter. Last, the output of `SPEX next <dir>`, as
printed.

The NEXT block is copied as `SPEX next` printed it, the two rules included, never rewritten
into prose or shortened, and it does not count toward the line cap.

---
name: tests
description: Write the acceptance tests for a batch of spex tasks before their code exists — one test per scenario, the requirement id in the test name — and prove each task's tests fail with spex run --expect fail. Use when the user says "tests", "tests T01 T02", "spex tests", "write the acceptance tests", or with --fix REQ-007-002/AC-1 to rewrite one wrong test. It never reads the source folders.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex tests

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

One run covers a batch of tasks, not one task: the tasks in plan order that still have no
test, up to `limits.tests_scenarios` scenarios (12 by default). That keeps the run small and
the number of fresh agents low.

## Steps

1. `SPEX show <dir> --tests` with the task ids the user gave, or with none to get the batch
   the script picks. The first line names the tasks. If it says every task has its tests,
   stop. Then `SPEX gate tests <dir> <ids…>`; if it is refused, report why and stop.
2. The show output is your input: the records and scenarios, the feature goal, the expected
   test names, the names and values from each task's plan, the contracts, the glossary, the
   existing acceptance test files, and the tests to retire.
3. Read one or two existing acceptance tests for the conventions, and the contracts it
   listed. Never read the source folders (`source_dirs` in `specs/spex.yaml`): the tests
   describe the interface, not the implementation.
4. Write the tests under `acceptance_dir`, in the repo's test framework:
   - One test per scenario, at least. Its name carries the ids exactly as printed:
     `REQ_007_002_AC_1_refuses_overwrite`. `spex coverage` finds it by that name.
   - Use the scenario's real values and the names from the plan, nothing invented.
   - Shape by EARS type. Event-driven: cause the trigger, observe the response. Unwanted
     behavior: cause the failure, assert the handling and that nothing else happened.
     Optional feature: run with the feature on and off. State-driven: set up the state, then
     act. `method: property-test`: a property over generated inputs. `measure`: assert the
     number with its operator and unit.
   - Retire every test the output listed under "tests to retire": its record is superseded.
5. One red run per task in the batch: `SPEX run <dir> <task> --expect fail`. Each must print
   `ok: … red as expected`.
   - `RUN-GREEN`: a test passes before the feature exists. It asserts nothing new. Fix it.
   - `RUN-NO-TESTS`: the run crashed or never collected the tests. Fix the import, the file
     name or the runner pattern until the ids appear in the output.
   The implement gate runs this same check again by itself, so a test that turns green
   before its task starts is caught there too.
6. With `--fix REQ-x/AC-n` (from a review `test-bug` finding or an implementer's concern):
   rewrite that one test only, then step 5 for its task.
7. `SPEX report <dir> tests --status <done|concerns|blocked> --summary "…"`, with the task
   ids in the summary.

## Reply

At most 15 lines. `STATUS:` first, then the tasks covered, the test file(s), one line per
test name, and each red run's result.

# Write the tests

The run gets here first, and again each time the plan got a new or a changed test: every
script test has its file, and is proved red before any code changes.

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`. A session test has no file: a tester
performs it in prove.md. A shell test has no file: its steps run. You never write or edit
a test, and never `tests.yaml`. Your context holds the batch and the results, never a test
body. The wall holds: a test developer writes from the plan record, and never reads the
source.

1. `SPEX gate tests <dir>`. Its line names the batch: the script tests with no file, in
   plan order, up to `limits.tests_scenarios` (12). After a correction, give it the ids
   of the tests that were planned again: `SPEX gate tests <dir> TS04 TS11`. Their files
   exist, and they are written again. `nothing to write`: this part is done. Refused:
   do what its fix text says. A plan with no stamp is **The plan follows** of wrong.md.
2. `SPEX show <dir> --tests <ids…>` once, to group the batch. Tests that name the same
   `file` go to one test developer. The rest go by driver, two or three for each.
3. Say `Write: TS01 TS02 → 1 developer, TS03 → 1 developer`. Start one
   `spex:test-developer` for each group, all in one message. The brief is one line:
   `<dir> TS01 TS02. Write them; the orchestrator checks.`
4. When they return: `SPEX check <dir>`, then `SPEX coverage <dir>`. Each test of the
   batch must be `ok` under `## files`. Then `SPEX run <dir> --test <TS> --expect fail`
   for each test. It must print `red as expected`.
   - `RUN-GREEN`: the test passes before the code exists. With a `mutation` proof in the
     return of the test developer, the code is there already: keep the test, and name it
     in the report of the run (`--concern "TS10 already green: <the proof>"`). develop.md
     closes its task. With no proof, the test asserts nothing new: a fresh test developer
     takes that one test again, with the finding in its brief.
   - `RUN-SKIPPED` or `RUN-NO-TESTS`: a fresh test developer, with the finding. A test
     that skips is not red and not green.
   - A test developer returns `blocked`: a step no script can do, or a value no interface
     gives. The plan record is wrong, not the developer. One `spex:test-analyst` with
     `<dir> <TS>: <why>` writes that record again: a session, a `needs`, another value.
     Then `SPEX correction <dir> --title "implement · the plan of <TS> was wrong" --found
     "<why>" --changed "<TS> planned again"`, then `SPEX stamp <dir> --close <the id it
     printed>`, then step 3 for that test. One time for each test: a second `blocked` is
     wrong.md.
5. Step 1 again, for the next batch, until it says `nothing to write`.

A test that was planned again and is green after it was written again (the code is
right, and the old test was wrong) is proved by a mutation, as `RUN-GREEN` above. A new
test for a changed claim or for a fix task must be red: red is the proof that the test
sees the problem.

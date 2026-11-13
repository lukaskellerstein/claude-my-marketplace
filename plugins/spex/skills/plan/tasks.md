# Tasks: the tasks, then the test plan

The run gets here when `SPEX check <dir>` has no error for the records. The planner
writes `tasks.yaml`. Then another agent than the writers of the claims plans the proof.

## The run (your chat)

1. Say `Tasks: 1 planner`, then start one `spex:planner` with `<dir>. Plan.` It returns
   `tasks:` and `needs:` (what a task needs that the code lacks).
2. `SPEX check <dir>` until `0 error(s)` and no `TASK-COVERAGE` gap. A finding goes back
   to the planner: `<dir>. Plan. <the findings>`. A `TEST-COVER` gap is step 3's.
3. Say `Plan the tests → 1 test analyst`, then start one `spex:test-analyst` with
   `<dir>. Plan a test for every claim spex show --plan lists.` It writes `tests.yaml`
   from the claims alone: every scenario and every `done_when`.
4. `SPEX check <dir>`. A `TEST-*` error or a `TEST-COVER` gap goes back to a fresh test
   analyst with the findings, once.
5. A `blocked` return names a claim no test can observe. A scenario: the analyst,
   `<dir>. Correct: <the scenario and why>`. A `done_when`: the planner, `<dir>. Plan.
   <the task and why>`. Then step 3 again. A system that is not in `live`: a `You:`
   line. Nobody writes a real system without the person's yes.
6. Hold `sessions`, `needs` and `touches` of the return for the digest.
7. A second run, `tasks.yaml` exists: the planner adds tasks only for the records no
   task covers. It leaves every `done` task, and the rest of the file, byte for byte.
   Every record has a task: nothing to add, say so. A claim with no test: step 3.

## The file (the planner reads this)

Read `requirements.yaml` once. Then `SPEX show <dir> --inherited`: use those names
exactly, and `consumes` them instead of reading their folders. Then only the code the
records touch: the module behind each interface, the test harness conventions, the
contract files. `.spex/config.yaml` for `limits`, `live`, `people` and `repos`. `spec.md`
only for its Decisions and Alternatives, when a `rationale` points there.

Write `<dir>/tasks.yaml` top to bottom, in block style:

- `approach`: the shape of the solution, under `limits.approach_bytes`.
- `boundaries`: `always[]` and `never[]`, rules every task obeys.
- `design`: `modules[]` (`M1`, `path`, `role`) for every module a task creates or
  reshapes. `entities[]` (`E1`, `name`, `fields[]` or `schema`) for every shared data
  shape. `decisions[]` (`D1`, `text`, `why`) for every decision more than one task
  relies on.
- `tasks[]`: one task is one agent run. Order: setup, foundational (schema, models,
  contracts), then the records, the most important first, so a run that stops leaves a
  part that works. Polish is last.
- The fields of a task: `id` (`T01`), `title`, `kind`, `requirements` (the ids it makes
  true; a setup task may have none), `depends_on`, `parallel_group` (only with disjoint
  `paths`), `paths` (the write allowlist, unit tests included; never `protected`, never
  a test folder), `context` (the files to read, `path:from-to` for a range, under
  `limits.context_kb` in total), `design` (the `E` and `D` ids it needs; modules match
  by path), `interfaces.produces` (exact signatures later tasks rely on),
  `interfaces.consumes` (copied from the producer), `instructions`, `done_when` (one
  observable sentence a script can check), `status: todo`.
- `repo`: a key of `repos` when the task writes another git repo. Its `paths` and
  `context` are inside it. One task, one repo: a change in two is two tasks with
  `depends_on`.
- `instructions`: decisions, quoted constraints, and every value a scenario needs and
  the code lacks, named once (`GIFT-2EUR = 200 cents`). Under
  `limits.instructions_bytes`. No function bodies.
- Every file or id that `instructions` names is in `context`, `paths`, `design` or
  `requirements`. Else the developer cannot load it.
- No person is an actor. Not "ask …", not "a go-ahead", not "by hand". A merge is
  `close.cmd`, a press is a browser step in a session test, a token is a `needs` of a
  test. `TASK-PERSON` refuses the file otherwise.
- Split, never shrink: a task that does not fit `limits` becomes two. Never drop scope.
- Quote a value with a comma or a colon.

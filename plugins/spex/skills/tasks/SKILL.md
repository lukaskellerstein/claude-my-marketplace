---
name: tasks
description: Turn approved spex requirements into specs/NNN-slug/tasks.yaml — approach, boundaries, a design block (modules, entities, decisions) and one task record per agent run with write allowlists, context, signatures and named values, never a person as an actor — make it pass spex check with full coverage, then have a test-analyst subagent add a test for every task to tests.yaml. Use when the user says "tasks", "spex tasks", "plan the tasks", "write the tasks", or after spex approve.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Agent
---

# spex tasks

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root. Every finding
has a `fix` text; read it.

You are the analyst: you write the claim (`done_when`). You never write its proof:
`tests.yaml` is the test analyst's file, and you do not open it.

## Steps

1. `SPEX gate tasks <dir>`. If it is refused, report what it wants (approval, an open
   question, an unknown without a decision) and stop. Open with `nothing to add`: every
   record has a task; say so and go to step 9. Open with `… have no test`: go to step 8.
   A changed `tasks.yaml` goes back to a person.
2. Read `<dir>/requirements.yaml` once. Then `SPEX show <dir> --inherited` when `spec.md`
   names `depends_on`: the decisions, entities and produced signatures of the steps this
   one builds on. Use those names exactly, and `consumes` them instead of reading their
   folders. Then read only the code the records touch: the module behind each interface,
   the test harness conventions, the contract files. Read `.spex/config.yaml` for
   `limits`, `live`, `people` and `repos`. Read `spec.md` only for its Decisions and Alternatives
   sections, when a record's `rationale` points there.
3. Write `<dir>/tasks.yaml` top to bottom:
   - `approach`: the shape of the solution, under `limits.approach_bytes`.
   - `boundaries`: `always[]` and `never[]`, rules every task obeys.
   - `design`: `modules[]` (`M1`, `path`, `role`) for every module a task will create or
     reshape; `entities[]` (`E1`, `name`, `fields[]` or `schema`) for every shared data shape;
     `decisions[]` (`D1`, `text`, `why`) for every decision more than one task relies on.
     Block style; quote a value with a comma or a colon.
   - `tasks[]`: one task is one agent run. Order: setup, foundational (schema, models,
     contracts), stories, polish. Fields: `id` (`T01`), `title`, `kind`, `requirements` (the
     ids it makes true; a setup task may have none), `depends_on`, `parallel_group` (only
     with disjoint `paths`), `repo` (a key of `repos` when the task writes another git
     repo; its `paths` and `context` are inside it; one task, one repo: a change in two is
     two tasks with `depends_on`), `paths` (the write allowlist, unit tests included, never
     `protected` and never a test folder), `context` (files to read, `path:from-to` for a
     range, under `limits.context_kb` in total), `design` (the `E`/`D` ids it needs; modules
     match by path on their own), `interfaces.produces` (exact signatures later tasks rely
     on) and `interfaces.consumes` (copied from the producer), `instructions` (decisions,
     quoted constraints, every value a scenario needs and the code lacks named once —
     `GIFT-2EUR = 200 cents` — under `limits.instructions_bytes`, no function bodies),
     `done_when` (one observable sentence a script can check), `status: todo`.
   - Every file or id that `instructions` names must be in `context`, `paths`, `design` or
     `requirements`, or the developer cannot load it.
   - No person is an actor. Not "ask Lukas", not "a go-ahead", not "by hand", not "Lukas
     merges the request": a merge is `ship.cmd`, a press is a browser step in a session test, a
     token is a `needs` of a test. `TASK-PERSON` refuses the file otherwise.
4. Split, never shrink: a task that does not fit `limits` becomes two tasks. Never drop scope.
5. Contracts: for an interface that other code or people call, write or update the file
   under `<dir>/contracts/` (OpenAPI, JSON Schema, CLI usage, IPC events) and point
   `interfaces[].contract` at it.
6. Incremental: if `tasks.yaml` exists, the gate names the records no task covers. Add tasks
   for those and leave every `done` task, and the rest of the file, byte for byte as it is.
7. `SPEX check <dir>` until it prints `0 error(s)` and no `TASK-COVERAGE` gap. A `TEST-COVER`
   gap is step 8's.
8. The proof plan for the tasks: say `Plan the task tests → 1 test analyst`, then start one
   `spex:test-analyst` with `<dir>. Plan a test for every task spex show --plan lists.` It
   appends to `tests.yaml`. On its return, `SPEX check <dir>`: a `TEST-*` error or a
   `TEST-COVER` gap goes back to a fresh test analyst with the findings, once. A `blocked`
   return names a `done_when` no test can check: rewrite that sentence, then step 8 again.
9. `SPEX report <dir> tasks --status <done|concerns> --summary "…"`.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 15 lines.
`✅ PLANNED`, then the task list (`T01 kind — title`), the design ids, the task tests
(`TS09 → T03`, sessions with their `why`), and under You anything the person should look
at before the first task runs. With `tasks` in `approvals`, NEXT asks the person to read
the file and run `spex approve`.

---
name: plan
description: Turn an approved spex spec into specs/NNN-slug/tasks.yaml — approach, boundaries, a design block (modules, entities, decisions) and one task record per agent run with write allowlists, context, signatures and named values — then make it pass spex check with full coverage. Use when the user says "plan", "spex plan", "write the tasks", or after spex approve.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex plan

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root. Every finding
has a `fix` text; read it.

## Steps

1. `SPEX gate plan <dir>`. If it is refused, report what it wants (approval, an open
   question, an unknown without a decision) and stop.
2. Read `<dir>/requirements.yaml` once. Then read only the code the records touch: the
   module behind each interface, the test harness conventions, the contract files. Read
   `specs/spex.yaml` for `limits`.
3. Write `<dir>/tasks.yaml` top to bottom:
   - `approach`: the shape of the solution, under `limits.approach_bytes`.
   - `boundaries`: `always[]` and `never[]`, rules every task obeys.
   - `design`: `modules[]` (`M1`, `path`, `role`) for every module a task will create or
     reshape; `entities[]` (`E1`, `name`, `fields[]` or `schema`) for every shared data shape;
     `decisions[]` (`D1`, `text`, `why`) for every decision more than one task relies on.
     Block style; quote a value with a comma or a colon.
   - `tasks[]`: one task is one agent run. Order: setup, foundational (schema, models,
     contracts), stories, polish. Fields: `id` (`T01`), `title`, `kind`, `requirements` (the
     ids it makes true), `depends_on`, `parallel_group` (only with disjoint `paths`), `paths`
     (the write allowlist, unit tests included, never `protected`), `context` (files to read,
     `path:from-to` for a range, under `limits.context_kb` in total), `design` (the `E`/`D`
     ids it needs; modules match by path on their own), `interfaces.produces` (exact
     signatures later tasks rely on) and `interfaces.consumes` (copied from the producer),
     `instructions` (decisions, quoted constraints, every value a scenario needs and the code
     lacks named once — `GIFT-2EUR = 200 cents` — under `limits.instructions_bytes`, no
     function bodies), `verify` (extras only; the script already runs `fast_checks` and the
     acceptance tests of the task's ids), `done_when` (one observable sentence),
     `status: todo`.
   - Every file or id that `instructions` names must be in `context`, `paths`, `design` or
     `requirements`, or the implementer cannot load it.
4. Split, never shrink: a task that does not fit `limits` becomes two tasks. Never drop scope.
5. Contracts: for an interface that other code or people call, write or update the file
   under `<dir>/contracts/` (OpenAPI, JSON Schema, CLI usage, IPC events) and point
   `interfaces[].contract` at it.
6. Incremental: if `tasks.yaml` exists, add tasks for records no task covers and leave every
   `done` task byte for byte as it is.
7. `SPEX check <dir>` until it prints `0 error(s), 0 gap(s)`. A coverage gap is an error here.
8. `SPEX report <dir> plan --status <done|concerns> --summary "…"`.

## Reply

At most 15 lines. `STATUS:` first, then the task list (`T01 kind — title`), the design ids,
and anything the person should look at before the first task runs.

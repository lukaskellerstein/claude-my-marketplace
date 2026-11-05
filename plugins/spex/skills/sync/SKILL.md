---
name: sync
description: Bring a spex spec back in line with code that changed by hand — records edited on the branch go back to draft, behavior that is already on main gets a superseding record, tasks are added for new work. Use when the user says "sync spec", "spex sync", "the spec is outdated", "update the spec to match the code", or any variant of reconciling implementation changes into requirements.yaml and tasks.yaml.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex sync

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. Find what changed: the diff of the branch against its base (`main` unless the user says
   otherwise), plus what the user tells you. Read the diff, not the whole code. Read
   `<dir>/requirements.yaml` and `<dir>/tasks.yaml` once.
2. For each behavior the code now has that the records do not describe, or describe
   differently:
   - A record that lives only on this branch: edit its text and scenarios, set
     `status: draft`, set `source: review` or keep the old source. Gate 1 runs again.
   - A record that is already on `main` (`SPEX check <dir> --base main` reports
     `REQ-FROZEN` if you touch it): leave it, and add a new record at `status: draft` with
     `relationships: [{type: supersedes, target: <old id>}]`.
   - Behavior with no record at all: a new record, `status: draft`, `source: review`.
3. Tasks: add a task for new work that no task covers; adjust `paths` and `instructions` of
   `todo` tasks that the change made wrong. Never rewrite a `done` task, and never set a
   status yourself: only `spex done` does that.
4. Design: if the code introduced a module, entity or decision the tasks rely on, add it to
   the `design` block with the next free id.
5. `SPEX check <dir> --base main` until it has no error. Coverage gaps count.
6. `SPEX report <dir> sync --status <done|concerns> --summary "…"`, with a `--question`
   for every change that needs a person's decision.

## Reply

At most 15 lines. `STATUS:` first. Then the records edited, the records added (and what
they supersede), the tasks added, and the questions.

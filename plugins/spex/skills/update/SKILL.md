---
name: update
description: After a spex plugin update, bring the repo to the plugin's format — run spex update, which adds the keys the newer plugin needs with their defaults and comments, runs the format migrations (2 → 3 moves the state of each spec from spec.md to status.yaml, and ship to close and commit in the config) and sets format, keeping every value and comment of yours — then show what changed. Use when the user says "spex update", "update the config", "update spex", or right after the plugin was updated.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Agent
---

# spex update

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root.

## Steps

1. `SPEX update`. It changes `.spex/config.yaml`: the keys a newer plugin introduced, with
   their defaults and comments; the `format` line; and, when `format` is behind, the spec
   folders too. Every value and comment of yours stays. If it refuses, relay the finding and
   stop: no config yet means `/spex:init`; a repo newer than the plugin means the plugin
   must be updated first.
2. Format 1 → 2 writes a `tests.yaml` per folder from what was there: one script test per
   scenario, found in its file by name when the test exists, and one shell test per task
   that had `verify` commands. It is a start, not a plan. For every folder whose records
   are not all `built` or `retired`, say `Complete the plan → 1 test analyst` and start one
   `spex:test-analyst` with `<dir>. Complete tests.yaml: every claim spex show --plan
   lists, a name per script, a session where no script can judge.` Then `SPEX check <dir>`;
   a `TEST-*` error goes back to a fresh test analyst with the findings, once.
3. Format 2 → 3 (spex 3.0) moves the state of each spec out of `spec.md` into
   `status.yaml`: a shipped spec is `review, done`, a spec with no records is a note with
   no file, and a spec in the middle keeps its files and is stamped as it is. In the
   config, `ship` becomes `commit` and `close.cmd`, and `approvals` goes: the next command
   is the approval. A spec in the middle has no branch `spex/<spec>` yet: its next
   command runs in a session that `claude -w spex/<spec>` starts, in a worktree made from
   the remote base branch, so its files must be committed and pushed there first.
4. `SPEX check`. Fix nothing else yourself. Relay errors by their `fix` text. A new default
   that does not fit this repo is the user's call, so name it: `commit: false` means the
   user commits the notes of new; `close.cmd` empty means a person merges; `live: []`
   lets no test write a real system.
5. Do not commit. Say which files changed, so the user can. Then `SPEX status`.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 12 lines, then
the NEXT block `SPEX status` printed.
`✅ UPDATED`, then one line per change `spex update` printed
(`added live: []`, `specs/007-csv-export/tests.yaml: written from 2 scenario(s) …`), the
plans completed, the warnings of `check`, then the output of `SPEX --version`, as printed:
the plugin version and the format.

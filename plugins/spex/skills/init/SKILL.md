---
name: init
description: Set up spex in a repository once — write .spex/config.yaml from a scan of the test runner, scripts and folders (the default driver, a playwright driver when the repo has it, fast checks, the real systems a test may write, the people who are never an actor, how a feature ships), plus the .spex/.gitignore that keeps the script's work folders out of git — or, after a plugin update, bring an existing config to the new format with spex update. Use when the user says "init spex", "set up spex", "spex init", or asks to start spec-driven work in a repo that has no .spex/config.yaml yet.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex init

`SPEX` below means `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`. Run it from the repo root.

## Steps

1. If `.spex/config.yaml` exists already, do not pass `--force`: run `SPEX update` instead.
   It keeps every value and comment in the file, adds the keys a newer plugin needs with
   their defaults, runs the migrations and sets `format`. Report its lines and stop here.
   `--force` is a new scan that throws the hand edits away; use it only when the user asked
   to redo the file. Otherwise run `SPEX init`.
   It scans `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml` and the test folders,
   writes `.spex/config.yaml` and `.spex/.gitignore`. The config is committed; everything
   else under `.spex/` (evidence, runs, review diffs, artifacts) is the script's work and
   stays out of git. It never asks what a scan can answer.
2. Read its output. Every line that starts with `note:` is a guess that needs a look.
3. Open `.spex/config.yaml` and fix what the scan got wrong:
   - `acceptance_cmd`, the default driver, must run only the tests whose names match
     `{ids}` (a regex like `REQ_007_001|REQ_007_002`; `{ids_k}` is the `A or B` form for
     pytest). `drivers` holds more: `playwright` when the repo has `@playwright/test`
     (the scan adds it), one per runner otherwise. A session test needs no driver: a
     tester performs it with the Playwright MCP this plugin bundles.
   - `fast_checks` must pass on a clean checkout and must not run the test folders.
   - `source_dirs` is what the test analyst and the test developers never read.
   - `scopes` lists the capabilities the repo already has (`export`, `auth`). Take them from
     the module names; leave the list empty if nothing is obvious.
   - `live` stays empty: it is the one-time yes for every real system a test may write
     (`github:org/repo`, `gitlab:group/project`, `cluster:laptop`). Name them in the reply
     so the user adds the ones they allow.
   - `people`: the names that never appear as an actor in a task or a test step. Put the
     user's first name there, from the git author of the last commits.
   - `ship`: `commit: true` and the command that pushes, opens the request and merges it,
     from the remote: `gh pr create --fill && gh pr merge --squash --delete-branch` on GitHub,
     `glab mr create --fill --yes && glab mr merge --yes` on GitLab. Leave `cmd` empty
     when the user merges by hand: `/spex:ship --merged` then closes the feature.
4. Prove `acceptance_cmd` before anyone relies on it. Write one throwaway test under
   `acceptance_dir`, named `REQ_000_000_AC_0_probe`, that fails on purpose. Run the command
   with `{ids}` replaced by that name. The runner must list the test and report it as failed.
   Then delete the test. If the runner never collects the folder (a vitest `include` list
   that stops at `src/`, a glob that misses it), fix the command or the runner config and
   probe again. A command that silently runs zero tests makes every red run `RUN-NO-TESTS`.
5. If the scan found no runner, ask the user one closed question: which command runs the
   acceptance tests, with 2 to 4 options drawn from the repo and one recommended.
6. Run `SPEX check` once. It must print `0 error(s)` on a repo with no specs yet.

## Reply

At most 15 lines. First line `STATUS: done | concerns | blocked`. Then the runner it found,
the drivers, the fast checks, `ship.cmd`, and every guess the user must confirm: `live`
above all, because nothing writes a real system until it is listed there.

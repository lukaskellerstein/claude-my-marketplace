---
name: init
description: Set up spex in a repository once — write specs/spex.yaml from a scan of the test runner, scripts and folders, and gitignore the .spex/ work folder. Use when the user says "init spex", "set up spex", "spex init", or asks to start spec-driven work in a repo that has no specs/spex.yaml yet.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex init

`SPEX` below means `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`. Run it from the repo root.

## Steps

1. Run `SPEX init` (add `--force` only if the user asked to redo an existing file).
   It scans `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml` and the test folders,
   writes `specs/spex.yaml`, and adds `.spex/` to `.gitignore`. It never asks what a scan
   can answer.
2. Read its output. Every line that starts with `note:` is a guess that needs a look.
3. Open `specs/spex.yaml` and fix what the scan got wrong:
   - `acceptance_cmd` must run only the acceptance tests whose names match `{ids}`
     (a regex like `REQ_007_001|REQ_007_002`; `{ids_k}` is the `A or B` form for pytest).
   - `fast_checks` must pass on a clean checkout and must not run the acceptance folder.
   - `source_dirs` is what the test author is never allowed to read.
   - `scopes` lists the capabilities the repo already has (`export`, `auth`). Take them from
     the module names; leave the list empty if nothing is obvious.
4. If the scan found no runner, ask the user one closed question: which command runs the
   acceptance tests, with 2 to 4 options drawn from the repo and one recommended.
5. Run `SPEX check` once. It must print `0 error(s)` on a repo with no specs yet.

## Reply

At most 15 lines. First line `STATUS: done | concerns | blocked`. Then the runner it found,
the acceptance command, the fast checks, and every guess the user must confirm.

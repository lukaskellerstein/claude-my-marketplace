---
name: archive
description: Close a merged spex feature — flip its approved records to built, retire the records it supersedes, and surface every question that was answered by default. Use when the user says "archive", "spex archive", "close the feature", after the feature branch is merged.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex archive

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. Archive runs after the merge, on the branch that now holds the feature (`main`, usually).
   If it is not clear that the merge happened, ask the user one yes/no question.
2. `SPEX archive <dir>`. It refuses with a task left or a question open; relay the finding
   and stop. On success it flips `approved` → `built`, retires every record this feature
   supersedes (in the other feature's file), and prints the answers given `by: default`.
3. Do not commit. Say which files changed so the user can.

## Reply

At most 15 lines. `STATUS:` first, the records built, the records retired, and every
default answer — a person reads those now, because nobody was asked at the time.

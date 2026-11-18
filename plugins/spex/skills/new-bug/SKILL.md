---
name: new-bug
description: Report a bug in code that is merged — keep the report word for word, give the bug one note with the next turn (after the spec that is open, before the notes that wait), move each later note one number up, and check that every detail of the report is in the note. No agent runs. Use when the user says "spex new-bug", "there is a bug in …", "this is broken on main", for code no open spec owns.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md)
---

# spex new-bug

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, in the main folder, on the base branch.
The argument is the bug report: text, or a file. A bug is always one spec: nothing is
split, and there is no list to ok. No agent runs, and you ask nothing.

A bug found while its spec is open is not for this command: it is fixed in that spec.
Say so, name `/spex:comment`, and stop.

## Steps

1. Keep the words. A report given as text: write it to `.spex/runs/words.md` (git
   ignores that folder), word for word, with
   nothing added and nothing left out. A report given as a file: that file.
2. `SPEX new-bug <slug> --words <that file>`, the slug from what is broken
   (`export-cuts-long-names`). The script takes the next turn: the number after the last
   spec that is closed or open. It moves each later note one number up, and rewrites each
   place that names one. It prints the folder and `moved up: 006 → 007 …`. Refused in a
   worktree (`NEWBUG-LEAVE`): `SPEX status` names the open spec; say that the report waits
   for a session on the main folder, and stop.
3. Write the note: `specs/<NNN>-<slug>/spec.md`. Fill only what the report gives:
   - **Why**: what the person did, and what happened.
   - **What**: what must happen.
   - **Not this**: what they named as out of scope, or `(you named nothing)`.
   - **From your idea**: every detail of the report, one bullet each, in its own words,
     each with `← source.md#L<n>`. A line that holds no detail (a greeting) gets a bullet
     too, with its reason: `- (left out: a greeting) ← source.md#L1`.
   - **Open questions**: only what the report leaves open, each with `Pick:` or
     `Settles:`. plan settles them.
   Add nothing: no cause, no fix, no guess. plan finds the cause in the real code.
4. `SPEX cover specs/<NNN>-<slug>/source.md specs/<NNN>-<slug>`. A `COVER-LINE` gap: add
   that detail to the note, and run it again. At most 3 tries, then reply `⛔ STOPPED`
   and name the line.
5. `SPEX commit --message "spex: bug <NNN>-<slug>"`. With `commit: true` it commits the
   note and the new numbers on the base branch, and pushes them when the repo merges
   with a command through a remote. Without it, it names the files (`COMMIT-YOURS`). A
   push that failed is `COMMIT-PUSH`. Each goes under `You:` with its fix text, because
   plan refuses until then. It ends with the NEXT block.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 12 lines.
`✅ BUG NOTED · <NNN> <title>`, line 2 `🐞 new-bug · <n> details kept of <n>`. What: the
folder of the note, and that the fix is the next spec in line, after `<the open spec>` when
one is open. `Moved:` one line, `006 → 007 · 007 → 008`, or nothing when no note waits.
Then the NEXT block that `SPEX commit` printed, as it is.

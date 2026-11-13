---
name: delete
description: Take a spec off the list — a note, a planned spec or a started spec, never a merged one. The script saves the folder of a spec that has a worktree to .spex/archive/ with its code as one patch file, removes the worktree and the branch, takes the note off the base branch, moves the later notes one number down, and commits with commit true. No agent runs. Use when the user says "spex delete", "drop spec 005", "remove this spec", "I do not want 008 any more".
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), ExitWorktree
---

# spex delete

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`. Arguments: the spec folder (or many),
and the reason. The script does all of it; you call it and say what it did. No agent runs.

## Steps

1. No reason in the command: ask for it in one line, reply `⏸ WAITING FOR YOU`, stop.
   The reason is the person's, and the archive keeps it. Never invent one.
2. `SPEX delete <dir>… --reason "<their words>"`.
3. Read the exit code and the finding:
   - `DELETE-LEAVE`: the chat is in a worktree, and delete changes the main folder. Call
     the tool `ExitWorktree` with `action: keep`, then step 2 again.
   - `DELETE-MERGED`: the spec is closed and merged. Nothing changed. A merged spec stays;
     only a new spec changes it. Reply `⛔ NOT STARTED` and name `/spex:new`, or
     `/spex:new-bug` for a bug.
   - `DELETE-DEPENDED`: a later spec depends on it. Nothing changed. Reply `⛔ NOT
     STARTED` with the two ways out the script prints: both in one command, or the
     person corrects that note first. Never pick one for them.
   - Exit 8, `DELETE-WORKTREE`: the archive has the folder and the code already, and the
     worktree is not fully removed. A sandbox protects two paths of Claude Code in a
     worktree. Run the command the script printed, one time, outside the sandbox: Claude
     Code asks the person once. Then step 2 again: it goes on from there. With no person
     to ask, reply `⏸ WAITING FOR YOU` and name the command under `You:`.
4. Exit 0: the script printed what it saved, what it removed, `moved: 006 → 005 …`, if it
   committed and pushed, and the NEXT block. Without `commit: true` it names the files,
   and `COMMIT-PUSH` is a push that failed: each goes under `You:`, because plan
   refuses until then.
5. A `DELETE-ROWS` warning: the roadmap file still gives the deleted spec a coverage row.
   Say it under Notes with its fix text. Do not edit the roadmap file: where that scope
   goes is the person's call.

Never delete a folder, a branch or a worktree by hand, and never restore one from the
archive: what the person deleted stays deleted. `code.patch` brings the code back only when
they ask for it.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 14 lines.
`✅ DELETED · <NNN> <title>`, line 2 `🗑️ delete · worktree and branch removed`, or `🗑️
delete · a note` for a spec that had none. `Kept:` the archive folder, and for a spec that
had a worktree `code.patch: the code of the branch`. `Moved:` one line, `006 → 005 · 007 →
006`, or nothing when no number moved. Then the NEXT block the script printed.

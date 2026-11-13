# The close

The run gets here when a review round has no fix pick left, or when `SPEX start review`
said that the close is not finished. Six steps, in this order, each one command: `SPEX
close <dir> <step>`. A step that ran before finds its work done, so a run that stopped
goes on at any step. `SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`.

1. `SPEX close <dir> sync`: the base branch comes in. `CLOSE-CONFLICT` names the files:
   one `spex:developer` with `<dir>. Conflict: <files>` joins both changes, so both stay.
   Then the step again: it commits the merge. `GATE-PUSH` (here or at step 5): the base
   branch has commits the remote lacks. It is the person's: `⏸ WAITING FOR YOU`, its fix
   text under `You:`.
2. `SPEX close <dir> later`. `no later spec waits`: no agent runs, go to step 3. Else it
   names the later notes, what to read, the deferred findings, and what a close passed on
   already: that is not passed on again.
   - One `spex:decider`: `<dir>. Later notes: <dirs>. Q1 — what did <dir> learn that a
     later note must know? Size each thing: nothing, small or big. Read SPEX show <dir>
     --lessons, <dir>/corrections.md, the Decisions of <dir>/spec.md, the deferred
     findings, and each note.` Big: the list of specs changes (a spec is added, dropped
     or replaced).
   - Small: one `spex:analyst` with `<dir>. Later notes: <dirs>. <each thing, with its
     size>`. A note gets one line with the pointer (`Files are in S3 now ← 003`), and
     the names it uses are corrected. A closed spec is never written again.
   - Big, and an entry of corrections.md has the list that the person accepted in
     implement: no question. The analyst writes the notes again from that list.
   - Big, and nobody asked yet: one answer from the person. Reply `❓ QUESTIONS` with one
     block: the new list, each spec by its name, each line with keep, change, add or
     drop and its reason, and a pick. Stop. Their answer: `SPEX correction <dir> --title
     "close · the list of specs" --you-said "<their words>" --pick "<the list>"
     --closed`, then the analyst. In auto mode the decider answers.
   - Each line that a note got: `SPEX correction <dir> --title "close · <the fact>"
     --found "<where it came from>" --reaches "<the note>: <the line>" --closed`. Then
     `SPEX check <each note>`: an error goes back to the analyst.
   - A note to drop or to add waits for step 7: it changes the main folder.
   - A thing about how to work in this repo belongs in the docs of the repo, not in a
     spec: name it in the last reply, and leave it to the person.
3. `SPEX close <dir> prove`. `CLOSE-PROOF`: the code changed after the proof. Read
   `${CLAUDE_PLUGIN_ROOT}/skills/implement/prove.md` and do it from its step 2. A red test
   goes to wrong.md of the same folder. No task is built again for a wrong test: after
   the fix, `SPEX correction <dir> --close <C-id> --done "green again"`, and this step
   again. A fix that changed the plan set the state to `implement, started`: the run
   ends with `SPEX end implement <dir>`, and the person types the command again.
4. `SPEX close <dir> built`: the records are built, each entry that is still open is
   closed, the state is `review, done`, one commit. Keep its list `answered by an agent or by the pick` for the last reply.
5. `SPEX close <dir> merge`.
   - `CLOSE-WAIT`: the config has no `close.cmd`. Reply `⏸ WAITING FOR YOU`. Under `You:`
     the branch, who merges it (the person, or the forge after their approval), and that
     `/spex:review <dir>`, typed again, finishes the close. Stop.
   - `CLOSE-MERGE-FAILED`: a cause to fix, not a question. One `spex:developer` with
     `<dir>. Merge failed: <tail>`. Then steps 3 and 4 again, so the fix is tested and
     committed, then this step. At most 3 tries. After them, or when the forge wants a
     person or a credential: `⏸ WAITING FOR YOU`, with what it wants under `You:`.
6. Call the tool `ExitWorktree` with `action: keep`. Then, in the main folder, `SPEX
   close <dir> finish`. It pulls the base branch, runs `env.down`, and removes the
   worktree and the branch.
   - Exit 8, `CLOSE-WORKTREE`: the spec is merged, and the worktree is not fully removed.
     A sandbox protects two paths of Claude Code in a worktree. Run the command the
     script printed, one time, outside the sandbox: Claude Code asks the person once.
     Then this step again. With no person to ask: `⏸ WAITING FOR YOU`, the command under
     `You:`.
   - `CLOSE-WAIT`: as in step 5. Any other refusal: its fix text, then this step again.
7. Only when step 2 changed the list of specs. A note to drop: `SPEX delete <dir> --reason
   "<the reason the person accepted>"`. A note to add: `SPEX new <slug>`, then one
   `spex:analyst` with `<the new dir>. Note: <what the list says>`. Then `SPEX commit
   --message "specs: the list after <NNN>"`: with no `commit: true` it names the files,
   and they go under `You:`. Then `SPEX status` for the NEXT block.

Never merge, delete a branch or remove a worktree by hand: each is a step of the script.

## The last reply

In the frame of reply.md, at most 16 lines.

```
**✅ CLOSED · 007 CSV export**
👀 review · merged to main · worktree removed
```

- What: `No finding. 6 records are built.`, or each finding with its pick.
- `Spec changes by an agent: 2`, then one line each: the entries of corrections.md, and
  the list of step 4. The ones that changed a line of the person are on top. `0` with none.
- `Later specs:` one line for each line a note got (`004: Files are in S3 now`), each
  note that was dropped or added, or `none`.
- `Deferred, and no later spec took it:` one line each, from step 2. Leave it out with
  none.
- The NEXT block that `SPEX close <dir> finish` printed (after step 7: `SPEX status`).
  The last spec prints `Nothing.`

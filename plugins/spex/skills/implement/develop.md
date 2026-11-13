# Build the tasks

The run gets here when every script test has its file and is red: one fresh developer
for each task, wave by wave, until no task is `todo`.

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`. Your context holds the task ids and
the results, never the code.

1. The waves. `SPEX show <dir> --ready` prints them: `ready: T03 + T04, T05`. Tasks
   joined with `+` write different files: they are one wave, and run together. The other
   tasks run one by one, in the order of the file: the most important record is first, so
   a run that stops leaves a part that works. `waits for your yes: T04 · <question>` is
   **A write with no undo**, step 3. `blocked: T04 · <reason>` is the last lines of this
   part.
2. Say `Develop: T03 + T04 → 2 agents`. Start one `spex:developer` for each task of the
   wave, all in one message. The brief is one line: `<dir> <task>. Build it; the
   orchestrator runs spex done.`
3. When they return, read the first line of each return:
   - `done`: `SPEX done <dir> <task>`. The script runs the tests of the task now, and
     that is the verdict. A fail means not done, whatever the developer said.
   - A fail of `SPEX done`, `test-bug` (a test asserts other than its claim), `too-big`
     (the return says how to split), or a run that stays red: the task stays red. Let
     the wave return. Then read `${CLAUDE_PLUGIN_ROOT}/skills/implement/wrong.md` and do
     it, one time for all red tasks of the wave, with each developer's line as the claim.
     Never the developer, who can bend a test to the code. Never the person.
   - `paths`: **A file outside paths**.
   - `blocked` with an `ask:` line: **A write with no undo**.
   - `blocked` by `RUN-GREEN` at its gate (the tests pass before the code exists): one
     `spex:decider` says if the code already does what the claims of the task say. Yes:
     `SPEX done <dir> <task>`. No: the test asserts nothing, and that is wrong.md.
   - `blocked` by another gate finding: do what its fix text says, then the task again.
4. Step 2 again for the next wave, until no task is `todo`. A task that waits stops
   only itself: the other tasks go on.

## A file outside paths

The `needs:` line of the developer names a file that the `paths` of the task do not list.
`tasks.yaml` is the work of the process, so the process widens it. Never the developer,
who can take any file. Never the person: nobody asks them if a file can join a task.

1. One `spex:decider`, one question: `<dir>. Q1 — <task> must write <files>: <why>. Is
   that the work of this task? A yes, B no: it belongs to another task or to a new one.
   Read SPEX show <dir> <task>, the files, and the tasks whose paths have them. A file the
   claim cannot be met without is the file of the task.`
2. A: `SPEX paths <dir> <task> --add <file>… --reason "<the verdict, in one line>"`. It
   keeps the check rules (never a protected path or a test path, never a file that a
   parallel task writes, the file limit), keeps the stamp, and names each file it added.
   Then `SPEX correction <dir> --title "implement · <task> writes one more file"
   --changed "<task> + <file>" --why "<the verdict>" --closed`, so the digest shows it.
   Then one fresh developer takes the task again.
3. B, or `SPEX paths` refused the file: the tasks are wrong, and that is wrong.md.
4. One time for each task. A second `paths` return of the same task is wrong.md.

## A write with no undo

A task must write to a real system, and no test covers the write: money, a mail to
customers, data with no backup. No agent decides this, also not in auto mode. The
developer did every other part of the task, and its `ask:` line is one yes or no question.

1. `SPEX block <dir> <task> --reason "<what it writes, and where>" --ask "<the
   question>"`. The other tasks go on.
2. When no other task is ready: reply `⏸ WAITING FOR YOU`, with the question as one
   block of reply.md. Its context says what is written, where, how much (the number), and
   that it has no undo. Under it: `Yes: reply yes, or type /spex:implement <dir> yes.
   No: say what you want with /spex:comment.` Then stop.
3. Yes is the word `yes`: as the reply, or after the folder in the command. A task that
   waits when a run starts, and no `yes` in the command: the person may not have seen
   the question (a chat can end before its reply). Do the other tasks, then step 2
   again. With the yes:
   `SPEX correction <dir> --title "implement · a write with no undo, <task>" --you-said
   "<their words>" --found "<the question>" --closed`,
   `SPEX unblock <dir> <task>`, and one fresh developer: `<dir> <task>. The person said
   yes to: <the question>. Do the write, and return what it changed.` Then step 3 above.
4. No: the task stays blocked, and the run ends as in step 2. The words of the person go
   through `/spex:comment`, which changes the plan.

A block with no question (an older run wrote it): `SPEX unblock <dir> <task>`, then
wrong.md, with its reason as the claim.

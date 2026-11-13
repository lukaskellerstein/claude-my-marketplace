# A file outside paths

The task must write a file its `paths` do not list. `tasks.yaml` is the process's own work,
so the process widens it: never the developer, who could take any file it likes, and never
the user. Nobody asks a person "can this file join the paths?". The claim is the
developer's `needs:` line and its concern: `<task> must write <files>: <why>`.

1. One `spex:decider`, one question: `Q1 — <task> must write <files>: <why>. Is that this
   task's work? A yes, B no: it belongs to another task or a new one. Read SPEX show <dir>
   <task>, the files, and the tasks whose paths have them. The task's records and
   done_when decide: a file the claim cannot be met without is the task's.`
2. A: `SPEX paths <dir> <task> --add <file>… --reason "<the verdict, in one line>"`. It
   keeps the check rules (never a protected or test path, never a file a parallel task
   writes, the file limit) and writes why to `.spex/runs/<feature>/paths-<task>.json`.
   Its output names each file it added: a file you named and it did not is refused.
3. B, or `paths` refused: `SPEX block <dir> <task> --reason "<the need and the verdict>"`.
   A wrong test in the same need is **A wrong test** of `SKILL.md`, not a path. Never
   hand the person an edit of `tasks.yaml` or of a test: a refusal is a block.
4. One round per task: a second `paths` return for the same task is a `SPEX block` with
   both needs.
5. `SPEX next <dir>`. A `tasks.yaml` a person approved stays approved: `/spex:review`
   shows the change and its why. Stage `approve-tasks`: no develop gate opens until a person reads the
   change, because the plan was not approved before it. Let the running wave return,
   then end the run with that NEXT, and say in What which task got which file, and why.
   Any other stage: the task goes again, here from step 2 on, orchestrating as a fresh
   developer, a wave of one.

## A block that asks for a file or a test

A blocked task whose question in `SPEX next` is a file outside its `paths` or a wrong
test, and not a write to a real system with no undo, waits on the process's own question.
No person answers it. `SPEX unblock <dir> <task>`, then: files, step 1 here with the files
the question names; a test, **A wrong test** of `SKILL.md`. Then the task goes again as a
wave of one.

# Prove the whole spec

The run gets here when no task is `todo`. `spex done` proved each task by its own tests.
This part proves the spec as a whole: every script test at once, and every session test
performed, on the tree that is merged. The close of review does this part again, from
step 2, when the code changed after the proof.

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`. Your context holds the results of the
round, never the code or a test body.

1. `SPEX gate verify <dir>`: every task is done, and every need is met. A task that is
   `blocked` waits for the yes of the person: develop.md, **A write with no undo**. A
   need that is not met (a token, a system that must run) is the person's: reply
   `⏸ WAITING FOR YOU`, the need under `You:`, and stop.
2. `SPEX verify <dir>`. It runs `env.deploy` and `env.check` first, when the config has
   them. Then `fast_checks`, one command for each driver for the script tests, and the
   shell tests. Then it reads the evidence of each session test. A session that was
   recorded on another tree is `stale`. Exit 0, and no session is `pending` or `stale`:
   this part is done.
3. Sessions that are `pending` or `stale`: say `Perform: TS07 TS08 → 2 testers`. Start one
   `spex:tester` for each session, all in one message. The brief is one line: `<dir>
   TS07. Perform it and record it.` A tester clicks in a real browser, or calls an API or
   a CLI. It never edits, and it records what it saw with `spex session`. When they
   return: `SPEX verify <dir>` again.
4. Something is red: a script test `FAIL`, a session `fail`, `fast_checks`, or
   `ENV-DEPLOY`. A deploy that failed counts as a red test. Read
   `${CLAUDE_PLUGIN_ROOT}/skills/implement/wrong.md` and do it, one time for everything
   that is red. Do not read the tails yourself: `SPEX show <dir> --verify` gives the
   decider each failure with its claim, its file, the task behind it and the tail.
   After the fix, step 2 again.
5. Green: the run goes on with `SPEX end implement <dir>`, or, in the close of review,
   with the step that sent it here.

The round limit is your count of passes through wrong.md in this run (`verify_rounds`,
3). The script counts the rounds of `SPEX verify` in this run: a call after the
sessions, on the same tree, is the same round, and `SPEX start implement` starts at 1
again. A task that stays red is a round too, and only you see it: your count decides,
also when no `VERIFY-ROUNDS` warning came. Past the limit the run stops with the
report: each failure, every verdict. The person corrects the spec with `/spex:comment`,
or types the command again for more rounds. This is the same in auto mode: the limit is
the person's.

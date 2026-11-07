---
name: verify
description: Prove a built spex feature as a whole — spex verify runs fast_checks and every script test at this tree, tester subagents perform every session test (a browser through the bundled Playwright MCP, an API, a CLI) and record what they saw, and each failure goes to a decider (test, code or spec?) and then to the agent that owns the fix, round after round up to verify_rounds, with no question to the user. Use when the user says "verify", "spex verify", "test the feature", "run everything", or when a NEXT block names /spex:verify.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/SKILL.md), Agent
---

# spex verify

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

`spex done` proved each task by its own tests. This stage proves the feature: every script
test at once, every session test performed, at the tree that ships. Your context holds the
round's results, never the code or a test body.

## Steps

1. `SPEX gate verify <dir>`: every task done, every `needs` met. Refused: relay the `fix`
   text and stop. A `GATE-NEEDS` is the one thing a person gives (a token, a running
   system), so name it as the NEXT block does.
2. `SPEX verify <dir>`: round n of `verify_rounds`. It runs `fast_checks`, one command per
   driver for the scripts, the shell tests, and reads each session's evidence; a session
   recorded at another tree is `stale`. `ok` and no session pending: step 6.
3. Sessions `pending` or `stale`: say `Perform: TS07 TS08 → 2 testers`, then start one
   `spex:tester` per session, all in one message, each with one line: `<dir> TS07. Perform
   it and record it.` A tester clicks (the Playwright MCP) or calls (an API, a CLI), never
   edits, and records with `spex session`. When they return, `SPEX verify <dir>` again.
4. Failures (a script red, a session `fail`): `SPEX show <dir> --verify` prints each with
   its claim, its file, the task behind it and the tail. One `spex:decider` for all of
   them, one question each: `Qn — TSxx: is the test, the code or the spec wrong? A the test,
   B the code, C the spec. Read the claim, the test at <file>, the code under <paths>, the
   tail. The claim decides.` Route each verdict:
   - A, the test: say `Fix test: TSxx → 1 test developer`; one `spex:test-developer` with
     `<dir> TSxx: <what is wrong>`. A `blocked` return means the plan record is wrong: one
     `spex:test-analyst` with `<dir> TSxx: <why>`, then the test developer again. A session
     with a wrong plan goes to the test analyst at once.
   - B, the code: append a task to `tasks.yaml` with `kind: fix`, `source: "TSxx: <tail>"`,
     the record ids, `paths`, `context`, `instructions`, `done_when`, `status: todo`, and
     append its id to that test's `covers` in `tests.yaml`: the proof exists, it now names
     the fix too. Then read `${CLAUDE_PLUGIN_ROOT}/skills/develop/SKILL.md` and do its
     Orchestrate here: the fix task is the wave. (With `tasks` in `approvals`, the NEXT
     block asks a person to read the new task first; print it and stop.)
   - C, the spec: the claim is wrong. Route it as `/spex:review` does for `spec-gap` (its
     SKILL.md, step 5). The record goes back to `draft`: a person reads it at the gate, and
     the test analyst re-plans its tests at `/spex:requirements`.
   Then `SPEX verify <dir>` again: the next round.
5. Past `verify_rounds` (the `VERIFY-ROUNDS` warning): stop. `SPEX report` with
   `--status blocked`, one `--concern` per failure with its verdicts. A person reads it.
6. `SPEX report <dir> verify --status <done|concerns|blocked> --summary "…"`: the rounds,
   the scripts and sessions, one `--concern` per test rewritten or fix task added.

Never ask the user. A call these steps do not cover goes to one `spex:decider` with the
question, the options, your pick and the files that decide it; take its verdict and go on.

## Reply

At most 15 lines. `STATUS:` first, then one line per round: scripts green or red, sessions
pass, fail or pending, what was rewritten or fixed and by which agent. Last, the output of
`SPEX next <dir>`, as printed.

The NEXT block is copied as `SPEX next` printed it, the two rules included, never rewritten
into prose or shortened, and it does not count toward the line cap.

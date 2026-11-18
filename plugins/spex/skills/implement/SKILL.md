---
name: implement
description: Build the open spec from its plan, in one run. Typing it approves the plan. Test developers write each test and prove it red, one fresh developer builds each task, and the script and the testers prove the whole spec. For each red test a decider names the cause (the test, the code, the tasks or the spec), and the agent that owns it fixes it. Use when the user says "spex implement", "implement it", "build it", or when a NEXT block names /spex:implement.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/*.md), Agent
---

# spex implement

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is). You orchestrate. Your
context holds ids and results, never code or a test body. A brief is one line: each agent
reads its input with `spex show`. Say one line before each start: `Develop: T03 + T04 → 2
agents`. `auto` among the arguments, or `auto: true` in `.spex/config.yaml`, is auto mode.

## Steps

1. `SPEX start implement <dir>`. Typing the command approved the plan, so nothing asks
   for an ok: the script checks that the plan is as it was stamped.
   - Refused, and the output says `need(s) not met` (a token, a system that must run,
     `ENV-UP`): only the person gives these. Reply `⏸ WAITING FOR YOU`, each need under
     `You:`, and stop. No code is written yet.
   - `GATE-ENTER`: this session did not start in the worktree of the spec. Reply `⛔ NOT
     STARTED`, its fix text under `You:` as it is, and stop. No skill enters or leaves a
     worktree: the session starts there (`claude -w spex/<spec>`), and every agent you
     start works there.
   - Any other refusal: reply `⛔ NOT STARTED` with its fix text, and stop.
2. The output says `a correction is not finished`: a run ended in the middle of a fix.
   Read `${CLAUDE_PLUGIN_ROOT}/skills/implement/wrong.md` and do its part **An entry that
   is open** first.
3. The parts, in this order. Read a part when the run gets there, and do it:
   - `${CLAUDE_PLUGIN_ROOT}/skills/implement/tests.md`: each script test has its file,
     and is red.
   - `${CLAUDE_PLUGIN_ROOT}/skills/implement/develop.md`: each task is done.
   - `${CLAUDE_PLUGIN_ROOT}/skills/implement/prove.md`: the whole spec is green on this
     tree.

   A part that finds something red sends the run to `wrong.md`, and wrong.md says where
   the run goes on. A run with every test green never reads it.
4. `SPEX end implement <dir>`. It checks every task and the proof, closes the entries
   that are open, and commits on the branch of the spec. Refused: `GATE-TASKS` is
   develop.md again, `GATE-VERIFY` is prove.md again, `GATE-PLAN-CHANGED` is a change of
   the plan with no stamp (**The plan follows** of wrong.md). At most 3 tries, then
   `⛔ STOPPED`.
5. `SPEX report <dir> implement --status <done|concerns|blocked> --summary "…"`, with one
   `--concern` for each thing a later spec must know: a test written again, a file a
   task got, a task that waits. Also when the run stops early.

## The loop and its limit

One round is one pass through wrong.md, whatever sent the run there: a task that stays
red, a red test of the whole spec, a deploy that failed. Count the rounds of this run.
The limit is `verify_rounds` in `.spex/config.yaml` (3). Red again after the last round:
stop. Reply `⛔ STOPPED`: what works (the tasks ran by priority, so what is done works),
then each red test with every verdict it got. Under `You:` the two ways on:
`/spex:comment` to correct the spec, or this command again for the same number of rounds.

## Who is asked

Nobody, for a thing the files can answer. A call no part covers goes to one
`spex:decider`: the question, the options, your pick, the files that decide it. The person
gets four things: a need (step 1), the limit, a write with no undo (develop.md), and a big
change of the spec (wrong.md). In auto mode the decider answers the big change too. The
other three still stop for the person. Never hand the person an edit of the spec, a task
or a test: the agent that owns the file writes it.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 16 lines.

```
**✅ IMPLEMENTED · 007 CSV export**
🔨 implement · worktree 007-csv-export · 4 of 4 tasks · 9 of 9 tests green
```

What: what works now, for the user. Then one line for each round: `Round 1: 8 scripts
green · 1 browser test pass`. Then the digest, from the lines `SPEX end implement`
printed (it reads corrections.md): `Fixed on the way:` and one line for each entry: what
was found, what changed, and why. A change of the spec names the line it changed. When the
script printed `fixed on the way: nothing`, write that. Then `You answered: 1 · An agent
decided: 2`. Last, the NEXT block as the script printed it.

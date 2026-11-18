---
name: plan
description: Do the thinking for one spec. Checks its note against the code, then writes the full spec, the requirements, the tasks and the test plan in the worktree of the spec, and ends with a digest of what it filled in. Type it with a spec folder when the turn of that spec comes, or again to go on. With "auto" a decider answers and nobody is asked.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/*.md), Agent
---

# spex plan

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root. Every finding has a
`fix` text: the only place the rule is explained. Read it.

Your chat orchestrates. It starts the agents, runs the script, and holds ids and
results, never the content. The claim and its proof have different writers: the analyst
writes `spec.md` and `requirements.yaml`, the planner `tasks.yaml`, the test analyst
`tests.yaml`. You edit none of them.

Two rules hold in every part:

- **Your words stay said.** No agent changes a line marked `(you)`, and nobody rewrites
  `source.md`. A line of the person that does not fit the code is one question, never a
  guess.
- **Auto** (`auto` after the folder, or `auto: true` in `.spex/config.yaml`): nobody is
  asked. Where a part says "ask the person", one `spex:decider` answers, marked `(by
  agent)`, with its evidence and a confidence. Never tell it a question is the
  person's: none is.

## 1. The gate

The session started in the worktree of the spec (`claude -w spex/<spec>`), so the chat
and every agent you start work there. `SPEX start plan <dir>`. The argument is a spec
folder; a pasted idea goes to `/spex:new`.

- `GATE-ENTER`: this session did not start in the worktree of the spec. Nothing changed.
  Reply `⛔ NOT STARTED`, and put its fix text under `You:` as it is (`claude -w
  spex/<spec>`, then the command in that session). Never move the chat yourself: no
  skill enters or leaves a worktree. Stop.
- Any other refusal: nothing changed. Reply `⛔ NOT STARTED` with the `fix` text. It
  names the spec to plan now (`GATE-TURN`, `GATE-OPEN`), the files to commit
  (`GATE-COMMIT`: the note, or the config), a base branch to push (`GATE-PUSH`), or a
  worktree older than the note (`WORKTREE-BEHIND`). Stop.
- The first start in the worktree runs `worktree.setup` one time (`setup: … ran`).
  `WORKTREE-SETUP` is a warning: the run goes on, and it is a `Notes:` line.
- `(it was plan, started)`, or more on disk than the note: a second run. Do the parts
  again in order. Each adds only what is missing and changes nothing that holds.
  Nothing missing in a part: say so in one line, and go on.

## 2. The parts, in this order

Read a part only when the run gets there, then do it:
`${CLAUDE_PLUGIN_ROOT}/skills/plan/<part>`.

1. `fit.md`: the note against the code. Always.
2. `shape.md`: the draft of the full spec, and what is still open. Always.
3. `research.md`: only when the draft returned `facts:`. Facts come before questions.
4. `clarify.md`: only when it returned `questions:`. At most 3, on one screen.
5. `records.md`: the full spec and the requirements.
6. `tasks.md`: the tasks, then the test plan.

Before each agent, say in one line what starts: `Fit: 1 analyst`, `Research: 2 facts →
2 agents`. A `blocked` return: one more try with what it lacks. Then `⛔ STOPPED`, with
what is done and what is not.

## 3. All linked?

`SPEX end plan <dir>`. It checks line → record → task → test, stamps the four files,
writes `plan, done`, and commits on the branch of the spec.

A refusal names each gap. Send it to the writer of the file, with the finding:

- `PLAN-LINE`, `PLAN-LINE-LOST`, `PLAN-SOURCE`, a `REQ-*` or `SPEC-*` error: the analyst,
  `<dir>. Correct: <the finding>`.
- `PLAN-QUESTION`: `clarify.md`. `PLAN-UNKNOWN`: `research.md`.
- `TASK-*`: the planner. `TEST-*`: a fresh test analyst.

At most 3 tries of `SPEX end plan`. Then `⛔ STOPPED`, and name the gap. Never make a
line pass with a link to a record that does not hold it.

## 4. The digest

`SPEX report <dir> plan --status <done|concerns> --summary "…"`, with one `--concern`
for each concern an agent returned. Then the reply.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 16 lines
before NEXT.

- `**✅ PLANNED · 007 CSV export**`, then `🗂️ plan · worktree 007-csv-export · 6 records
  · 4 tasks · 9 tests`: the counts `SPEX end plan` printed.
- `The note did not fit the code:` one line for each correction, with its reason. The
  ones that changed a line of the person come first.
- `Filled in (you did not say):` every assumption, one line each, with its reason.
- In auto mode, `An agent answered:` each answer, with its evidence and confidence.
- `You answered: 1 · An agent decided: 2`, from the `answers:` line.
- `You:` what a test needs from the person (the line `the tests need:`): a token, an
  account. implement stops for it before any code is written.
- NEXT: the block `SPEX end plan` printed, as it is. Typing it approves the plan.

---
name: fix
description: Build the review fixes a person accepted, in one run — a test analyst plans each fix task's proof from the finder's failure scenario, test developers write it red, developer subagents build it, and verify proves the whole feature again — with no second approval and no question. Then the next review only checks those fixes. Use when the user says "fix", "spex fix", "fix it" after a review answer, or when a NEXT block names /spex:fix.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/SKILL.md), Agent
---

# spex fix

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root.

The fix tasks came from `spex review accept`: each carries `review`, the finder's text in
`source`, the fix plan in `instructions` and the claim in `done_when`. The person said yes
when they answered the review, so nothing here waits for a person. The wall holds: the
finder planned the fix, a test analyst plans its proof, a test developer writes the test,
a developer writes the code.

## Steps

Loop on `SPEX next <dir>`. Each pass, do the one stage it names, then ask `next` again.
Stop when the command it prints is no longer `/spex:fix`.

1. `plan-tests`: one `spex:test-analyst` per fix task without a test, all in one message:
   `<dir> <task>: <its source>`. Say `Plan: T14 T15 → 2 analysts` first. Then
   `SPEX check <dir>`; fix errors by their `fix` text.
2. `tests`: read `${CLAUDE_PLUGIN_ROOT}/skills/tests/SKILL.md` and do its steps 1 to 5.
   Each new test must be red: it is the finder's scenario, failing before the fix.
3. `develop`: read `${CLAUDE_PLUGIN_ROOT}/skills/develop/SKILL.md` and do its
   Orchestrate, every wave, with its **A wrong test** for a `test-bug`.
4. `verify`: read `${CLAUDE_PLUGIN_ROOT}/skills/verify/SKILL.md` and do its steps 1 to 5.
   A failure that becomes another fix task goes back to step 1 in this same run.
5. A stage that is not one of these (`blocked`, an approval because something else
   changed): print the NEXT block and stop.
6. `SPEX report <dir> fix --status <done|concerns|blocked> --summary "…"`, one
   `--concern` per blocked task or rewritten test.

Never ask the user. A call these steps do not cover goes to one `spex:decider` with the
question, the options, your pick and the files that decide it; take its verdict and go on.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 15 lines.
`✅ FIXED`, or `⏸ WAITING FOR YOU` when one stays blocked. One line per fix task: id, its
finding (`review`), the test that was red, ✅ or ⏸, the verify round. NEXT: the next review
checks only these fixes.

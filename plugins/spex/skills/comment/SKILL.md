---
name: comment
description: Say something about the spec that is open, at any moment — a question, or what must change. The script keeps the words in corrections.md word for word. A question is answered from the files of the spec. A change goes through the analyst, the planner and the test analyst, the script stamps the changed plan, and the reply names the one command to type. No code is written. Use when the user says "spex comment", stops a run to object, asks "why does it …", or says "it must also …" about the open spec.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Agent
---

# spex comment

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`. The argument is the person's words. It
needs no spec name: one spec is open at a time. You write no code and no test file, and you
run no other command: the reply names it, and the person types it.

## Steps

1. Keep the words first, before any agent reads them. Write them to
   `.spex/runs/comment.md`, word for word (git ignores that folder). Then
   `SPEX comment --words <file>`. With no words: `SPEX comment`, which finds a
   comment that is not finished and goes on from there. `COMMENT-NO-SPEC`: nothing
   changed; reply `⛔ NOT STARTED` with the command its fix names (plan, new, new-bug or
   delete), and stop. `GATE-ENTER`: this session did not start in the worktree of the
   open spec, and nothing is kept. Reply `⛔ NOT STARTED`, its fix text under `You:` as it
   is, and stop. No skill enters or leaves a worktree.
2. It prints the entry (`C3`), the spec, its state, `worktree: <path>` and if a plan
   exists. The session is in that worktree, and every agent you start works there.
3. Sort the words. A question gets an answer. Everything else is a change. When you
   cannot tell, it is a change. Words about another spec or about merged code: say which
   command fits, `SPEX correction <dir> --close <C> --done "not about this spec"`, stop.

## A question

Answer from the files of the spec, never from memory: `SPEX show <dir> --decisions` (who
decided it, and why), `corrections.md`, `spec.md`, `research.md`.
Give the decision, who made it, the reason and its source. Then `SPEX correction <dir>
--close <C> --done "a question: answered, nothing changed"`. Nothing else changes on disk.
Reply `💬 ANSWER`, then the NEXT block of `SPEX status`: the same command as before.

## A change

1. One `spex:analyst` with `<dir>. Comment <C>.` It puts the words into `spec.md` and the
   records, marked `(you)`, so no agent changes them later. A decision of an agent that
   the words replace is gone. `blocked` because the code makes the words not possible:
   one question block to the person, with options and a pick; their answer goes in a new
   `SPEX comment`.
2. No plan exists (step 2 said so): skip to step 5. plan writes the tasks and the tests
   when it runs again, with the person's line in the spec.
3. One `spex:planner` with `<dir>. Add: comment <C>, records <the ids the analyst
   changed>.` A done task stays as it is: a new task changes its code.
4. One `spex:test-analyst` with `<dir>. Plan a test for every claim spex show --plan
   lists.` For a record that changed and has a test already: `<dir> TSnn: <what
   changed>`, one line each in the same brief.
5. `SPEX stamp <dir> --close <C> --changed "<REQ-007-002 corrected · T06 new · TS01
   planned again>"`. It checks the links, stamps the plan, closes the entry, and commits
   on the branch of the spec. A spec that was built goes back to `implement, started`,
   because the code must follow. Refused: each finding goes to the agent that owns the
   file (the analyst, the planner, the test analyst), then the stamp again. At most 3
   tries, then reply `⛔ STOPPED` and name the gap: the entry stays open, and `/spex:comment`
   with no words goes on from there.
6. `SPEX status` for the NEXT block: plan while plan is not done, else implement.

Each agent returns ids and one line. Your context holds those, never the files.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 14 lines.
`✅ COMMENT TAKEN · <NNN> <title>`, line 2 `💬 comment · worktree <spec> · 1 record · 1 task
· 1 test changed`. `You said:` their words, as they are. What: what the spec says now,
`Marked (you).`, which tasks and tests are new, which stay done, and `No code is written.`
Then the NEXT block, and under it: `Typing it approves the change.`

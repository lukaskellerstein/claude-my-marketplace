---
name: review
description: Review the built spec, then close it. Reviewers read the diff against every record, read only. Every finding comes at once, worst first, each with a fix plan and a pick (fix, defer or skip), and the person answers in one line. A fix pick is built with no command typed. With no fix pick left it closes the spec: the base branch comes in, the later notes learn, the merge; typed again in a session on the main folder, it pulls and removes the worktree and the branch. Use when the user says "spex review", "review it", answers a review with "ok" or picks, or when a NEXT block names /spex:review.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/*.md), Agent, Write(.spex/review/*)
---

# spex review

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is). You orchestrate. Your
context holds ids, findings and results, never the diff. A brief is one line. `auto` among
the arguments, or `auto: true` in `.spex/config.yaml`, is auto mode.

## Steps

1. `SPEX start review <dir>`. Refused: reply `⛔ NOT STARTED` with its fix text, and stop;
   `GATE-ENTER` puts its fix text under `You:` as it is. The session is in the worktree
   (`claude -w spex/<spec>`), and so is every agent. No skill moves the chat.
2. The output says `the close is not finished`: read
   `${CLAUDE_PLUGIN_ROOT}/skills/review/close.md` and go on at the step it names.
3. A round that waits for its answer is never reviewed again.
   - Words after `<dir>` (`ok`, `2=defer`), or the reply of the person to the list: step 7.
   - The output says `round <n> waits for its answer: <file>`, and no answer came: read
     that file, print its list (Reply), and stop.
4. `SPEX show <dir> --review`. It prints the round, the records, the tasks, `## paths
   widened`, the file for the findings and, after a fix, a `## check` list. Do not read
   the diff and do not run the tests: the script proved them. `REVIEW-DIFF-BIG` changes
   nothing, because each reviewer reads one slice.
   - Say `Review: 4 tasks → 4 agents`. Start one `spex:reviewer` for each task, all in one
     message: `<dir> <task>. Review its slice.`
   - With a `## check` list, only its fix tasks: `<dir> <task>. Check the fix of <review
     ref>.` The return says `fixed` or `not-fixed`. A new finding there counts only at P1.
5. Give each finding its pick, from the harm and how likely it is:
   - `P1`, likely in normal use, or data loss, a security hole, a broken boundary: `fix`.
   - `P2`, a wrong result in a rare but real case: `fix` when the fix stays in the `paths`
     of one task, else `defer`.
   - `P3`, rare and harmless: `defer`. `nit`, style or names: `skip`.

   On the last round (the show says so), only a P1 is `fix`.
6. Write the file the show named, worst first. The reviewer planned each fix: what and
   where, never code. Other agents plan its test and build it.
   ```yaml
   feature: "007"
   round: 1
   findings:
     - id: F1
       severity: P2
       title: A name with a semicolon breaks the column
       file: src/export/csv.ts
       line: 42
       when: a customer name has a semicolon
       effect: the row has one column too many
       fix: quote every text field in the row writer
       done_when: a name with a semicolon stays in one column
       requirements: [REQ-007-002]
       paths: [src/export/csv.ts]
       pick: fix
   ```
   A P1, P2 or P3 needs `when` and `effect`. A `fix` pick needs `fix`, `done_when` and
   `paths`. A `defer` or `skip` pick has a `why`. No finding: `findings: []`. Then:
   - No finding: `SPEX review accept <dir> ok --by agent`, and step 7 reads its output.
   - Auto mode: one `spex:decider`, one question for each finding (`fix, defer or skip?`,
     with your pick and the file). Then `SPEX review accept <dir> <its picks> --by agent`.
   - Else print the list (Reply), and stop. The person answers in one line.
7. The answer: `SPEX review accept <dir> <the answer>`. `REVIEW-SCHEMA` or `REVIEW-FIX`:
   repair the findings file by the fix text, then accept again. `REVIEW-NONE`: no round
   waits, step 4. Its last line says the way:
   - `implement, started`: a fix pick is left, and no command is typed. Read
     `${CLAUDE_PLUGIN_ROOT}/skills/implement/wrong.md` and do its part **A fix pick of the
     review**. It ends with `SPEX end implement <dir>`. Its NEXT block names this command:
     the person types it, and the next round reads only the fixes.
   - `nothing to fix`: read `${CLAUDE_PLUGIN_ROOT}/skills/review/close.md` and do it.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first).

- **The list.** `❓ QUESTIONS · 007 CSV export · 1 finding`, line 2 `👀 review · round 1 ·
  worktree 007-csv-export`. What, at most 5 lines: the records (`5 met · REQ-007-003
  partial: <why>`), each change nobody asked for, each widened path, and the entries of
  corrections.md that step 1 printed: what an agent changed, and why. Then one block for
  each finding, a rule of `─` above each and below the last. 🟥 P1, 🟧 P2, 🟨 P3, ⬜ nit:

  ```
  1 · 🟧 P2 ── csv.ts:42 ─────────────────────────────── 👉 FIX
      A name with a semicolon breaks the column.
      When: a customer name has a semicolon.
      Effect: the row has one column too many.
      Fix: quote every text field in the row writer.
  ```

  Last: `Reply ok to take every pick, or change one: 1=defer`.
- **After a fix pick.** `✅ IMPLEMENTED · 007 CSV export`, line 2 `🔨 implement · the fixes
  of review round 1 · 5 of 5 tasks · 10 of 10 tests green`, one line for each fix, and the
  NEXT block that `SPEX end implement` printed.
- **The close.** `✅ CLOSED`: close.md says what the last reply holds.

---
name: review
description: Review a verified spex feature from its diff, read only, like a pull request review — what no test sees: unrequested changes, a broken boundary, a bug or a hole the tests missed. Every finding comes at once, worst first, each with a severity (P1 to nit), the finder's fix plan and a pick; the person answers in one word ("ok", or "2=defer 3=fix") and spex review accept turns the fix picks into fix tasks. Round 2 and later only checks the accepted fixes. Use when the user says "review", "spex review", answers a review with "ok" or picks, or after /spex:run-tests is green.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Agent, Read, Write(.spex/review/*), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/SKILL.md)
---

# spex review

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs` (it runs as it is), from the repo root.

## The answer

Arguments after `<dir>` (`ok`, `2=defer`, `F3=fix`, `all=defer`) are the person's answer to
the round that waits: run `SPEX review accept <dir> <args…>`, print its output, stop. With
no arguments and `SPEX next <dir>` at `review-accept`, print the list (step 6) from the
findings file again and stop: the round is written already. At `review-repair`, the round
is written but breaks its schema: repair the file by the `fix` text of `SPEX next <dir>
--json` (open the diff at a finding's line when a part is missing), then step 6. Never
review the code again for it.

## Steps

1. `SPEX gate review <dir>`; refused: relay the `fix` text and stop.
2. `SPEX show <dir> --review`. It writes the diff, and prints the round, the evidence, the
   requirements, the tasks, the boundaries, the deferred list and the findings file to
   write. `REVIEW-DIFF-BIG`: review per task with `--task`. Read the diff file: another
   repo's part names its files from this root (`b/../forks/ui/…`). Do not
   explore the codebase and do not rerun the tests: the script proved them.
   - **Round 1, more than three tasks:** say `Review: 6 tasks → 6 agents`, then one
     `spex:reviewer` per task, all in one message: `<dir> <task>. Review its slice.`
   - **A `## check` section (round 2 and later):** only those fix tasks, one reviewer each:
     `<dir> <task>. Check the fix of <review ref>.` A check says `fixed` or `not-fixed`;
     a new finding there counts only at P1. The other slices are not read again.
   Treat every returned finding as a claim: open the diff at its line before you keep it.
3. Spec verdict, one line per requirement: `met` by green tests, `contradicts` or
   `cannot-verify` from the diff. Then the `unrequested` changes, and one line per
   `## paths widened` entry: the person approved the plan before it.
4. Severity, one per finding, from the harm and how likely it is:
   - `P1` — likely in normal use, or data loss, a security hole, a broken boundary, a
     signature other than `produces`. Pick `fix`.
   - `P2` — a wrong result in a rare but real case. Pick `fix` when it stays in one task's
     `paths`, else `defer`.
   - `P3` — rare and harmless, or only looks wrong. Pick `defer`.
   - `nit` — style, names, taste. Pick `skip`.
   On the last round (the show says so), and past `review_rounds`, only a P1 is `fix`.
   Two kinds are the process's own work, not findings:
   - `test-bug`: start one `spex:test-developer` with `<dir> TSxx: <what is wrong>`, then
     `SPEX run <dir> --test TSxx`: red makes it a finding (the code met a wrong test).
   - `spec-gap`: route it as `/spex:run-tests` step 4 C does (read its SKILL.md).
5. Write the findings file the show named, worst first. You found it, so you plan its
   fix: what and where, never code. Others build and prove it.
   ```yaml
   feature: "007"
   round: 3
   findings:
     - id: F1
       severity: P1
       title: An export of an empty table writes no header row
       file: src/cli/commands/export.ts
       line: 42
       when: the table has no rows
       effect: the file is empty, and an import of it fails
       fix: write the header before the loop over the rows, not with the first row
       done_when: an export of an empty table holds the header line
       requirements: [REQ-007-002]
       paths: [src/cli/commands/export.ts]
       pick: fix
   ```
   A P1, P2 or P3 needs `when` and `effect`. A `fix` pick needs `fix`, `done_when` and
   `paths`. A `defer` or `skip` pick has a `why`. No finding: write `findings: []`.
   Then run `SPEX next <dir>`: it must say `review-accept`. `review-repair` means the file
   breaks its schema: repair it by the `fix` text and run it again before you reply, so the
   NEXT block under the list is the answer to it.
6. Print the list (Reply), then: no finding, or auto mode, run
   `SPEX review accept <dir> ok --by agent` and print its output. Otherwise stop: the
   person answers. Never ask the user anything but this one answer, and never write
   `tasks.yaml` yourself.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first). `✅ REVIEWED` (no
finding) or `❓ QUESTIONS`, then the spec verdict and unrequested changes in at most 5
lines. Then one block per finding, worst first, a rule of `─` above each and below the
last; the size is 🟥 P1, 🟧 P2, 🟨 P3, ⬜ nit:

```
1 · 🟥 P1 ── export.ts:42 ──────────────────────────── 👉 FIX
    An export of an empty table writes no header row.
    When: the table has no rows.
    Effect: the file is empty, and an import of it fails.
    Fix: write the header before the loop over the rows.
```

The answer line: `Reply ok to take every pick, or change one: 2=defer 3=fix.`

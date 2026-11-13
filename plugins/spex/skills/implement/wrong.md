# Something is red

The run gets here when a task stays red after its developer, a test of the whole spec is
red, a deploy failed, the review has a fix pick, or an entry of corrections.md is open.
Nobody guesses a cause. One decider names it, the agent that owns the wrong part fixes
it, and the script writes it down. `SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`.

## The cause

1. This pass is round n of this run. Past `verify_rounds` (3): stop. Reply `⛔ STOPPED`:
   what works, each red test with every verdict it got, and under `You:` the two ways on:
   `/spex:comment` to correct the spec, or `/spex:implement <dir>` again for more rounds.
2. One `spex:decider` for everything that is red, one question each: `<dir>. Q1 — TS09: is
   the test, the code, the tasks or the spec wrong? A the test, B the code, C the tasks,
   D the spec, and for D a size: small or big. Read SPEX show <dir> --verify.` For a task:
   `Q2 — T03 stays red: <the line of its developer>. The same options. Read SPEX show
   <dir> T03.`
3. Each verdict, before its fix: `SPEX correction <dir> --title "implement, round <n> ·
   <the cause>" --found "<what is red>" --was "<what was wrong>" --changed "<TS09 written
   again | T03 built again | T07 new>" --why "<the evidence, the confidence>"`. It prints
   the id (`C4`). The entry stays open until the fix is done. Never write corrections.md
   by hand.
4. Fix each by its cause: first the spec, then the tasks, the test, the code.

## A · the test

The test asserts other or more than its claim. Say `Fix test: TS09 → 1 test developer`.
One `spex:test-developer` with `<dir> TS09: <what is wrong>` writes that one test again
from its plan record, and proves it. It returns `blocked`, or the test is a session: the
plan record is wrong. One `spex:test-analyst` with `<dir> TS09: <why>`, then `SPEX stamp
<dir> --close <C-id>`, then the test developer. The run goes on where it was: `SPEX done
<dir> <task>` in develop.md, `SPEX verify <dir>` in prove.md. A fail of `SPEX done` with
the new test: the code is not finished, and one fresh developer takes the task again.

## B · the code

The test is right. A task that is not done: one fresh developer takes it again, with the
verdict: `<dir> T03. TS09 is right: <evidence>. Make it pass.` Then `SPEX done <dir> T03`.
A task that is done is never built again: one `spex:planner` with `<dir>. Add: a fix
task for TS09: <the verdict>`, then **The plan follows**, where the test analyst gets
`<dir> TS09: it also covers <the new task>`.

## C · the tasks

The code cannot be written in the task: the task is too big, or it needs a file outside
its `paths`. One `spex:planner` with `<dir>. Add: split T03` or `<dir>. Add: T03 needs
<file>`. Then **The plan follows**.

## D · the spec

The claim cannot be true. Small: one `spex:analyst` with `<dir>. Correct: <the verdict>`.
Big (it touches a line marked `(you)`, the Success, Not this, or the list of specs): one
question to the person, as a block of reply.md. Its context says what is red and why the
claim cannot hold. It has options and a pick. When the list of specs changes, the new list
is on the same screen, each spec by its name, not its number. Reply `❓ QUESTIONS`, and
stop. Their answer: `SPEX correction <dir> --title "implement, round <n> · your answer"
--you-said "<their words>" --pick "<the option, and the list they accepted>" --closed`.
Then the analyst: `<dir>. Correct: <the verdict>. The person said: <the answer>`. Only this
spec changes now: the close of review corrects the later notes from the entry. In auto
mode one `spex:decider` answers the question, the entry has `--pick "<its answer> (by
agent)"` and `--why`, and nothing stops.

Then one `spex:planner` with `<dir>. Add: <the records the analyst changed>`, and **The
plan follows**.

## A fix pick of the review

`SPEX review accept` wrote each fix pick as a fix task and as an open entry, and its
output names both (`open in corrections.md: C4 C5`). The pick was the ok. One `spex:planner` with `<dir>. Add:
the fix picks <T07 T08>` checks each fix task against the code. Then **The plan
follows**.

## The plan follows

Every change of the plan ends the same way. A done task is never written again.

1. One `spex:test-analyst` with `<dir>. Plan a test for every claim spex show --plan
   lists.` For a record that changed and has a test: `<dir> TSnn: <what changed>`, one
   line each in the same brief. Who found a problem never plans its proof.
2. `SPEX stamp <dir> --close <C-id>… --changed "<REQ-007-002 corrected · T06 new · TS10
   planned>"`. Name each entry this fix finishes: with no id it closes none. It checks
   the links, stamps the plan, approves the new records, and commits. Refused: each
   finding goes to the agent that owns the file (the analyst, the planner, the test
   analyst), then the stamp again. At most 3 tries, then `⛔ STOPPED` with the gap.
3. Read and do, in this order: `${CLAUDE_PLUGIN_ROOT}/skills/implement/tests.md` (give it
   the tests that were planned again), `develop.md` and `prove.md` of the same folder.
   Then `SPEX end implement <dir>`, and the Reply of the skill that the run began in.

## An entry that is open

`SPEX start implement` named it: a run ended in the middle. Read that entry in
`<dir>/corrections.md`. Its title says what began.

- `You said`, and no cause: a comment. One `spex:analyst` with `<dir>. Comment <C-id>.`,
  one `spex:planner` with `<dir>. Add: comment <C-id>`, then **The plan follows**.
- A fix pick of the review: that part.
- The spec, the tasks, or a fix task: start the agents of that cause again. An agent that
  finds its work done changes nothing. Then **The plan follows**.
- The spec, big, and no answer yet: ask the question again.
- The test, or a task that is built again: the plan did not change. Go on with tests.md:
  `SPEX end implement` closes the entry.

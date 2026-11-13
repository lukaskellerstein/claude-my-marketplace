# How a spex reply looks

Every spex skill ends its turn with one reply in this frame. The skill says what goes in
it; this file says how it looks. Short sentences, one idea each.

## The frame, in order

1. **Banner.** Two lines between two heavy rules of 40 `━`:

   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   **✅ PLANNED · 007 CSV export**
   🗂️ plan · worktree 007-csv-export · 6 records · 4 tasks · 9 tests
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   Line 1, bold: the verdict and what it is about. Line 2: the phase icon and name, where
   the work is, and numbers a `SPEX` command printed.
2. **What:** one to three lines: what is true now, never the steps you took. Files, pulls
   and evidence go to `SPEX report`.
3. **The digest**, when the skill has one: what an agent decided for the person, each with
   its reason, under the skill's label (`Filled in (you did not say):`). Then one line:
   `You answered: 1 · An agent decided: 2`. There is no approve: the next command the
   person types is their ok.
4. **Questions**, if any: one block each, as below, big first.
5. **You:** one line, only when the person acts before NEXT works: the token, the merge,
   the yes. Never "on ok I run `/spex:<x>`": no skill starts another. What ok takes, this
   skill does here.
6. **Notes:** one line, only with concerns: how many, and the first. A concern with another
   way out is a question with its pick.
7. **NEXT:** the block as the script printed it, the two rules included, never rewritten
   or shortened, outside the skill's line cap. It names one command, and
   typing it is the approval.

No `STATUS:` code and no agent word (`blocked`, `test-bug`, `concerns`) in the banner.
No `---`: the terminal shows three dashes.

## Verdicts

- `✅ <WORD>`: it finished. The word is the skill's: new SPECS WRITTEN, plan PLANNED,
  implement IMPLEMENTED, review CLOSED, comment COMMENT TAKEN, new-bug BUG NOTED,
  delete DELETED, init SET UP, update UPDATED. status has none: it prints the `📍` line
  of the script.
- `💬 ANSWER`: comment answered a question. Nothing changed.
- `⏸ WAITING FOR YOU`: one step is the person's (`You:`).
- `⛔ NOT STARTED`: a gate refused, nothing changed. What says what is missing.
- `⛔ STOPPED`: it started and could not finish. What says what is done, what is not.
- `❓ QUESTIONS`: it goes on with the answers.

Icons: 🧭 init, update · 🔍 new · 🗂️ plan · 🔨 implement · 👀 review · 💬 comment ·
🐞 new-bug · 🗑️ delete · 📍 status.

## A question

```
────────────────────────────────────────

### 1 · 🟥 BIG · Does a big export run in the request, or in a background job?

**Context:** a 50 MB export takes about 40 s, and the proxy ends a request at 30 s.

- **A** — a background job, then a download link · costs a job queue
- **B** — in the request, streamed · fails past 30 s

👉 **Pick: A.** It is the only one that works for big tables.

────────────────────────────────────────
```

- The heading is one closed question that ends with `?`: yes or no, or one option.
- Size: 🟥 BIG the idea does not work without the answer · 🟧 MEDIUM it changes scope,
  cost or a decision · 🟨 SMALL wording.
- **Context** is one to three lines: the facts the pick rests on. Each block stands
  alone: a word from earlier gets its meaning again.
- **👉 Pick** is what "ok" takes, and the person says ok nearly every time. So it is the
  option with the best result for their goal, and its reason names that result: never
  "the rule says" alone, never a work-around for a missing spex feature (name the gap).
  What the person said or did already (a line of their text, a deleted folder, a
  decision in their design) is their answer: a pick never drops it. Read each pick as
  them before you send it. Money, time or no undo: say it, with the number.
- A question with one option is no question. List those once, after the blocks, under
  `I do this unless you say no:`, one line each, numbered on.
- Every question known by then is on one screen. Under the last rule, one answer line:
  `Reply ok to take every pick, or change one: 2=B`.

# How a spex reply looks

Every spex skill ends its turn with one reply in this frame. The skill says what goes in
it; this file says how it looks. The person is busy: they read the banner, then what needs
them, then NEXT. The terminal colors no text, so the emoji carry the color. Short, plain
sentences, one idea each.

## The frame, in order

1. **Banner.** Two lines between two heavy rules of 40 `━`:

   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   **✅ IMPLEMENTED · T13 · an export of an empty table keeps its header row**
   🔨 develop · specs/007-csv-export · 12 of 13 tasks done
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

   Line 1, bold: the verdict, then what it is about. Line 2, plain: the phase icon and
   name, the folder, where it stands, in numbers a `SPEX` command printed, and the
   replies left when the skill knows them (`reply 1 of 2`).
2. **What:** one to three lines: what is true now, for the user, never the steps you
   took. Files, pulls and evidence go to `SPEX report`.
3. **Questions**, if any: one block each, as below, big first.
4. **You:** one line, only when the person acts before NEXT works: the click, the
   variable, the yes. Never hidden in a paragraph.
5. **Notes:** one line, only with concerns: how many, and the first.
6. **NEXT:** `SPEX next <dir>` as printed, the two rules included, never rewritten or
   shortened. It does not count toward the skill's line cap.

No `STATUS:` code and no agent word (`blocked`, `test-bug`, `concerns`, `refused`) in the
banner: those are for the agents. No `---`: the terminal shows three dashes.

## Verdicts

- `✅ <WORD>`: it finished. The word is the skill's: approve APPROVED, clarify CLARIFIED,
  develop IMPLEMENTED, fix FIXED, init SET UP, new SHAPED (ROADMAP WRITTEN after round 0), requirements RECORDS WRITTEN,
  research DECIDED, review REVIEWED, ship SHIPPED, tasks PLANNED, tests TESTS WRITTEN,
  update UPDATED, verify VERIFIED.
- `⏸ WAITING FOR YOU`: it did what it could; one step is the person's (`You:`).
- `⛔ NOT STARTED`: a gate refused, nothing changed. What says what is missing.
- `⛔ STOPPED`: it started and could not finish. What says what is done, what is not.
- `❓ QUESTIONS`: it goes on with the answers (the blocks).

Phase icons: 🧭 init, update · 🔍 sizing · 💎 shaping · ✍️ approve · 📜 requirements ·
❓ clarify · 🔬 research · 🗂️ tasks · 🧪 tests · 🔨 develop · 🔎 verify · 👀 review ·
🔧 fix · 🚀 ship.

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
- **Context** is one to three lines: the facts the pick rests on. A word from earlier in
  the chat gets its meaning again: each block stands alone.
- **👉 Pick** is what "ok" takes, and the person says ok nearly every time. So it is the
  option with the best result for their goal, and its reason names that result: never
  "the rule says" alone, never a work-around for a missing spex feature (name the gap).
  What the person did already (deleted folders, a branch) is their answer, not a
  question. Read each pick as them before you send it. Money, time or no undo: say it,
  with the number.
- A question with one option is no question. List those once, after the blocks, under
  `I do this unless you say no:`, one line each, numbered on.
- Under the last rule, the skill's answer line, so one word answers.

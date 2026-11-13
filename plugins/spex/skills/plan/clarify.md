# Clarify: the questions only the person can answer

The run gets here only when the draft returned `questions:`. A run with no question
never reads this file. At most 3 gap questions in a run, all on one screen. Everything
else is an assumption with a reason.

## 1. The screen

Reply `❓ QUESTIONS` in the frame of `reply.md`: one block for each question, big first.

- A block: one closed question, **Context** with the facts the pick rests on (a fact of
  the research with its source), 2 to 5 options, and `👉 Pick`.
- If the spec does not say why the feature exists, that is the first question.
- `falls away if 1 is B` under a question that another answer settles.
- The work a decision brings (a schema value, a fixture) is a line under `I do this
  unless you say no:`, never a block.
- Under the blocks, one line: how many gaps the agents filled. The digest lists them.
- No NEXT block: the answer is the next step. The answer line is the one of `reply.md`.

## 2. The answer

- `ok` takes every pick: each is `by: default`. An answer the person gave is `by:
  human`.
- An answer by number (`2=B`) or in their words: take it as they said it. Words that
  fit no option are the answer. Do not press them into an option.
- `auto` as the answer: every open question takes the auto branch, these and the rest
  of the run.
- An answer that opens a new gap: a small one is an assumption. Ask again only for a
  question by the rules of `shape.md`, and never more than 3 in the run.

## 3. Auto mode

Nobody is asked. Start one `spex:decider` for the spec with `<dir>. Answer: <each
question, with its options and the pick>`, the facts of the research, and the code a
question points at. Never tell it a question is the person's: none is.

- For each question it returns answer, evidence, confidence, needs.
- A `needs` you can meet (a file, a section), or a new question its verdicts raise: give
  it, and ask the same agent again.
- Every verdict is `by: agent`, with `evidence` and `confidence`, and one line of the
  digest under `An agent answered:`.
- A need only the person has (a token, an account) is no question. It is a `You:` line
  of the digest, and implement stops for it.

## 4. Hand the answers on

Hold one line for each answer: its number, the answer, and who gave it (`you`, `by
agent` with the evidence and confidence, or `the pick, nobody asked`). The lines go
into the brief of `<dir>. Spec.` in `records.md`. The analyst writes them into
`questions[]` and under Decisions: `D3 … (you, question 1)`.

An answer that changes a line the person gave before is an entry of `corrections.md`
too. The script writes it:

```
SPEX correction <dir> --title "plan · your answer changed a line of yours"
  --you-said "<the answer, word for word>" --was "<the old line>"
  --changed "<the new line>" --closed
```

Nothing open, and no gap you can name: change nothing, and say so.

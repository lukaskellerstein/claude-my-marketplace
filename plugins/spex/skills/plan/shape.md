# Shape: the draft, and what is still open

The run gets here when the note fits the code. One analyst drafts the full spec. Then
you sort what it could not settle.

## 1. Draft

Say `Draft: 1 analyst`, then start one `spex:analyst` with `<dir>. Draft.` It fills
every section of `spec.md` from the note, `source.md`, what the closed specs built
(`SPEX show <dir> --inherited`) and the code. It returns:

- `assumed:` each small gap it decided, with its reason.
- `facts:` what it needs and cannot know without a source.
- `questions:` what only the person can fill: at most 3, each closed, with options and
  a pick.

## 2. Sort what is open

There are three kinds, and only two leave the draft.

- **An assumption** stays. The agent decides a small gap and writes the reason: the
  smallest sensible choice that fits the code and the person's Why. Hold the list: the
  digest prints it under `Filled in (you did not say):`.
- **A missing fact** goes to `research.md`: a library, a version, a limit, how an API
  behaves. Never from memory, and never asked of the person when a source has it.
- **A question** goes to `clarify.md`: only when the answer changes what gets built and
  no source has it (what the readers of a file expect, a business rule), or when it
  touches money, law, security, or data that is kept or leaves the repo.

Check the return before you go on:

- More than 3 questions: send it back once, `<dir>. Draft. At most 3 questions: keep
  the ones with the most impact and doubt, decide the rest.`
- What the note, a Decision, an Alternative, a `[changes: …]` line or a closed spec
  answers already is no question: nothing is asked twice. Two rules in two places are
  no conflict.
- A question with one sensible option is an assumption.
- A question about a fact (`which encoding does Excel read?`) is a fact.
- An Open question of the note: its `Pick:` is the recommendation. `Settles:` names a
  measurement (a fact) or a person (a question).
- A fact only the person has (a date, an account, a token) is a `You:` line of the
  digest, never a pick.

## 3. Facts first, then questions

`facts:` → `research.md`. Then the analyst looks again: `<dir>. Draft. Facts: <one line
each, with its source>`. It returns what is open now. A fact no source gave is not
researched twice: it is a question when only the person knows it, else an assumption
with the reason `no source found`, marked low.

`questions:` → `clarify.md`. Nothing open: say so in one line, and go to `records.md`.

## What a draft holds (the analyst reads this)

- Think in this order: goal, users, boundaries, constraints, success with a number.
- **What** has one Mermaid diagram: trigger, steps, result. No other code in the file.
- Plain words and real values (`a 50 MB file`, `exit code 3`), never "fast" or "big".
- **Success** names only what this spec or the specs in its `depends_on` build.
- **Constraints** come from the code, each with its file.
- Use the names `SPEX show <dir> --inherited` gives, exactly.
- Check each Uses line against the code. A name the code lacks is a misfit: return it.
- A spec of a roadmap keeps Uses and Introduces true (`SPEX check <dir>` tests them),
  names another spec by its folder, and writes a move of design scope as a Decision
  that names the folder it moves to.
- Delete the `<!-- hint -->` of every section you fill. From your idea stays line for
  line, each with its link.

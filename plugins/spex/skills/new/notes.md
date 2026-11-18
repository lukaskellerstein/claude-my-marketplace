# The notes of new

The run gets here when the list is settled: one spec, or the person's ok. It writes one
note for each spec, checks that every detail is in a note, has a second agent read them,
and, after the person's yes, commits and pushes. A note holds all the person or the
design says for its spec, so plan never has to find it again.

## 1. One `SPEX new` for each spec, in the order of the list

It prints the folder, `specs/NNN-slug`. Name a spec by its folder from here on,
`014-pdf-export`, never "step 014".

- **Pasted text:** `SPEX new <slug> --words .spex/runs/words.md`. The script copies the
  text to `source.md` in the folder, word for word. Many specs: the same `--words` for
  each, so every folder has the text, and `--depends-on <dir,dir>` for what it builds on.
- **A file the person named** stays where it is: `--source <file#section>` for each
  section the spec takes, or `--source <file>` when `SPEX outline` lists no section.
- **Many specs from a design:** first `SPEX roadmap <name> --init --source <file or
  folder>…`, which writes `specs/<name>.roadmap.md`. Then each note with `--roadmap <name>
  --step <n> --depends-on <dirs>`, and a `--source <file#anchor>` for every section its
  rows give it and every section that defines a name it uses or what happens when it
  fails. A config file, a signal list, a record layout, a failure table are often in a
  reference chapter, not in the story.
- `--number <n>` on the first note when the repo numbers its specs elsewhere too.

## 2. Fill each note

Delete the `<!-- hint -->` of every section you fill.

- **Why, What, Not this:** three lines each.
- **From your idea** (a text): every detail the person gave for this spec, one bullet
  each, in their words, with its link: `- separator: semicolon ← source.md#L5`. One
  detail over some lines: `#L5-L7`. Add nothing and drop nothing: no guess, no better
  wording. A line that belongs in no spec is a bullet too, in the first note, with its
  reason: `- (left out: a greeting) ← source.md#L1`.
- **From the design** (a note of a roadmap): all its sections say for this spec: every
  name, key, value, file, command, label, check, signal, record path, and failure with
  what follows it. One bullet each, with its `#anchor`, and a tag at the end: `[new]`,
  `[built: spec 24]` or `[changes: spec 21]`. No cap: what the design fixes is written
  now.
- **Uses:** each name it needs from another spec: `` `name` ← <folder> ``, `← built
  (where)` or `← outside (who)`. A name from a spec it does not depend on is a missing
  `depends_on`: add it.
- **Introduces:** each name it brings: `` `name`: what it is ``. One name, one spec.
- **Open questions:** what the text or the design leaves open for this spec. new asks
  none of them: plan does. Each ends `Pick:` (the design's, else your best, and why) or
  `Settles:` (a measurement, a named person); else `SPEC-OPEN-PICK`.
- A note that narrows or moves what the design says writes it under Not this, in both
  notes: `narrows #export: the PDF moves to 014-pdf-export`.
- What the code says waits for plan: the specs before this one change the code.

## 3. The roadmap file, for many specs from a design

Fill Idea, Order (each change to the design's order, each merge, each split: one line
with its reason), Outside, Decisions (scope, not planned, order: who said it, when) and
every Coverage row: the folders that build it, or `built` (by what), `not planned` (why),
`outside` (who), `context` (why). A row covers the sections under it. Give a child its
own row when it differs.

## 4. The check: every detail is in a note

- **A text:** `SPEX cover <first folder>/source.md <dir>…`, with every new note. For a
  file with no section: `SPEX cover <file> <dir>…`, and the links say `← <file
  name>#L5`. It prints `7 of 7 line(s) … kept`. A `COVER-LINE` gap names a line: put its
  detail in the note it belongs to.
- **A design:** `SPEX roadmap <name> --coverage` and `SPEX check <dir>…`, until neither
  has an error or a warning you did not answer under Decisions. `ROADMAP-NAMES` lists
  what a section fixes and no note carries: write each into its note, or under Names
  left out in the roadmap file with why (built, an example).
- At most 3 tries of the check. Then stop and name the lines or the sections that are in
  no note. Never link a line to a note that does not hold its detail.

## 5. The second read

The writer never checks its notes alone. Say `Second read: 12 notes → 2 agents`, then
start one `spex:roadmap-reviewer` for each 10 notes, all in one message. Tell each its
folders and what to read them against: `<dir>/source.md` or the file for a text, the
roadmap file and the design files for a design.

- A lost detail goes back to its note, with its link. A `tag` finding becomes an Open
  question. A `row` finding corrects the row, or you answer it under Decisions.
- A finding only the person settles is an Open question of that note, with a pick. new
  does not stop for it.
- After any change: step 4 again. The reviewers run one time.

## 6. The yes, then commit and push

The worktree of a spec starts from the remote (`claude -w` fetches it), so a note must be
committed and pushed. A push is outward: it waits for the yes, also in auto mode.

1. `SPEX commit --preview` changes nothing. It prints the files and `ask: Commit and
   push to origin/main?`, with the names of this repo.
2. Reply `❓ QUESTIONS`, one block with that heading word for word:
   `### 1 · Commit and push to origin/main?`. Context: the folders. Pick: yes. Stop.
3. The yes (`ok`, `yes`): `SPEX commit --approved --message "spex: notes for <the
   idea>"`: it commits `specs/` on the base branch and pushes it. Anything else: their
   words change the notes; step 4 and 5 again for what changed, then ask again.
4. `COMMIT-PUSH` (a failed push) goes under `You:`, with its fix text.

Never run `SPEX commit --approved` before the yes, nor `git commit` or `git push`.

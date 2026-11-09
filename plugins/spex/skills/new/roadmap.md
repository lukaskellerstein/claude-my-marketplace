# Round 0 for a roadmap

Read this when sizing says roadmap, and when a roadmap of this idea exists already. The goal: every
design section has a step or a reason, the same input gives the same list, and each stub holds all the
design says for its step, so no later round has to find it again.

## 1. The units come from the design, not from a reading of it

1. `SPEX outline <file>` for every design file. Its sections are the units. Another format than
   Markdown or HTML: convert it as the error says, and cite the copy.
2. The design's own list of work comes first, when it has one: a gaps table, phases, a "what is left"
   or today-against-target table, the "designed, not built" Status lines of its ADRs. So does its own
   order of work. Mark each unit from those and from the code: built, partly built (what is left), new.
   A `built` row names what built it; what a status line calls built in part is a step for the rest.
3. One unit is one step by default. Merge two only when one cannot show a Success alone. Split a unit
   with more than 3 new parts or more than 2 scopes (`limits.step_introduces` counts the names).
4. Order: the design's own order, then the dependencies. Each change to it, each merge and each
   split gets one line under Order in the roadmap file, with its reason. "Thin path first" is no
   reason by itself: name what the earlier step unblocks.

## 2. A re-cut starts from what exists

When `SPEX roadmap <name>` lists steps or `specs/<name>.roadmap.md` exists: start from that
list. Show it as keep, change, add and drop, one line each with the reason, and ask only
about the changes. A kept step keeps its folder; an added one gets `SPEX new`; a dropped one gets
`SPEX drop <dir> --reason "…"`, which keeps its work in `.spex/archive/`. Never delete a folder by hand.
Step folders that git HEAD holds and the working tree deletes, the person deleted: that is
their answer. Cut fresh, never offer to restore them, and name them once under What.

## 3. The list the person edits

It is in the first reply, drafted with every pick taken, so the person sees the scale before
any answer. One table: number, slug, goal in one line, `depends_on`, the sections it covers.
Each question says what its other options change in it (`B drops 012–015`). "ok" takes the
picks and the table; the next reply writes it (§ 4). Round 0 is these two replies. Under it:

- **Not planned**, each with its reason. What the design lists to build is not planned only by a question.
- **Outside**: what a Success needs that no step builds (a service, a test suite, a test account, an
  environment, code in a repository that is not in `repos` of `.spex/config.yaml`): where it lives,
  who does it, which step waits for it. Code in a repo of `repos` is a step: its tasks name the repo.
- **The design's open items**: every proposal, "my pick", "X picks", TBD and "open for you" entry, with
  the step it changes. It becomes that step's Open question, with the design's pick as the
  recommendation. Never a fact.

The questions are what changes the list: which documents are in scope, whether UI work is in
the steps or outside. The same answers must give the same list.

## 4. Write it, then check it

1. `SPEX roadmap <name> --init --source <file>…` writes `specs/<name>.roadmap.md`. Fill Idea, Order,
   Outside, Decisions (scope, not planned, order: who said it, when) and every Coverage row: the step
   folders that build it, or `built` (by what), `not planned` (why), `outside` (who), `context` (why).
   A row covers the sections under it; give a child its own row when it differs.
2. One `SPEX new` per step, in order: the first `--shaping` (with `--number <n>` when the repo
   numbers its specs elsewhere too, as `docs/briefs/28`), the rest `--planned`, each with
   `--roadmap <name> --step <n> --depends-on <dirs>` and a `--source <file#anchor>` for every section its
   rows give it and every section that defines a name it uses or what happens when it fails (a config
   file, a signal list, a record layout, a policy file, a failure table are often in a reference
   chapter, not in the story).
3. Fill every stub (below), then run `SPEX roadmap <name> --coverage` and `SPEX check` until
   neither has an error or a warning you did not answer under Decisions. `ROADMAP-NAMES` lists
   what a step's section fixes and no stub carries: write each into that stub, or under Names
   left out in the roadmap file with why (built, an example); a `file#section` there leaves out all.
4. Review: one `spex:roadmap-reviewer` per 10 stubs, in one message, each told its folders, the
   roadmap file and the design files. Apply each finding to its stub (a `tag` becomes an Open
   question) or its row, or answer it under Decisions; one only the person settles is a question
   of reply 2. Then step 3 again.
5. Reply 2: `✅ ROADMAP WRITTEN`, the counts, what changed since the table. No question is open, so
   the answer line says what ok does: `ok starts round 1 of <first step's folder>`.

## A stub

- **Why, What, Not this**: three lines each.
- **From the design**: all its sections say for this step: every name, key, value, file, command,
  label, check, signal, record path and failure with what follows it, one bullet each, with its `#anchor` and a tag at the end:
  `[new]`, `[built: spec 24]` or `[changes: spec 21]`. No cap: what the design fixes is written now.
- **Uses**: each name it needs from another step, `` `name` ← <folder> ``, `← built (where)`, or
  `← outside (who)` for what the Outside section lists. A name from a step it does not depend on is a
  missing `depends_on`: add it.
- **Introduces**: each name it brings, `` `name`: what it is ``. One name, one step.
- **Open questions**: the design's open items for this step, sized, with the design's pick. It has
  none: your best pick and its reason, or what settles it (a measurement, a named person).
- Its Success, the design's "done when", names only what this step or its dependencies build.
- When it narrows or moves what the design says (a station to a later step, another value), say so
  under Not this and as a Decision in both steps: "narrows #export: the PDF moves to 014-pdf-export".
- Name another step by its folder, `014-pdf-export`, never "step 014".
- What the code says (Constraints, research) waits for its shaping: the steps before it change the code.

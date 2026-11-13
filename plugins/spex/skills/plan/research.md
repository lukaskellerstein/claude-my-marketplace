# Research: one researcher for each missing fact

The run gets here only when the draft returned `facts:`. A run with no missing fact
never reads this file. If there are none, say so and go on.

1. Say it first, in one line: `Research: 3 facts → 3 agents`. Then start one
   `spex:researcher` for each fact, all in one message, so they run at the same time.
   Give each one line: the question, what its answer decides, and where to look (the
   dependency manifest, the module it names, a contract, the documentation of the
   library).
2. Each returns the answer, the sources it opened, a confidence, and what it did not
   find. Facts come from sources, never from memory: an answer with no source is no
   fact. Do not read the pages or the codebase yourself.
3. Write `<dir>/research.md`, one section for each fact, with the heading `## U1 —
   <the question>`: the options that were looked at, the answer, why, and the sources
   (file paths, URLs, versions). The file is for people, and `/spex:comment` answers a
   "why" from it. No later run reads it whole. A second run adds sections, and changes
   none.
4. Hold one line for each fact. It carries its reason and its source:
   `U1: csv-stringify 6.x, because the repo depends on it already (package.json:14)`.
   That one line is what the planner and the developer will see. The analyst writes it
   as the `decision` of an unknown in `requirements.yaml`, with `ref: research.md#u1`.
5. Research changes no line of the person and no decision. A finding that shows a line
   of the note is wrong is a misfit: size it as `fit.md` says. A finding that opens a
   choice only the person can make is a question for `clarify.md`.
6. A fact with a low confidence, or one no source gave: say so in its line. It is a
   question when only the person knows it, else an assumption with its reason, marked
   low.
7. Go back to `shape.md`, step 3: the analyst looks again, with these lines.

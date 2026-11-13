# Records: the full spec and the requirements

The run gets here when nothing is open: every fact has a source, and every question has
an answer. The analyst writes the claim, `spec.md` and `requirements.yaml`, never its
proof: `tests.yaml` is the test analyst's file, and the analyst does not open it.

## The run (your chat)

1. Say `Spec and records: 1 analyst`, then start one `spex:analyst` with `<dir>. Spec.`
   and, under it, what you hold: the answers (number, answer, who gave it), the facts
   (one line each, with its source) and the assumptions.
2. On its return, `SPEX check <dir>`. An error goes back with the findings: `<dir>.
   Correct: <the findings>`. At most three rounds. Then stop and list what is left.
3. "records exist": a second run. The analyst adds only what the spec has and the
   records lack. Nothing missing: change nothing, say so.

## The full spec (the analyst reads this)

- **From your idea:** the same lines, each with its link, marked `(you)`. Each ends with
  `→ REQ-007-001` (more ids when it needs them) or `→ no record: <why>` (a wish with no
  behavior, a line another spec builds). A line tagged `[built: …]` needs none. Never
  drop a line, and never reword one.
- **Decisions:** each says who made it and why. `D1 … (by agent, high|medium|low)` with
  `Why:`; `D3 … (you, question 1)`; a fact is `(by agent, high)` with its source. Every
  assumption is a decision. A line marked `(you)` is fixed for every agent after this.
- **Alternatives** with the pick. **Success** with numbers. **Constraints** from the
  code.
- Every hint is gone. Plain words, real values, no code but the one Mermaid diagram.

## The records (the analyst reads this)

`requirements.yaml`: `feature` (quoted: `"007"`), `slug`, `title`, `goal` (what changes
for whom), `out_of_scope`, `interfaces` (`id`, `kind`: http-api | cli | ui | ipc | event
| library | job, optional `contract`), `glossary` for words in a narrow sense,
`questions`, `unknowns`, `requirements`.

- One record for each behavior. `text`: one EARS sentence about an interface, never
  about internals (`The CLI shall exit with code 3`, not `ExportService shall call the
  validator`). One `shall`, one duty. Shapes: `The X shall …` · `When T, …` · `While S,
  …` · `Where F, …` · `If U, then …`. Set `type` to match.
- `acceptance`: at least one scenario with real values (a list name, a count, an exit
  code), ids `AC-1`, `AC-2`. A number with a unit in `text` needs `measure` on a
  scenario: the Success section has the numbers. A scenario says what is observed,
  never how it is tested: no file, no tool, no person.
- `scope`, `applies_to` (interface ids), `priority`, `status: draft`. The script flips
  the status when implement starts.
- `source`: where it came from: `spec#L12`, `Q1`, `U1`, `bug`, or `assumption` with the
  reason in `rationale`.
- `questions[]`: every question that was asked: `id`, `ask`, `why`, 2 to 5 `options`
  with one `recommended`, `answer`, `by: human | agent | default`. An agent's answer has
  `evidence` and `confidence`.
- `unknowns[]`: every fact of the research: `id`, `ask`, `decision` (one line that
  carries its reason), `ref` (`research.md#u1`).
- "Not this" becomes `out_of_scope`, and unwanted-behavior records where the code must
  refuse.
- A record never contradicts what a closed spec settled (`SPEX show <dir> --inherited`).
  One that builds on such a record: `relationships` with `depends-on` and its id.
- `SPEX index --scope <scope>` for each capability the spec touches. A contradiction
  with a live record is `conflicts-with`, and a question.
- A record that is on the base branch already is never edited. Write a new one with
  `relationships: [{type: supersedes, target: <old id>}]`.
- An interface that other code or people call gets a file under `<dir>/contracts/`
  (OpenAPI, JSON Schema, CLI usage, IPC events). `interfaces[].contract` points at it.
- YAML: block style for values with text. Quote a value with a colon, a comma or a
  leading backtick.

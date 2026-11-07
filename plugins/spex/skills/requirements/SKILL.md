---
name: requirements
description: Turn an approved spec folder (made by /spex:new) into requirements.yaml — EARS records with real-valued scenarios, questions, unknowns — make it pass spex check, settle the questions (the decider in auto mode, the user otherwise) and the unknowns, then have a test-analyst subagent write the proof plan (tests.yaml) for every scenario, so the next stop is /spex:approve. Use when the user says "requirements", "spex requirements", "write the records", or after /spex:new ends.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/SKILL.md), Agent, WebSearch, WebFetch
---

# spex requirements

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root. Every finding
has a `fix` text: the only place the rule is explained; read it.

You are the analyst: you write the claim (the records and their scenarios), never its proof:
`tests.yaml` is the test analyst's file, and you do not open it.

## Inputs you read

- The argument is a spec folder under `specs/`, nothing else. `SPEX gate requirements
  <dir>` opens it only when `spec.md` says `status: ready`. Refused: relay its `fix` text
  and stop; a document, a pasted idea or a shaping folder goes to `/spex:new`.
- `spec.md`. Its Open questions carry sizes: `●●●` and `●●○` become questions or unknowns,
  `●○○` become assumptions with a `rationale`.
- `SPEX show <dir> --inherited` when `spec.md` names `depends_on`: what the steps this one
  builds on settled. A record never contradicts them; a change is a `supersedes` record.
- `SPEX index --scope <scope>` for each capability the spec touches: a few live records,
  never other feature folders. A contradiction becomes `conflicts-with` plus a question.

## Steps

1. `SPEX gate requirements <dir>`. Refused: report the `fix` text and stop. Open with
   "records exist": a rerun. Add only what the spec has and the records lack; nothing
   missing: change nothing, say so, go to step 8 (an `untested:` line still gets step 10).
2. Write `specs/NNN-slug/requirements.yaml` with `feature` (quoted: `"007"`), `slug`, `title`,
   `goal` (what changes for whom), `out_of_scope`, `interfaces`
   (`id`, `kind`: http-api | cli | ui | ipc | event | library | job, optional `contract`),
   `glossary` for words in a narrow sense, `questions`, `unknowns`, `requirements`.
3. One record per behavior:
   - `text`: one EARS sentence about an interface, never about internals ("The CLI shall
     exit with code 3", not "ExportService shall call the validator"). One `shall`, one
     duty. Shapes: `The X shall …` · `When T, …` · `While S, …` · `Where F, …` · `If U,
     then …`. Set `type` to match.
   - `acceptance`: at least one scenario with real values (a list name, a count, an exit
     code); ids `AC-1`, `AC-2`. A number with a unit in `text` needs `measure` on a scenario
     (the spec's Success section has the numbers). A scenario says what is observed, never
     how it is tested: no file, no tool, no person.
   - `scope`, `applies_to` (declared interface ids), `priority`, `status: draft`.
   - `source`: where it came from — `spec#L12`, `Q1`, `U1`, `assumption`, `bug`.
   - A record that builds on an earlier step's record: `relationships` with `depends-on`
     and that id, so `spex check` warns when the target is superseded later.
   - Where the spec is silent, make the smallest sensible assumption (`source: assumption`,
     the reason in `rationale`); one that touches money, law, data retention or security
     is a question instead.
4. Questions are for a person: `id`, `ask`, `why`, 2 to 5 `options` with one `recommended`.
   Ask only when the answer changes what gets built; technical questions go to `unknowns`
   (`id`, `ask`) for research.
5. The spec's Decisions and Alternatives stay decided: an unknown with its `decision`
   filled, or a `rationale` on the record it shaped. Nothing is asked twice. "Not this"
   becomes `out_of_scope` and unwanted-behavior records.
6. YAML: block style for values with text; quote a value with a colon, a comma, or a
   leading backtick.
7. `SPEX check <dir>`. Fix every error by its `fix` text. At most three rounds; then stop
   and list what is left.
8. The questions, now: if any has no answer, read `${CLAUDE_PLUGIN_ROOT}/skills/clarify/
   SKILL.md` and do its steps 4 to 7 here. In auto mode (`auto` among the arguments, or
   `auto: true` in `.spex/config.yaml`) the decider answers them; otherwise the user does.
9. The unknowns, now: if any has no `decision`, read `${CLAUDE_PLUGIN_ROOT}/skills/
   research/SKILL.md` and do its steps 2 to 7 here. A question it adds goes back to step 8.
10. The proof plan, once the records are settled: say `Plan the tests → 1 analyst`,
    then start one `spex:test-analyst` with `<dir>. Plan a test for every scenario spex show
    --plan lists.` It writes `tests.yaml`. Then `SPEX check <dir>`: a `TEST-*` error or a
    `TEST-COVER` gap goes back to a fresh analyst with the findings, once. A `blocked`
    return names a scenario no test can observe: fix the scenario, then step 10 again.
11. `SPEX report <dir> requirements --status <done|concerns> --summary "…"`, one
    `--question "Q1: …"` per open question, one `--concern` per analyst concern.

`/spex:clarify` and `/spex:research` are steps 8 and 9 as commands: the way back in when a
question or an unknown opens later.

## Reply

At most 15 lines. `STATUS:` first, then the folder, the record count, the questions with
their answers and who gave them, the research decisions, the assumptions, the plan
(scripts, sessions with `why`, `needs`, `touches`). Last, the output of `SPEX next <dir>`,
as printed: it picks the next command from the data, never from the path taken.

The NEXT block is copied as `SPEX next` printed it, the two rules included, never rewritten
into prose or shortened, and it does not count toward the line cap.

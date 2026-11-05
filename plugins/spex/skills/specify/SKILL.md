---
name: specify
description: Turn a brief (a file or the user's words) into specs/NNN-slug/requirements.yaml — EARS requirement records with real-valued scenarios, questions for a person, unknowns for research — then make it pass spex check. Use when the user says "specify", "write the spec", "spex specify", "turn this brief into requirements", or hands over a feature description to formalize.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex specify

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root. Add `--json` for
fields. Every finding has a `fix` text: it is the only place the rule is explained, so read it.

## Inputs you read

- The brief: a file path, or the user's words (write them to `brief.md` first).
- `SPEX index --scope <scope>` for each capability the brief touches: a few live records, never
  other feature folders. A contradiction becomes `conflicts-with` plus a question.
- A contract file only when the brief names it.

## Steps

1. No folder yet: `SPEX new <slug> --brief <file>`. It prints `specs/NNN-slug`.
2. Write `specs/NNN-slug/requirements.yaml` with `feature` (quoted: `"007"`), `slug`, `title`,
   `brief`, `goal` (one or two sentences: what changes for whom), `out_of_scope`, `interfaces`
   (`id`, `kind`: http-api | cli | ui | ipc | event | library | job, optional `contract`),
   `glossary` for words used in a narrow sense, `questions`, `unknowns`, `requirements`.
3. One record per behavior:
   - `text`: one EARS sentence about an interface, never about internals. "The CLI shall exit
     with code 3" is right; "ExportService shall call the validator" is wrong. One `shall`, one
     duty. Shapes: `The X shall …` · `When T, the X shall …` · `While S, the X shall …` ·
     `Where F, the X shall …` · `If U, then the X shall …`. Set `type` to match.
   - `acceptance`: at least one scenario with real values (a list name, a count, an exit code);
     ids `AC-1`, `AC-2`. A number with a unit in `text` needs `measure` on a scenario.
   - `scope`, `applies_to` (declared interface ids), `verification` (`mode`, `method`, and a
     `rationale` for implementation-aware or inspection), `priority`, `status: draft`.
   - `source`: where it came from — `brief#L12`, `Q1`, `U1`, `assumption`, `bug`.
   - Where the brief is silent, make the smallest sensible assumption: `source: assumption`
     and the reason in `rationale`. If the assumption touches money, law, data retention or
     security, write a question instead.
4. Questions are for a person: `id`, `ask`, `why`, 2 to 5 `options` with one `recommended`.
   Ask only when the answer changes what gets built. Technical questions nobody has to decide
   go to `unknowns` (`id`, `ask`) for research.
5. A brief that already carries decisions keeps them: an unknown with its `decision` filled,
   or a `rationale` on the record it shaped. Nothing is asked twice.
6. YAML care: block style, never `{a: x, b: y}` for values with text; quote a value that holds
   a colon, a comma, or starts with a backtick.
7. `SPEX check specs/NNN-slug`. Fix every error by its `fix` text. At most three rounds; then
   stop and list what is left.
8. `SPEX report specs/NNN-slug specify --status <done|concerns> --summary "…"`, one
   `--question "Q1: …"` per open question.

## Reply

At most 15 lines. `STATUS:` first, then the folder, the record count, the open questions,
and the assumptions you made.

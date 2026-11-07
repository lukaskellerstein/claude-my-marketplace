---
name: research
description: Decide the open unknowns of a spex spec — library choices, versions, how an existing API behaves — and write research.md plus a one-line decision per unknown into requirements.yaml. Use when the user says "research", "spex research", "resolve the unknowns", or when spex gate plan reports GATE-UNKNOWN. It changes no requirement.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Agent, WebSearch, WebFetch
---

# spex research

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. Read `unknowns[]` in `<dir>/requirements.yaml`. Work only on the entries without a
   `decision`. If there are none, say so and stop.
2. Say it first, in one line: `Research: 3 unknowns → 3 agents`. Then start one
   `spex:researcher` subagent per unknown, all in one message so they run at the same time.
   Give each the `ask`, what it decides, and where to look: the dependency manifest, the
   module the unknown names, a contract, the library's documentation. Each returns the
   answer, the sources it opened, and a confidence. Do not read the whole codebase yourself.
3. Write `<dir>/research.md`, one section per unknown, heading `## U1 — <ask>`:
   the options considered, the decision, why, and the sources (file paths, URLs, versions).
   This file is for people; no later run reads it whole.
4. Write the decision back into `requirements.yaml`, one line that carries its reason:
   `decision: csv-stringify 6.x, because the repo already depends on it.` and
   `ref: research.md#u1`. That one line is what `tasks` and `develop` will see.
5. Research never changes a requirement. If a finding shows a record is wrong or
   incomplete, add a question to `questions[]` (with options and a recommendation) and say
   so. `clarify` owns the change.
6. `SPEX check <dir>`; fix errors by their `fix` text.
7. `SPEX report <dir> research --status <done|concerns> --summary "…"`.

## Reply

At most 15 lines. `STATUS:` first. One line per unknown: id, the decision, the reason.
Then any question you added. Last, the output of `SPEX next <dir>`, as printed.

The NEXT block is copied as `SPEX next` printed it, the two rules included, never rewritten
into prose or shortened, and it does not count toward the line cap.

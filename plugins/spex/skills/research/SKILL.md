---
name: research
description: Decide the open unknowns of a spex spec — library choices, versions, how an existing API behaves — and write research.md plus a one-line decision per unknown into requirements.yaml. Use when the user says "research", "spex research", "resolve the unknowns", or when spex gate plan reports GATE-UNKNOWN. It changes no requirement.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *)
---

# spex research

`SPEX` = `node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root.

## Steps

1. Read `unknowns[]` in `<dir>/requirements.yaml`. Work only on the entries without a
   `decision`. If there are none, say so and stop.
2. For each unknown, look at what decides it, and only that: the dependency manifest, the
   module the unknown names, a contract, the library's documentation, a web search when the
   repo cannot answer. Do not read the whole codebase.
3. Write `<dir>/research.md`, one section per unknown, heading `## U1 — <ask>`:
   the options considered, the decision, why, and the sources (file paths, URLs, versions).
   This file is for people; no later run reads it whole.
4. Write the decision back into `requirements.yaml`, one line that carries its reason:
   `decision: csv-stringify 6.x, because the repo already depends on it.` and
   `ref: research.md#u1`. That one line is what `plan` and `implement` will see.
5. Research never changes a requirement. If a finding shows a record is wrong or
   incomplete, add a question to `questions[]` (with options and a recommendation) and say
   so. `clarify` owns the change.
6. `SPEX check <dir>`; fix errors by their `fix` text.
7. `SPEX report <dir> research --status <done|concerns> --summary "…"`.

## Reply

At most 15 lines. `STATUS:` first. One line per unknown: id, the decision, the reason.
Then any question you added.

---
name: dead-code
description: Identify unused code (functions, imports, exports, variables, types, classes) and propose cleanup. Use this skill when the user says "find dead code", "unused code", "clean up unused", "code hygiene", "find unused imports", "what can I delete", or any variation of wanting to identify and remove code that is no longer referenced.
---

# dead-code Skill

Analyze the codebase to find unused code — functions, imports, exports, variables, types, and classes — and present a cleanup report. Never auto-delete; always show the user what to remove and let them decide.

This skill parallelizes analysis by spawning multiple `dead-code-analyzer` agents concurrently — one per top-level source directory (or analysis category). This dramatically speeds up analysis on large codebases.

---

## Workflow

### Step 1: Detect project language, structure, and scope

Identify the primary language(s) and project layout:

```bash
ls -la
```

Look for key indicators:
- `package.json` / `tsconfig.json` → JavaScript/TypeScript
- `requirements.txt` / `pyproject.toml` / `setup.py` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust
- `pom.xml` / `build.gradle` → Java/Kotlin

Identify:
- **Entry points** — main files, index files, exported modules (anchors for reachability analysis)
- **Top-level source directories** — e.g. `src/`, `lib/`, `pkg/`, `cmd/`, `app/`, `internal/`
- **Skip directories** — `node_modules`, `vendor`, `dist`, `build`, `.gen`, `__pycache__`, `.next`, `coverage`, `.git`

### Step 2: Spawn parallel `dead-code-analyzer` agents

Split the analysis into independent work units and run them **concurrently** using the `dead-code-analyzer` agent (via the Agent tool). Each agent receives a focused scope.

**Parallelization strategies** (pick the best fit for the project):

**Strategy A — By directory** (best for monorepos or projects with independent top-level dirs):
Launch one `dead-code-analyzer` agent per top-level source directory. Example for a project with `src/services/`, `src/utils/`, `src/components/`:
- Agent 1: "Analyze `src/services/` for dead code. The project is TypeScript with entry points at `src/index.ts`. Report unused exports, functions, imports, and unreachable code."
- Agent 2: "Analyze `src/utils/` for dead code. The project is TypeScript with entry points at `src/index.ts`. Report unused exports, functions, imports, and unreachable code."
- Agent 3: "Analyze `src/components/` for dead code. The project is TypeScript with entry points at `src/index.ts`. Report unused exports, functions, imports, and unreachable code."

**Strategy B — By analysis type** (best for smaller projects or single-directory layouts):
Launch one `dead-code-analyzer` agent per category of analysis:
- Agent 1: "Find all unused exports and functions — symbols defined but never referenced anywhere in the codebase."
- Agent 2: "Find all unused imports — symbols imported but never used in the importing file."
- Agent 3: "Find unreachable code, commented-out code blocks, and TODO/FIXME markers referencing removal."

**Strategy C — Hybrid** (best for large multi-language projects):
Combine both: one agent per language/directory pair, plus a cross-cutting agent for general hygiene (commented-out code, TODOs).

**Important**: Always include in each agent's prompt:
- The detected language(s) and entry points
- Which directories to skip
- Whether the project is a library (affects confidence for exports)
- Instruction to produce output in the standard report format (see Step 3)

Launch all agents in a **single message** with multiple Agent tool calls so they run concurrently.

### Step 3: Aggregate and deduplicate results

Collect results from all agents and:
1. **Merge** findings into a single report grouped by file
2. **Deduplicate** — if multiple agents flagged the same symbol, keep the highest-confidence entry
3. **Cross-validate** — an agent analyzing `src/utils/` may flag an export as unused, but the agent analyzing `src/services/` may have found a reference. Resolve conflicts by doing a quick grep to confirm
4. **Re-classify** any findings where cross-directory context changes the confidence level

### Step 4: Present the unified report

Group findings by file. Format:

```
## Dead Code Report

### src/utils/helpers.ts
- **HIGH** `formatCurrency()` (line 45) — defined but never imported or called
- **HIGH** `import { debounce } from 'lodash'` (line 3) — imported but never used
- **MEDIUM** `parseConfig()` (line 112) — only referenced in tests

### src/services/legacy-api.ts
- **HIGH** Entire file — never imported by any module
- **LOW** `export class LegacyClient` — may be used by external consumers

### Commented-Out Code
- `src/routes/old-handler.ts` lines 45-78 — large commented-out block

### Summary
| Confidence | Items | Files | Est. Lines Removable |
|---|---|---|---|
| High | 12 | 5 | ~180 |
| Medium | 4 | 2 | ~45 |
| Low | 2 | 1 | ~30 |
```

### Step 5: Propose cleanup

After presenting the report, ask the user how they want to proceed:
- **Remove all high-confidence items** — safest batch cleanup
- **Review file by file** — walk through each file together
- **Export the list** — save the report to a file for later
- **Skip** — just informational, no changes

Only make deletions the user explicitly approves. When removing code:
- Delete entire files if they are completely unused
- Remove unused imports/exports/functions surgically
- Run the project's test suite after cleanup to verify nothing broke

---

## Important Caveats

- **Public APIs / Libraries**: If the project is a library, exported symbols may be consumed externally. Flag these as LOW confidence and warn the user.
- **Dynamic usage**: Languages with reflection, `eval()`, dynamic `import()`, or string-based lookups can reference symbols in ways grep won't catch. Always flag these.
- **Generated code**: Skip files in generated/vendor directories (`node_modules`, `vendor`, `dist`, `build`, `.gen`).
- **Test files**: Symbols only used in tests are flagged MEDIUM, not HIGH — the user may want to keep them.

---

## Examples

**User: "find dead code in this project" (medium TypeScript project with src/services, src/utils, src/components)**
1. Detects TypeScript project with `src/` layout and `src/index.ts` entry point
2. Spawns 3 `dead-code-analyzer` agents in parallel — one per `src/` subdirectory
3. Agents return findings concurrently; results are merged and deduplicated
4. Cross-validates: agent 1 flagged `parseDate()` in utils as unused, but agent 2 found it imported in services → removes false positive
5. Presents unified report: 8 unused functions, 15 unused imports, 1 orphan file
6. Asks user: "Want me to remove the 23 high-confidence items?"

**User: "find dead code" (small Python project, single directory)**
1. Detects Python project with flat layout
2. Spawns 3 `dead-code-analyzer` agents by analysis type: unused definitions, unused imports, unreachable code
3. Merges results, deduplicates
4. Presents report and asks user how to proceed

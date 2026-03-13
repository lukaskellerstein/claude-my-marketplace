---
name: dead-code
description: Identify unused code (functions, imports, exports, variables, types, classes) and propose cleanup. Use this skill when the user says "find dead code", "unused code", "clean up unused", "code hygiene", "find unused imports", "what can I delete", or any variation of wanting to identify and remove code that is no longer referenced.
---

# dead-code Skill

Analyze the codebase to find unused code — functions, imports, exports, variables, types, and classes — and present a cleanup report. Never auto-delete; always show the user what to remove and let them decide.

---

## Workflow

### Step 1: Detect project language and structure

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

Also identify entry points (main files, index files, exported modules) — these anchor the reachability analysis.

### Step 2: Analyze for unused code

Use language-appropriate strategies:

**JavaScript / TypeScript:**
- Search for exported symbols that are never imported elsewhere
- Find functions/classes defined but never called or referenced
- Detect unused imports in each file
- Check for unused variables and parameters (look for `_` prefix convention)
- Look for files that are never imported by any other file

**Python:**
- Find functions/classes defined but never referenced outside their module
- Detect unused imports (`import foo` or `from foo import bar` where `foo`/`bar` is never used)
- Check for unreachable code after `return`/`raise`/`break`/`continue`
- Look for modules never imported by other modules

**Go:**
- The compiler catches unused imports and variables, so focus on unexported functions/types never called within the package
- Look for exported symbols never referenced outside the package

**General (any language):**
- Search for TODO/FIXME comments referencing removal
- Find commented-out code blocks (candidates for deletion)
- Detect feature flags or config that reference removed functionality

### Step 3: Classify findings by confidence

For each finding, assign a confidence level:

- **High** — Symbol is defined but has zero references anywhere in the codebase (grep confirms)
- **Medium** — Symbol appears referenced only in tests, or only in the same file, or is behind a dynamic lookup that might not be real usage
- **Low** — Symbol might be used via reflection, dynamic imports, string-based lookups, or external consumers (libraries/APIs)

### Step 4: Present the report

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

### Summary
- High confidence: 12 items across 5 files
- Medium confidence: 4 items across 2 files
- Low confidence: 2 items across 1 file
- Estimated lines removable (high confidence): ~180
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

**User: "find dead code in this project"**
1. Detects TypeScript project with `src/` layout
2. Scans all exports, finds 8 functions never imported
3. Finds 15 unused imports across 10 files
4. Finds 1 file never imported anywhere
5. Presents grouped report with confidence levels
6. Asks user: "Want me to remove the 23 high-confidence items?"

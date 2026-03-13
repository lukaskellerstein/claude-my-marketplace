---
description: Generate documentation for the current feature branch by analyzing all commits and changes since branching from the base branch
argument-hint: "[base-branch (default: main)]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Agent"]
---

# Document Current Feature Branch

Generate comprehensive feature documentation based on the current branch's changes.

## Steps

1. **Detect the feature branch**:
   ```bash
   CURRENT_BRANCH=$(git branch --show-current)
   BASE_BRANCH="${1:-main}"
   ```
   If on `main` or `master`, inform the user they need to be on a feature branch.

2. **Analyze all changes since branching**:
   ```bash
   # All commits on this branch
   git log ${BASE_BRANCH}..HEAD --oneline

   # All files changed
   git diff ${BASE_BRANCH}...HEAD --name-only

   # Full diff for understanding the feature
   git diff ${BASE_BRANCH}...HEAD --stat
   ```
   Read ALL changed files to understand the full scope of the feature.

3. **Determine the feature name**: Derive from the branch name (e.g., `feature/user-notifications` → "User Notifications").

4. **Create `docs/features/<feature-name>/README.md`** with:

   - **Overview** — what the feature does and why, derived from commit messages and code changes
   - **Architecture diagram** — a mermaid diagram showing new/modified components and their interactions
   - **Changes summary** — table of files changed, grouped by category (new files, modified files, config changes)
   - **API changes** — any new or modified endpoints, request/response schemas
   - **Data model changes** — new tables, columns, or schema modifications
   - **Configuration** — new environment variables or config values introduced
   - **Dependencies** — new packages or services added
   - **Testing** — how to test the feature, key scenarios

5. **Update `docs/features/README.md`** — add the new feature to the index (create the index if it doesn't exist).

6. **Validate all mermaid diagrams** using the mermaid MCP server.

## Output

After generating, print a summary:
```
Feature documented: <feature-name>
Branch: <branch-name> (XX commits ahead of <base-branch>)
Files analyzed: XX changed files
Documentation: docs/features/<feature-name>/README.md
```

## Important

- Always use mermaid diagrams — at minimum a sequence diagram or flowchart showing the feature's behavior
- Use the mermaid MCP server (`mcp__mermaid__*`) to validate diagram syntax
- Base everything on actual code changes — do not speculate about intent
- If the feature modifies existing architecture, note what changed from the previous state
- Include the PR number or branch name in the changelog entry

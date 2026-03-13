---
description: Scan the codebase for changes since the last documentation update and refresh all affected docs, diagrams, and indexes
argument-hint: "[--since=YYYY-MM-DD or commit hash to limit scope]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Agent"]
---

# Update Documentation

Detect what has changed in the codebase and update all affected documentation.

## Steps

1. **Determine scope**: Check the `--since` argument. If provided, use it. Otherwise, find the last commit that touched `docs/`:
   ```bash
   LAST_DOCS_UPDATE=$(git log -1 --format="%H" -- docs/)
   ```

2. **Find all code changes since last docs update**:
   ```bash
   git diff ${LAST_DOCS_UPDATE}..HEAD --name-only
   ```

3. **Categorize changes**:
   - **Architecture-affecting**: new services, infrastructure changes, dependency additions, config changes
   - **Feature-affecting**: new features, modified feature behavior, removed features
   - **API-affecting**: endpoint changes, schema changes

4. **For each affected area**:

   a. **Architecture changes** → Update `docs/architecture/` files:
      - Regenerate or update mermaid diagrams to reflect new components
      - Update component tables
      - Create ADRs for significant decisions (check commit messages for context)

   b. **Feature changes** → Update `docs/features/` files:
      - Update affected feature docs
      - Create new feature docs if a new feature was added
      - Mark removed features as deprecated

   c. **API changes** → Update API documentation in relevant feature docs

5. **Update the docs index** (`docs/README.md`) if new docs were created or old ones removed.

6. **Validate all modified mermaid diagrams** using the mermaid MCP server.

7. **Report what was updated**:
   ```
   Documentation Update Report
   ===========================
   Code changes analyzed: XX files changed since <ref>

   Updated:
   - docs/architecture/README.md — added NotificationService to system diagram
   - docs/features/notifications/README.md — created (new feature)

   No update needed:
   - docs/architecture/security.md — no security-related changes

   Manual review recommended:
   - docs/features/auth/README.md — auth flow may have changed (modified: src/auth/middleware.ts)
   ```

## Important

- Always use mermaid diagrams — update existing diagrams, don't just describe changes in text
- Use the mermaid MCP server (`mcp__mermaid__*`) to validate diagram syntax
- Don't overwrite manually written documentation — update surgically using Edit
- When unsure if a code change affects documentation, flag it for manual review rather than guessing
- Preserve existing content structure and style

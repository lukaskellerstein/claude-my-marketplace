---
name: update-feature-docs
description: >
  Generate or update documentation for the current feature branch.
  Analyzes all changes (commits, diffs) between the feature branch and base branch,
  then creates or updates docs/features/<index>_<feature-name>/README.md with
  incremental indexing based on existing feature docs.
  Use when documenting a feature branch, creating feature documentation from branch changes,
  or updating existing feature docs after additional commits.

  <example>
  Context: User wants to document their feature branch
  user: "/update-feature-docs"
  </example>

  <example>
  Context: User wants to document changes
  user: "document this feature branch"
  </example>

  <example>
  Context: User wants to update existing feature docs
  user: "update the feature docs with my latest changes"
  </example>

  <example>
  Context: User specifies a base branch
  user: "/update-feature-docs develop"
  </example>
---

# Update Feature Documentation

Generate or update documentation for the current feature branch by analyzing all changes since it diverged from the base branch.

## Prerequisites

- Must be on a feature branch (not `main` or `master`). If on main/master, inform the user and stop.
- The `docs/features/` directory should exist. If it doesn't, create it with a `README.md` index.

## Workflow

### Step 1: Detect Branch and Gather Changes

```bash
CURRENT_BRANCH=$(git branch --show-current)
BASE_BRANCH="${1:-main}"  # Accept base branch as argument, default to main
```

If on `main` or `master`, tell the user to switch to a feature branch and stop.

Gather all changes:
```bash
# All commits on this branch
git log ${BASE_BRANCH}..HEAD --oneline

# All files changed
git diff ${BASE_BRANCH}...HEAD --name-only

# Diff stats
git diff ${BASE_BRANCH}...HEAD --stat

# Full diff for understanding changes
git diff ${BASE_BRANCH}...HEAD
```

Read ALL changed files to understand the full scope of the feature.

### Step 2: Determine Feature Name

Derive the feature name from the branch name:
- `feature/user-notifications` -> `user-notifications`
- `feat/add-payment-gateway` -> `add-payment-gateway`
- `fix/login-redirect` -> `login-redirect`
- `my-awesome-feature` -> `my-awesome-feature`

Strip common prefixes: `feature/`, `feat/`, `fix/`, `bugfix/`, `hotfix/`, `chore/`, `refactor/`.

### Step 3: Determine Feature Index

Check existing feature directories in `docs/features/` to determine the next incremental index:

```bash
# List existing feature directories
ls -d docs/features/*/  2>/dev/null
```

Feature directories follow the pattern `<index>_<name>` (e.g., `001_user-auth`, `002_payment-gateway`).

- If no feature directories exist, start with index `001`
- If existing directories exist, find the highest index and increment by 1
- Use zero-padded 3-digit format: `001`, `002`, ..., `010`, ..., `100`

**If a directory for this feature already exists** (matching by feature name, ignoring index), this is an **update** — use the existing directory and index.

### Step 4: Generate or Update Feature Documentation

Create or update `docs/features/<index>_<feature-name>/README.md` with the following sections:

```markdown
# Feature: <Feature Name (human-readable)>

> Branch: `<branch-name>` | Base: `<base-branch>` | Commits: <count>

## Overview

<What the feature does and why, derived from commit messages and code changes.
1-2 paragraphs maximum.>

## Architecture

<Mermaid diagram showing new/modified components and their interactions.
Use a C4 Component diagram, sequence diagram, or flowchart — whichever best
illustrates the feature.>

## Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `path/to/file` | Description |

### Modified Files
| File | Changes |
|------|---------|
| `path/to/file` | What changed and why |

### Configuration Changes
| Key | Description | Default |
|-----|-------------|---------|
| `ENV_VAR` | What it controls | `value` |

## API Changes

<New or modified endpoints. Include method, path, request/response if applicable.
If no API changes, omit this section.>

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/resource | Creates a new resource |

## Data Model Changes

<New tables, columns, schema modifications, migrations.
If no data model changes, omit this section.>

## Dependencies

<New packages or services added.
If no new dependencies, omit this section.>

| Package | Version | Purpose |
|---------|---------|---------|
| `package-name` | `^1.0.0` | Why it was added |

## Testing

<How to test the feature — key scenarios and commands.>
```

**For updates to existing feature docs:**
- Preserve the existing content structure
- Update sections that have changed based on new commits
- Add new entries to the Changes Summary
- Update the Overview if the feature scope has expanded
- Update diagrams if architecture has changed

### Step 5: Update Feature Index

Update `docs/features/README.md` to include the new or updated feature:

```markdown
# Features

| Index | Feature | Description | Branch | Status |
|-------|---------|-------------|--------|--------|
| 001 | [User Auth](001_user-auth/README.md) | Authentication and authorization | `feature/user-auth` | Documented |
| 002 | [Payment Gateway](002_payment-gateway/README.md) | Payment processing integration | `feature/payment-gateway` | Documented |
```

If the feature already exists in the index, update its description if needed.

### Step 6: Validate

- Validate all mermaid diagrams using the mermaid MCP server
- Verify all file paths referenced in the Changes Summary still exist
- Verify internal links are correct

## Output

Print a summary:
```
Feature documented: <Feature Name>
  Directory:  docs/features/<index>_<feature-name>/
  Branch:     <branch-name> (<N> commits ahead of <base-branch>)
  Files analyzed: <N> changed files
  Status:     [Created | Updated]
```

## Important

- Always use mermaid diagrams — at minimum one diagram showing the feature's architecture or flow
- Use the mermaid MCP server (`mcp__mermaid__*`) to validate diagram syntax
- Base everything on actual code changes — do not speculate about intent
- If the feature modifies existing architecture, note what changed from the previous state
- Omit sections that have no relevant content (e.g., no API changes) rather than leaving them empty
- Keep the documentation concise and scannable — use tables and bullet points
- The index is always zero-padded 3-digit: `001`, `002`, etc.

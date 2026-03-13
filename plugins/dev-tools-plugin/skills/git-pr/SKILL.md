---
name: git-pr
description: Create a feature branch, commit staged or unstaged changes with a well-crafted commit message, and open a GitHub Pull Request with a meaningful title, description, and assignee. Use this skill whenever the user wants to commit their work and raise a PR, says things like "commit and open a PR", "create a pull request for my changes", "push this to a branch", "ship this", "submit this for review", or any variation of wanting to save work and create a GitHub PR. Always use this skill even if the user only mentions one part (e.g. "just commit this") — the full branch-commit-PR flow is the default behavior.
---

# git-pr Skill

Create a feature branch from current changes, commit with a meaningful message, push, and open a GitHub PR — assigned to the right person and described properly.

## Prerequisites

- `git` must be installed and the current directory must be inside a git repo
- `gh` (GitHub CLI) must be installed and authenticated (`gh auth status`)
  - If not installed: https://cli.github.com/
  - If not authenticated: run `gh auth login`

---

## Workflow

### Step 1: Detect current branch

First, check what branch you're on:

```bash
git branch --show-current
```

Then get the repo's default branch (usually `main` or `master`):

```bash
gh repo view --json defaultBranchRef -q .defaultBranchRef.name
```

**Two paths from here:**

**Path A — Already on a feature branch** (current branch ≠ default branch):
- Skip Steps 3 and 4 entirely — do NOT create a new branch
- Proceed directly to Step 2 (understand changes), Step 5 (commit), Step 6 (push), Step 7 (PR)
- Use the existing branch name as-is for the PR

**Path B — On the default branch** (e.g. `main` or `master`):
- Continue with Steps 2 and 3 to create a new branch before committing

---

### Step 2: Understand the changes

Run `git diff` (and `git diff --staged` if anything is staged) plus `git status` to understand what has changed. Do NOT ask the user to explain their changes — figure it out from the diff yourself.

```bash
git status
git diff
git diff --staged
```

If there are **no changes** at all (and no commits ahead of the default branch), tell the user and stop.

### Step 3: Generate branch name and commit message

From the diff, synthesize:

**Branch name** *(Path B only — skip if already on a feature branch)*:
- Format: `feature/<short-kebab-slug>` (e.g. `feature/add-login-button`)
- Max ~5 words, lowercase, hyphens only
- Use `fix/` prefix instead of `feature/` if the change is clearly a bug fix
- Use `chore/` for non-functional changes (deps, config, docs)

**Commit message** *(always, if there are uncommitted changes)*:
- First line: imperative mood, ≤72 chars (e.g. `Add login button to navbar`)
- Optionally followed by a blank line and a short body (2–4 lines) if the change is complex
- Be specific — never use vague messages like "update files" or "fix stuff"

**Show the plan to the user and ask for confirmation before proceeding.** Keep it brief:
- Path A: show just the commit message and say "I'll commit to `<branch>` and open a PR — look good?"
- Path B: show the proposed branch name and commit message and ask "Look good? I'll proceed unless you want changes."

If there are no uncommitted changes (already clean, just needs a PR opened), skip the commit message and just confirm you'll open the PR from the current branch.

### Step 4: Create the branch *(Path B only)*

```bash
git checkout -b <branch-name>
```

If the branch already exists, append a short suffix like `-2`.

### Step 5: Stage and commit

Stage everything that's unstaged (unless the user has explicitly staged a subset — in that case respect their staging):

```bash
git add -A   # or git add <specific files> if partial staging is intentional
git commit -m "<commit message>"
```

For multi-line commit messages:
```bash
git commit -m "<subject>" -m "<body>"
```

### Step 6: Push the branch

```bash
git push -u origin <branch-name>
```

### Step 7: Create the PR with `gh`

```bash
gh pr create \
  --title "<PR title — same as commit subject>" \
  --body "<PR description>" \
  --assignee "@me"
```

**PR description template** (fill in from the diff):

```
## What
<1–2 sentences describing what this PR does>

## Why
<1–2 sentences on motivation / context, if inferable from the code>

## Changes
- <bullet: key file or component changed and what was done>
- <bullet: ...>
```

Keep the description concise. If motivation isn't clear from the code, omit the "Why" section rather than guessing.

**Do not** add reviewers, labels, or milestones unless the user requests them.

---

## Error Handling

| Situation | Action |
|---|---|
| `gh` not installed | Tell user, link to https://cli.github.com, stop |
| `gh` not authenticated | Run `gh auth status` to confirm, then tell user to run `gh auth login` |
| Not in a git repo | Tell user, stop |
| Push rejected (branch exists on remote) | Try `git push --force-with-lease` only if branch was just created by this skill; otherwise ask user |
| `gh pr create` fails (no upstream) | Ensure `--base` is set to the repo default branch: `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` |

---

## Examples

**Path B — On `main`, new branch needed:**

User: "commit and PR my changes"
1. Detects current branch is `main`
2. Reads diff — sees changes to `src/auth/login.tsx` adding a new form field
3. Proposes: branch `feature/add-email-field-to-login`, commit `Add email field to login form`
4. User confirms
5. Creates branch, commits, pushes, opens PR assigned to `@me`

---

**Path A — Already on a feature branch:**

User: "ship this"
1. Detects current branch is `feature/refactor-sidebar` (not the default branch)
2. Reads diff — sees several component changes
3. Proposes just the commit message: "I'll commit to `feature/refactor-sidebar` and open a PR — look good?"
4. User confirms
5. Commits, pushes, opens PR from existing branch assigned to `@me`

---

**Path A — Clean branch, just needs a PR:**

User: "open a PR for this branch"
1. Detects current branch is `fix/null-pointer-crash`, no uncommitted changes
2. Says: "No uncommitted changes — I'll open a PR from `fix/null-pointer-crash` now."
3. Opens PR based on commits already on the branch, assigned to `@me`

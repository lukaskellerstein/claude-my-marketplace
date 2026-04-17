---
name: git-pr
description: Create a git-flow branch, commit the current changes, push, and open a GitHub PR. Use whenever the user asks to commit, ship, push, open a PR, or any variant of saving work to a PR — even if they only mention one part of the flow.
---

# git-pr Skill

## EXECUTE — do not describe

You MUST run the workflow below against the current repo RIGHT NOW. Your first action in this turn MUST be a Bash tool call (`git status`). Do not summarize what the skill does. Do not emit an example PR URL. Do not respond with prose like "Done — PR opened at ..." unless you have actually just called `gh pr create` and received that URL from the tool output.

If your first response is text instead of a tool call, you are failing this skill. Start with tools.

---

Create a feature branch following **git flow**, commit with a meaningful message, push, and open a GitHub PR — assigned to the right person and described properly.

## Git Flow Overview

This skill follows the [git flow](https://nvie.com/posts/a-successful-git-branching-model/) branching model:

- **`main`** (or `master`) — production-ready code. Only `release/` and `hotfix/` branches merge here.
- **`develop`** — the integration branch. All `feature/` and `bugfix/` branches are created from and merged back into `develop`.
- **`feature/*`** — new functionality, branched from `develop`.
- **`bugfix/*`** — non-urgent fixes, branched from `develop`.
- **`release/*`** — release prep, branched from `develop`, merged into both `main` and `develop`.
- **`hotfix/*`** — urgent production fixes, branched from `main`, merged into both `main` and `develop`.

## Prerequisites

- `git` must be installed and the current directory must be inside a git repo
- `gh` (GitHub CLI) must be installed and authenticated (`gh auth status`)
  - If not installed: https://cli.github.com/
  - If not authenticated: run `gh auth login`

---

## Workflow

### Step 1: Understand the changes and detect the git flow base branch

Run `git diff` (and `git diff --staged` if anything is staged) plus `git status` to understand what has changed. Do NOT ask the user to explain their changes — figure it out from the diff yourself.

```bash
git status
git diff
git diff --staged
```

If there are **no changes** at all, tell the user and stop.

**Detect the base branch:**

Check which branches exist in the repo to determine the git flow setup:

```bash
git branch -a | grep -E '(develop|main|master)'
```

- If `develop` exists, use it as the default base branch (for `feature/` and `bugfix/` branches).
- If the user explicitly says this is a **hotfix** (urgent production fix), branch from `main`/`master` instead.
- If `develop` does not exist, fall back to `main`/`master` and let the user know the repo doesn't appear to follow git flow fully.

### Step 2: Generate branch name and commit message

From the diff, synthesize:

**Branch name (git flow conventions):**
- `feature/<short-kebab-slug>` — new functionality (e.g. `feature/add-login-button`)
- `bugfix/<short-kebab-slug>` — non-urgent bug fixes targeting `develop`
- `hotfix/<short-kebab-slug>` — urgent production fixes (branched from `main`/`master`)
- `release/<version>` — release preparation (e.g. `release/1.2.0`)
- `chore/<short-kebab-slug>` — non-functional changes (deps, config, docs)
- Max ~5 words, lowercase, hyphens only
- Default to `feature/` when in doubt

**Commit message:**
- First line: imperative mood, ≤72 chars (e.g. `Add login button to navbar`)
- Optionally followed by a blank line and a short body (2–4 lines) if the change is complex
- Be specific — never use vague messages like "update files" or "fix stuff"

**Show both to the user and ask for confirmation before proceeding.** Keep it brief — just show the proposed branch name and commit message and ask "Look good? I'll proceed unless you want changes."

### Step 3: Create the branch from the correct base

First, ensure you're branching from the right base per git flow:

```bash
# For feature/ and bugfix/ branches — branch from develop
git checkout develop
git pull origin develop
git checkout -b <branch-name>

# For hotfix/ branches — branch from main/master
git checkout main
git pull origin main
git checkout -b <branch-name>
```

If the branch already exists, append a short suffix like `-2`.

### Step 4: Stage and commit

Stage everything that's unstaged (unless the user has explicitly staged a subset — in that case respect their staging):

```bash
git add -A   # or git add <specific files> if partial staging is intentional
git commit -m "<commit message>"
```

For multi-line commit messages:
```bash
git commit -m "<subject>" -m "<body>"
```

### Step 5: Push the branch

```bash
git push -u origin <branch-name>
```

### Step 6: Create the PR with `gh` (targeting the correct base)

Determine the correct PR base branch per git flow:
- `feature/*`, `bugfix/*` → base is `develop`
- `hotfix/*` → base is `main`/`master`
- `release/*` → base is `main`/`master`

```bash
gh pr create \
  --base <base-branch> \
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
| `develop` branch missing | Warn user the repo may not follow git flow; fall back to `main`/`master` as base and mention they may want to create a `develop` branch |
| Push rejected (branch exists on remote) | Try `git push --force-with-lease` only if branch was just created by this skill; otherwise ask user |
| `gh pr create` fails (no upstream) | Ensure `--base` is set correctly per git flow conventions |

---

## Expected tool-call sequence

Every invocation of this skill MUST produce tool calls in roughly this order. If you find yourself writing a final answer without having made these calls, STOP and start over with the Bash tool.

1. `Bash: git status`
2. `Bash: git diff` (and `git diff --staged` if anything is staged)
3. `Bash: git branch -a | grep -E '(develop|main|master)'`
4. Text to user: proposed branch name + commit message, ask for confirmation
5. `Bash: git checkout <base> && git pull origin <base> && git checkout -b <branch>`
6. `Bash: git add -A && git commit -m "<msg>"`
7. `Bash: git push -u origin <branch>`
8. `Bash: gh pr create --base <base> --title "..." --body "..." --assignee "@me"`
9. Text to user: the real PR URL returned by step 8 — never a placeholder like `.../pull/42` or `user/repo/pull/123`.
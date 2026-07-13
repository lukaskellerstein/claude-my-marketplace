---
name: git-pr
description: For every git repo in the current folder, create and merge a PR for feature-branch work, then return to the default branch and pull. With no arguments this runs fully autonomously across ALL sub-repos — commit → push → PR → squash-merge → checkout main → pull. Use whenever the user asks to commit, ship, push, open/merge a PR, "update all repos", "get back to main", or any variant of saving work to a PR and bringing branches up to date — even if they mention only one part of the flow.
---

# git-pr Skill

## EXECUTE — do not describe

You MUST run the workflow below RIGHT NOW. Your first action in this turn MUST be a Bash tool call (repo discovery — see Step 0). Do not summarize what the skill does. Do not emit an example PR URL. Do not respond with prose like "Done — PR opened at ..." unless you have actually just called `gh pr create` / `gh pr merge` and received real output from the tool.

If your first response is text instead of a tool call, you are failing this skill. Start with tools.

---

## What this skill does by default

**With NO arguments / no specification, this skill operates on EVERY git repo found in the current folder** and, for each one, does the *complete* round trip **fully autonomously** (no per-repo confirmation):

- **Feature branch WITH work** (uncommitted changes and/or commits not yet on the default branch) → commit any uncommitted work, push, open a PR, **squash-merge it (deleting the branch)**, check out the default branch, and pull latest.
- **Feature branch with NO work** (clean tree, nothing ahead of the default branch) → just check out the default branch and pull latest. **Do not** open an empty PR.
- **Already on the default branch** (`main`/`master`) → just pull latest.

At the end, print a single **summary table** of what happened per repo. This is the behavior you get from a bare invocation — the user should **never** have to spell out "for all repos in this folder that have changes, merge them, get back to main and update to latest". That IS the default.

**Merge strategy:** always `gh pr merge --squash --delete-branch` unless the user asks for a different strategy.

---

## Prerequisites

- `git` installed.
- `gh` (GitHub CLI) installed and authenticated (`gh auth status`).
  - Not installed: https://cli.github.com/ · Not authenticated: `gh auth login`

---

## Workflow

### Step 0: Discover the working set of repos

The "current folder" is the working directory. It may itself be a repo, OR it may be a **parent folder containing several repos** as immediate subdirectories (the common case — e.g. `~/Projects/Github/onion-ai-eu/` holding `onion-demo-01`, `onion-prod-01`, …).

Find every repo to operate on:

```bash
# Immediate-subdirectory repos
for d in */; do [ -d "$d/.git" ] && echo "REPO: ${d%/}"; done
# ...and the current folder itself, if it is a repo
[ -d ".git" ] && echo "REPO: ."
```

- If subdirectory repos are found, operate on **each** of them.
- If none are found but the current folder is itself a repo, operate on just that one.
- If neither, tell the user there are no git repos here and stop.

If the user named a specific folder (e.g. "for all repos in `~/Projects/Github/onion-ai-eu`"), run discovery inside that folder instead of the CWD.

### Step 1: Classify each repo

Do this per repo. Use `git -C <repo>` so you never have to `cd` (which can trigger permission prompts). First sync remote refs so "ahead" counts are accurate:

```bash
git -C <repo> fetch --prune origin

# Default branch (the branch to return to and merge into)
BASE=$(git -C <repo> symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')
# Fallback if origin/HEAD isn't set:
#   BASE=main if origin/main exists, else master, else develop

CUR=$(git -C <repo> branch --show-current)          # current branch
DIRTY=$(git -C <repo> status --porcelain)           # non-empty => uncommitted changes
AHEAD=$(git -C <repo> rev-list --count "origin/$BASE..HEAD" 2>/dev/null)  # commits to ship
```

Decide the case:

| Condition | Case |
|---|---|
| `CUR` == `BASE` | **C — on default branch** → pull only |
| `CUR` != `BASE`, and (`DIRTY` non-empty **or** `AHEAD` > 0) | **A — feature branch with work** → full PR + merge + return |
| `CUR` != `BASE`, clean, `AHEAD` == 0 | **B — feature branch, no work** → return to default + pull |

> `develop`-based git flow: if the repo has a `develop` branch and the user is following git flow, `feature/*` and `bugfix/*` target `develop` and `hotfix/*` target `main`. Detect `develop` and use it as the merge base for those branches, then return to `develop`. Most of the user's repos are `main`-based — default to the repo's actual default branch and don't assume `develop` exists.

### Step 2 — Case C: on the default branch

```bash
git -C <repo> pull --ff-only origin "$BASE"
```
Record "updated `<base>`" and move on.

### Step 3 — Case B: feature branch, nothing to ship

```bash
git -C <repo> checkout "$BASE"
git -C <repo> pull --ff-only origin "$BASE"
```
Optionally delete the now-stale local feature branch if it's fully merged (`git -C <repo> branch -d <feature>`; skip if it errors). Record "no changes → returned to `<base>` & pulled".

### Step 4 — Case A: feature branch with work → full flow

**4a. Commit any uncommitted work.** Synthesize a specific commit message from the diff (imperative, ≤72 chars; never "update files"). Inspect with `git -C <repo> diff` / `git -C <repo> status` first.

```bash
git -C <repo> add -A
git -C <repo> commit -m "<specific message>"   # skip if tree was already clean
```

If the current branch name is generic (e.g. `feature` or a bare name) it's fine to keep it; do **not** rename an existing branch that already has commits/PR.

**4b. Push.**

```bash
git -C <repo> push -u origin "$CUR"
```

**4c. Open the PR** (base = default branch, or `develop`/`main` per the git-flow note). If a PR already exists for this branch, skip creation and reuse it.

```bash
git -C <repo> ... # (use gh from within the repo)
gh -R <owner/repo> pr create \
  --base "$BASE" \
  --head "$CUR" \
  --title "<PR title = commit subject>" \
  --body "<see template>" \
  --assignee "@me"
```
Use `gh pr create` from inside the repo dir if `-R` is awkward — either works. Get `<owner/repo>` from `gh repo view --json nameWithOwner -q .nameWithOwner`.

PR body template (fill from the diff; drop a section if not inferable):
```
## What
<1–2 sentences>

## Why
<1–2 sentences, only if motivation is clear from the code>

## Changes
- <key change>
- <key change>
```

**4d. Squash-merge and delete the branch.**

```bash
gh pr merge "$CUR" --squash --delete-branch
```
If the merge is blocked by required status checks, enable auto-merge with `--auto` (it will merge once checks pass) and note that in the summary. If the user has admin rights and wants to bypass protections, `--admin` forces it — only use `--admin` if the user has asked to bypass checks.

**4e. Return to the default branch and update.**

```bash
git -C <repo> checkout "$BASE"
git -C <repo> pull --ff-only origin "$BASE"
git -C <repo> branch -D "$CUR" 2>/dev/null   # local cleanup (remote branch already deleted by --delete-branch)
```
Record the real PR URL + "merged → returned to `<base>` & pulled".

### Step 5: Print the summary

After all repos are processed, output one table:

```
| Repo            | Branch          | Action                                   | PR |
|-----------------|-----------------|------------------------------------------|----|
| onion-demo-01   | feature/x       | committed, merged, back on main & pulled | <url> |
| onion-prod-01   | feature/y       | no changes → back on main & pulled       | —  |
| onion-tech-...  | main            | pulled latest                            | —  |
```

Only report real PR URLs returned by `gh`. Never a placeholder like `.../pull/42`.

---

## Autonomy

The default run is **fully autonomous** — do not ask for per-repo confirmation of branch names, commit messages, or merges. Just do the flow for every eligible repo and report at the end. Only pause to ask the user if something genuinely ambiguous or destructive comes up (e.g. a merge conflict on pull, a non-fast-forward that would need a force push, or a repo with an unexpected/detached HEAD).

If the user *does* pass specifics ("only repo X", "don't merge, just open PRs", "use a merge commit not squash", "target develop"), honor those over the defaults.

---

## Error Handling

| Situation | Action |
|---|---|
| `gh` not installed | Tell user, link https://cli.github.com, stop |
| `gh` not authenticated | Show `gh auth status`, tell user to `gh auth login` |
| No git repos in folder | Tell user, stop |
| `pull --ff-only` fails (diverged) | Don't force. Report the repo as needing manual attention in the summary and continue with the others |
| Merge blocked by required checks | Use `gh pr merge --auto --squash --delete-branch`; note "auto-merge enabled" in summary |
| Merge conflict | Skip that repo's merge, flag it in the summary, continue with the rest |
| PR already exists for branch | Reuse it (skip create), proceed to merge |
| Push rejected (branch exists on remote) | `git push --force-with-lease` only if this skill just created the branch; otherwise flag for the user |
| A single repo errors | Never abort the whole batch — record the failure and keep going |

---

## Expected tool-call sequence

Every invocation MUST produce tool calls in roughly this order. If you're writing a final answer without having made these calls, STOP and start over with Bash.

1. `Bash`: discover repos (Step 0)
2. Per repo: `Bash` fetch + classify (`branch --show-current`, `status --porcelain`, `rev-list --count`)
3. Per **Case A** repo: `Bash` diff → commit → push → `gh pr create` → `gh pr merge --squash --delete-branch` → checkout base → pull
4. Per **Case B/C** repo: `Bash` checkout base (if needed) + `pull --ff-only`
5. Text to user: the summary table with **real** PR URLs

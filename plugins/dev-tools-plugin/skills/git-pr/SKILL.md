---
name: git-pr
description: For every git repo in the current folder, create and merge a PR for feature-branch work, then return to the default branch and pull. With no arguments this runs fully autonomously across ALL sub-repos — commit → push → PR → squash-merge → checkout main → pull. Use whenever the user asks to commit, ship, push, open/merge a PR, "update all repos", "get back to main", or any variant of saving work to a PR and bringing branches up to date — even if they mention only one part of the flow.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/git-pr.sh *)
---

# git-pr Skill

## EXECUTE — do not describe

Run the workflow below RIGHT NOW. Your first action MUST be a Bash tool call. Never print a PR URL that the script did not print.

---

## The one rule: every git and GitHub step goes through the script

```
${CLAUDE_SKILL_DIR}/scripts/git-pr.sh
```

This script is pre-approved in `allowed-tools`, so it runs with **no permission prompt** — the user triggered this skill and does not want to approve each step. That only works if you call the script and nothing else:

- **Never run `git` or `gh` yourself** for anything that changes state — no commit, push, checkout, branch, pull, `gh pr create`, `gh pr merge`. The script does all of it, with safety checks. A raw command would prompt the user, and it would skip those checks.
- **Call it as one plain command per Bash call.** No `cd … &&`, no `VAR=…;` prefix, no pipes, no `2>&1`, no `; echo`. Anything around it breaks the pre-approval. (The one addition allowed is the `<<'MSG'` heredoc in Step 3.)
- **Set `dangerouslyDisableSandbox: true` on every call.** The script needs the GitHub network and the macOS keychain, which the Bash sandbox blocks. The pre-approval covers it; there is no prompt.
- **A line starting with `STOP:` is final** for that repo. Report it in the summary and move on to the next repo. Do not retry it another way — a STOP means a human has to look (a secret-looking file, a diverged branch, a failed merge).

What the script will never do, whatever you pass it: force-push, reset, clean, rebase, stash, amend, `--admin` merge, or delete a branch whose commits are not merged.

---

## Workflow

### Step 0 — find the repos

```
${CLAUDE_SKILL_DIR}/scripts/git-pr.sh discover <folder>
```

`<folder>` is the working directory, or the folder the user named. It prints one `REPO <path>` line per repo (the repos directly inside the folder, or the folder itself), or `NO_REPOS` — then tell the user and stop.

### Step 1 — classify each repo

```
${CLAUDE_SKILL_DIR}/scripts/git-pr.sh status <repo>
```

It fetches, then prints `BASE=`, `BRANCH=`, `CHANGED_FILES=`, `COMMITS_AHEAD=`, `CASE=`, and — when there is work — the status, the commits and the diff. Act on `CASE`:

| `CASE` | Meaning | Run |
|---|---|---|
| `C` | on the default branch, clean | `sync <repo>` |
| `B` | feature branch, nothing to ship | `sync <repo>` |
| `B_MERGED` | feature branch whose PR was already squash-merged | `sync <repo>` |
| `A` | feature branch with work | Steps 2 and 3 |
| `A_NEW_BRANCH` | on the default branch with uncommitted work | Steps 2 and 3, with `--new-branch feature/<short-topic>` |
| `STOP` | needs a human (`WHY=` says why) | nothing — report `WHY` as it is. Do not open the file it names. |

Git flow: if the user asked to target `develop` (or another base), add `--base develop` to `status`, `sync` and `ship`.

### Step 2 — compose the message (cases A and A_NEW_BRANCH)

Read the diff that `status` printed. If you need more, use the Read tool on changed source files — never on `.env`, keys or credential files, and never quote a secret value. Do not write the message to a file — a file in the repo would get committed.

```
<title: imperative, specific, ≤ 72 chars — never "update files">

## What
<1–2 sentences>

## Why
<1–2 sentences, only if the motivation is clear from the code>

## Changes
- <key change>
- <key change>
```

Line 1 becomes the commit subject and the PR title. The rest becomes the PR body.

### Step 3 — ship, with the message on stdin

Pass the message as a heredoc with a **quoted** delimiter (`<<'MSG'`), so backticks and `$` stay literal. Nothing else on the command line:

```
${CLAUDE_SKILL_DIR}/scripts/git-pr.sh ship <repo> --message-file - <<'MSG'
Add greet helper to the CLI

## What
Adds a `greet()` command.
MSG
```

Add `--new-branch feature/<short-topic>` before `<<'MSG'` for case `A_NEW_BRANCH`.

It commits (refusing new files that look like secrets or are huge), pushes (never forced), reuses an open PR for the branch or creates one (assigned to `@me`), squash-merges exactly the pushed commit with `--delete-branch`, checks out the base branch, pulls with `--ff-only`, and deletes the local branch. If checks or reviews block the merge it enables auto-merge instead and says so.

User asked for PRs without merging? Add `--no-merge`. Any other variation the script has no option for (merge commit instead of squash, rebase, bypassing checks): tell the user this skill does not do that, and stop.

### Step 4 — summary

One table after all repos, built only from the script's `RESULT:`, `PR:` and `STOP:` lines:

```
| Repo            | Branch    | Result                                   | PR    |
|-----------------|-----------|------------------------------------------|-------|
| onion-demo-01   | feature/x | merged, back on main & pulled            | <url> |
| onion-prod-01   | feature/y | no changes → back on main & pulled       | —     |
| onion-tech-01   | main      | STOP: new file '.env' looks like a secret | —     |
```

A single repo's STOP never aborts the batch — finish the others first.

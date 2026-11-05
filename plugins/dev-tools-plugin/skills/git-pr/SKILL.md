---
name: git-pr
description: For every git repo in the current folder — or the one worktree you are in — open a PR for feature-branch work, ask once whether to merge it, and on yes squash-merge it (merging the base branch in and resolving conflicts first when there are any), then return to the latest base branch. Use whenever the user asks to commit, ship, push, open/merge a PR, "update all repos", "get back to main", or any variant of saving work to a PR and bringing branches up to date — even if they mention only one part of the flow.
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

- **Never run `git` or `gh` yourself** for anything that changes state — no commit, push, checkout, branch, merge, pull, `gh pr create`, `gh pr merge`. The script does all of it, with safety checks. A raw command would prompt the user, and it would skip those checks.
- **Call it as one plain command per Bash call.** No `cd … &&`, no `VAR=…;` prefix, no pipes, no `2>&1`, no `; echo`. Anything around it breaks the pre-approval. (The one addition allowed is the `<<'MSG'` heredoc in Step 4.)
- **Set `dangerouslyDisableSandbox: true` on every call.** The script needs the GitHub network and the macOS keychain, which the Bash sandbox blocks. The pre-approval covers it; there is no prompt.
- **A line starting with `STOP:` is final** for that repo. Report it in the summary and move on to the next repo. Do not retry it another way — a STOP means a human has to look (a secret-looking file, a diverged branch, a merge GitHub blocks).
- **A line starting with `RESOLVE:` is not a STOP.** It means the PR conflicts with the base branch and the script has merged the base into the branch for you to resolve — Step 5.

Outside the script you use exactly three tools: `AskUserQuestion` once (Step 2), and `Read` + `Edit` on the conflicted files (Step 5).

What the script will never do, whatever you pass it: force-push, reset, clean, rebase, stash, amend, `--admin` merge, or delete a branch whose commits are not merged.

---

## Workflow

### Step 0 — find the repos

```
${CLAUDE_SKILL_DIR}/scripts/git-pr.sh discover <folder>
```

`<folder>` is the working directory, or the folder the user named. It prints one `REPO <path>` line per repo (the repos directly inside the folder, or the folder itself), or `NO_REPOS` — then tell the user and stop. In a `claude -w` session the working directory is the worktree, and that worktree is the one repo.

### Step 1 — classify each repo

```
${CLAUDE_SKILL_DIR}/scripts/git-pr.sh status <repo>
```

It fetches, then prints `WORKTREE=`, `BASE=`, `BRANCH=`, `CHANGED_FILES=`, `COMMITS_AHEAD=`, `CASE=`, and — when there is work — `CONFLICTS=<n>` with one `CONFLICT <path>` line per file that would conflict with the base, the status, the commits and the diff. `CONFLICTS` counts uncommitted work too. Act on `CASE`:

| `CASE` | Meaning | Run |
|---|---|---|
| `C` | on the base branch (or a worktree parked on it), clean | `sync <repo>` |
| `B` | feature branch, nothing to ship | `sync <repo>` |
| `B_MERGED` | feature branch whose PR was already squash-merged | `sync <repo>` |
| `A` | feature branch with work | Steps 2–4 |
| `A_NEW_BRANCH` | on the base branch (or a parked worktree) with uncommitted work | Steps 2–4, with `--new-branch feature/<short-topic>` |
| `RESOLVING` | a merge of the base into the branch is waiting for its conflicts — an earlier run stopped at Step 5 | Step 2, then Step 5 |
| `STOP` | needs a human (`WHY=` says why) | nothing — report `WHY` as it is. Do not open the file it names. |

Git flow: if the user asked to target `develop` (or another base), add `--base develop` to every command for that repo.

### Step 2 — ask once: merge, or PR only?

Once all repos are classified, if any is `A`, `A_NEW_BRANCH` or `RESOLVING`, ask **one** `AskUserQuestion` for the whole run:

- question: `Open the PR and merge it into <base>?` (several repos: `Open the PRs and merge them?`)
- option 1, label `PR + merge (Recommended)`. Description: one line per repo — the branch, then either `no conflicts expected` or `conflicts in <n> file(s): <names> — I merge <base> in and resolve them first`, or `conflicts unknown`. End with: `Then back on the latest <base>.`
- option 2, label `PR only` — `Open the PR and stop there. Nothing is merged; you stay on the branch.`

Skip the question only when the user's own words already answered it (`/git-pr merge`, `/git-pr no merge`, "just open a PR"). "PR only" means `--no-merge` on every `ship` and `continue` below. A free-text answer that picks per repo ("merge X, not Y") is fine — follow it; anything the script has no option for (merge commit instead of squash, rebase, bypassing checks): tell the user this skill does not do that, and stop.

### Step 3 — compose the message (cases A and A_NEW_BRANCH)

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

### Step 4 — ship, with the message on stdin

Pass the message as a heredoc with a **quoted** delimiter (`<<'MSG'`), so backticks and `$` stay literal. Nothing else on the command line:

```
${CLAUDE_SKILL_DIR}/scripts/git-pr.sh ship <repo> --message-file - <<'MSG'
Add greet helper to the CLI

## What
Adds a `greet()` command.
MSG
```

Add `--new-branch feature/<short-topic>` before `<<'MSG'` for case `A_NEW_BRANCH`, and `--no-merge` for "PR only".

It commits (refusing new files that look like secrets or are huge), pushes (never forced), and reuses an open PR for the branch or creates one (assigned to `@me`). Then, unless `--no-merge`:

- **The PR would conflict** → it merges `origin/<base>` into the branch, prints `RESOLVE:`, the `CONFLICT <kind> <path>` lines and what each side changed in those files, and exits 4. Go to Step 5.
- **Otherwise** → it squash-merges exactly the pushed commit with `--delete-branch` and returns to the latest base (see *Where it leaves you*). If checks or reviews block the merge it enables auto-merge instead and says so.

### Step 5 — resolve the conflicts, then continue

The PR is open and the branch is mid-merge. For each `CONFLICT` file:

1. **Read it**, and read the two diffs the script printed — what the branch changed, and what `<base>` changed meanwhile. Resolve with intent: where the two sides are independent, keep both; where they contradict, the branch wins on what the PR is about and `<base>` wins on everything else (it is someone's newer work). Never just pick a side to make the markers go away.
2. **Edit** until no `<<<<<<<`, `|||||||` or `>>>>>>>` line is left. Kinds: `both-modified` / `both-added` — edit the markers away. `deleted-on-<base>` / `deleted-on-branch` — one side deleted the file the other changed: leave it in place to keep it, or delete it with `rm` when the deletion is clearly what both sides mean — and say which you chose.
3. **Give up cleanly** when you cannot resolve a file with confidence — a binary, a generated file (lockfile, build output), or two designs that truly contradict:

   ```
   ${CLAUDE_SKILL_DIR}/scripts/git-pr.sh abort <repo>
   ```

   That undoes the base merge (only the resolution edits are lost — the branch is as it was pushed). The PR stays open. Report which file and why, and move on.
4. If you know the repo's test or build command, run it now. A failure caused by the resolution that you cannot fix in those files → `abort`.
5. Then:

   ```
   ${CLAUDE_SKILL_DIR}/scripts/git-pr.sh continue <repo>
   ```

   (`--no-merge` for "PR only".) It refuses while a marker is left, then commits the merge, pushes — a plain push, the merge sits on top — and squash-merges as in Step 4. A `RESOLVE` again is impossible; a `STOP` is final as always.

Keep one line per resolved file for the summary: what you kept from each side.

### Where it leaves you

- **Main checkout:** on `<base>`, pulled (fast-forward only); the merged local branch deleted.
- **Linked worktree (`claude -w`):** git lets only one checkout hold `<base>`, and the main checkout holds it — so the script fast-forwards `<base>` *there*, and parks this worktree on `origin/<base>` as a detached HEAD with the merged branch deleted. The worktree folder now has the latest `<base>` too. If the main checkout has local changes in the way, the RESULT line says `<base> NOT updated in …` — the merge still happened; tell the user to pull there by hand. A parked worktree is a valid start: new work in it is case `A_NEW_BRANCH` on the next run.

### Step 6 — summary

One table after all repos, built only from the script's `RESULT:`, `PR:` and `STOP:` lines:

```
| Repo            | Branch    | Result                                            | PR    |
|-----------------|-----------|---------------------------------------------------|-------|
| onion-demo-01   | feature/x | merged, back on main & pulled                     | <url> |
| onion-api (wt)  | lukas/44  | merged, main pulled in main checkout, wt parked   | <url> |
| onion-prod-01   | feature/y | no changes → back on main & pulled                | —     |
| onion-tech-01   | main      | STOP: new file '.env' looks like a secret         | —     |
```

Under it, for every repo where you resolved conflicts: the file list with one line each on what you kept. For a worktree, end with one line: the worktree's branch is merged and gone — the user can exit and choose "remove", or keep working there.

A single repo's STOP never aborts the batch — finish the others first.

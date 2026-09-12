#!/bin/bash
# git-pr.sh -- the only command the git-pr skill runs.
#
# WHY ONE SCRIPT
#
# SKILL.md pre-approves this file, and nothing else, in `allowed-tools`. A
# pre-approved command runs with no permission prompt in every mode: it passes
# the "Run outside of the sandbox" check, and auto mode resolves it before the
# classifier. So this file is the safety boundary. Whatever it can do, a
# no-prompt /git-pr run can do -- and nothing more, because any other command
# Claude tries still goes through the normal prompts.
#
# WHAT IT WILL NEVER DO
#
#   push --force, reset, clean, rebase, stash, cherry-pick, amend,
#   merge --admin, or delete a branch whose commits are not safely merged.
#
# Every step that could change something checks first. When a check fails the
# script prints "STOP: <reason>", exits 3, and changes nothing after that point.
# A STOP is for the human; the skill reports it and moves on.
#
# USAGE
#
#   git-pr.sh discover [dir]
#   git-pr.sh status   <repo> [--base <branch>]
#   git-pr.sh sync     <repo> [--base <branch>]
#   git-pr.sh ship     <repo> --message-file - [--new-branch <name>] [--base <branch>] [--no-merge] <<'MSG'
#   <title>
#
#   <PR body>
#   MSG
#
# `--message-file -` reads the message from stdin, so no message file is ever
# written into a working tree, where `git add -A` would commit it. A real
# file path works too, but not one inside the repo.
#
# bash 3.2: /bin/bash on a fresh Mac. No mapfile, no ${var,,}.

set -uo pipefail

MAX_NEW_FILES=300
MAX_NEW_FILE_BYTES=5000000
DIFF_LINES=400

TMP_FILES=""
cleanup() { [ -z "$TMP_FILES" ] || rm -f $TMP_FILES; }
trap cleanup EXIT

stop() {
  echo "STOP: $*"
  exit 3
}

usage() {
  sed -n '/^# USAGE/,/^# bash/p' "$0" | sed '1d;$d;s/^# \{0,1\}//'
  exit 2
}

g() { git -C "$REPO" "$@"; }

# Last lines of a failed command, indented, so a STOP explains itself.
tail_of() { printf '%s\n' "$1" | tail -n 8 | sed 's/^/    /'; }

# ---------------------------------------------------------------------------
# arguments

CMD="${1:-}"
[ -n "$CMD" ] || usage
shift

REPO=""
BASE_OPT=""
MSG_FILE=""
NEW_BRANCH=""
NO_MERGE=0

if [ "$CMD" != "discover" ]; then
  [ $# -ge 1 ] || usage
  REPO="$1"
  shift
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE_OPT="${2:-}"; shift 2 ;;
    --message-file) MSG_FILE="${2:-}"; shift 2 ;;
    --new-branch) NEW_BRANCH="${2:-}"; shift 2 ;;
    --no-merge) NO_MERGE=1; shift ;;
    *) if [ "$CMD" = "discover" ] && [ -z "$REPO" ]; then REPO="$1"; shift; else usage; fi ;;
  esac
done

# ---------------------------------------------------------------------------
# discover: repos directly under the folder, or the folder itself

if [ "$CMD" = "discover" ]; then
  dir="${REPO:-.}"
  [ -d "$dir" ] || stop "$dir is not a folder"
  found=0
  for d in "$dir"/*/; do
    if [ -e "${d}.git" ]; then
      echo "REPO $(cd "$d" && pwd)"
      found=1
    fi
  done
  if [ $found -eq 0 ] && [ -e "$dir/.git" ]; then
    echo "REPO $(cd "$dir" && pwd)"
    found=1
  fi
  [ $found -eq 1 ] || echo "NO_REPOS"
  exit 0
fi

# ---------------------------------------------------------------------------
# shared state

[ -d "$REPO" ] || stop "$REPO is not a folder"
REPO="$(cd "$REPO" && pwd)"
[ -e "$REPO/.git" ] || stop "$REPO is not a git repo"
g remote get-url origin >/dev/null 2>&1 || stop "$REPO has no remote named origin"

read_state() {
  local out gitdir f
  out="$(g fetch --prune origin 2>&1)" || { tail_of "$out"; stop "git fetch failed"; }

  if [ -n "$BASE_OPT" ]; then
    git check-ref-format --branch "$BASE_OPT" >/dev/null 2>&1 || stop "--base '$BASE_OPT' is not a branch name"
    BASE="$BASE_OPT"
  else
    BASE="$(g symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')"
    if [ -z "$BASE" ]; then
      for f in main master; do
        if g show-ref --verify --quiet "refs/remotes/origin/$f"; then BASE="$f"; break; fi
      done
    fi
  fi
  [ -n "$BASE" ] || stop "cannot find the default branch (no origin/HEAD, origin/main or origin/master)"
  g show-ref --verify --quiet "refs/remotes/origin/$BASE" || stop "origin/$BASE does not exist"

  CUR="$(g symbolic-ref --quiet --short HEAD)" || stop "detached HEAD -- check out a branch first"

  gitdir="$(g rev-parse --absolute-git-dir)"
  for f in MERGE_HEAD REBASE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
    [ -e "$gitdir/$f" ] && stop "a merge, rebase, cherry-pick or revert is in progress"
  done
  [ -z "$(g diff --name-only --diff-filter=U)" ] || stop "the working tree has unresolved conflicts"

  # A linked worktree (claude -w) cannot check out a base branch that the main
  # checkout already has. That is expected, not a failure -- see back_to_base.
  IS_WORKTREE=0
  [ "$gitdir" = "$(g rev-parse --path-format=absolute --git-common-dir)" ] || IS_WORKTREE=1

  DIRTY="$(g status --porcelain --untracked-files=all | wc -l | tr -d ' ')"
  AHEAD="$(g rev-list --count "origin/$BASE..HEAD")"
  BEHIND="$(g rev-list --count "HEAD..origin/$BASE")"
  HEAD_SHA="$(g rev-parse HEAD)"
  MERGED_PR=""

  if [ "$CUR" = "$BASE" ]; then
    if [ "$AHEAD" -gt 0 ]; then
      CASE="STOP"
      WHY="$BASE has $AHEAD commit(s) that are not on origin/$BASE -- move them to a branch by hand"
    elif [ "$DIRTY" -gt 0 ]; then
      CASE="A_NEW_BRANCH"
    else
      CASE="C"
    fi
  elif [ "$DIRTY" -gt 0 ]; then
    CASE="A"
  elif [ "$AHEAD" -eq 0 ]; then
    CASE="B"
  else
    # Clean, with commits -- unless those commits are exactly a PR that was
    # already squash-merged. Squash commits are new SHAs, so git alone cannot
    # tell; GitHub can, and only an exact head match counts.
    MERGED_PR="$(merged_pr_for_head)"
    if [ -n "$MERGED_PR" ]; then CASE="B_MERGED"; else CASE="A"; fi
  fi

  # Decided here, not in ship, so `status` already says STOP -- before Claude
  # reads the diff, and before it has any reason to open the file.
  if [ "$CASE" = "A" ] || [ "$CASE" = "A_NEW_BRANCH" ]; then
    WHY="$(new_files_problem)"
    [ -z "$WHY" ] || CASE="STOP"
  fi
}

# Guard what `git add -A` would pick up. Prints the first problem, or nothing.
# Only NEW files are checked: a tracked file is already in the repo, so
# committing a change to it exposes nothing new.
new_files_problem() {
  local list count path base size
  list="$(g ls-files --others --exclude-standard)"
  [ -n "$list" ] || return 0
  count="$(printf '%s\n' "$list" | wc -l | tr -d ' ')"
  if [ "$count" -gt "$MAX_NEW_FILES" ]; then
    echo "$count new untracked files -- check .gitignore (build output? node_modules?)"
    return 0
  fi
  while IFS= read -r path; do
    base="${path##*/}"
    case "$base" in
      .env.example|.env.sample|.env.template) ;;
      .env|.env.*|*.pem|*.key|*.p12|*.pfx|*.agekey|keys.txt|id_rsa*|id_ed25519*|id_ecdsa*|\
      *credentials*.json|serviceAccountKey.json|*.tfstate|*.tfstate.backup|.npmrc|.pypirc|.netrc)
        echo "new file '$path' looks like a secret -- add it to .gitignore, or commit it by hand"
        return 0 ;;
    esac
    if [ -f "$REPO/$path" ]; then
      size="$(wc -c < "$REPO/$path" | tr -d ' ')"
      if [ "$size" -gt "$MAX_NEW_FILE_BYTES" ]; then
        echo "new file '$path' is $size bytes -- too big to commit without a look"
        return 0
      fi
    fi
  done <<EOF
$list
EOF
}

nwo() {
  (cd "$REPO" && gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
}

merged_pr_for_head() {
  local r
  r="$(nwo)" || return 0
  [ -n "$r" ] || return 0
  gh pr list -R "$r" --head "$CUR" --state merged --limit 20 \
    --json number,headRefOid -q ".[] | select(.headRefOid == \"$HEAD_SHA\") | .number" 2>/dev/null | head -n 1
}

# Pull the base branch, fast-forward only. A diverged base is a STOP, never a reset.
pull_base() {
  local out
  out="$(g pull --ff-only origin "$BASE" 2>&1)" || { tail_of "$out"; stop "git pull --ff-only origin $BASE failed"; }
}

# Check out the base branch and pull it. Returns 1, changing nothing, when this
# is a linked worktree whose base is checked out elsewhere; the caller reports
# that as a normal result.
back_to_base() {
  local out
  if ! out="$(g checkout "$BASE" 2>&1)"; then
    [ $IS_WORKTREE -eq 1 ] && return 1
    tail_of "$out"
    stop "git checkout $BASE failed"
  fi
  pull_base
  return 0
}

worktree_note() { echo "linked worktree, $BASE is checked out elsewhere -- stayed on $CUR"; }

print_state() {
  echo "REPO=$REPO"
  echo "BASE=$BASE"
  echo "BRANCH=$CUR"
  echo "CHANGED_FILES=$DIRTY"
  echo "COMMITS_AHEAD=$AHEAD"
  echo "COMMITS_BEHIND=$BEHIND"
  [ -n "$MERGED_PR" ] && echo "MERGED_PR=$MERGED_PR"
  echo "CASE=$CASE"
  [ "$CASE" = "STOP" ] && echo "WHY=$WHY"
  return 0
}

# ---------------------------------------------------------------------------
# status: read-only apart from the fetch

if [ "$CMD" = "status" ]; then
  read_state
  print_state
  if [ "$CASE" = "A" ] || [ "$CASE" = "A_NEW_BRANCH" ]; then
    echo
    echo "--- git status --short"
    g status --short --untracked-files=all | head -n 100
    echo
    echo "--- commits not on origin/$BASE"
    g log --oneline "origin/$BASE..HEAD" | head -n 30
    echo
    echo "--- diff against origin/$BASE (first $DIFF_LINES lines; untracked files are listed above, not shown)"
    g diff --stat "origin/$BASE"
    g diff "origin/$BASE" | head -n "$DIFF_LINES"
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# sync: cases B, B_MERGED and C -- nothing to ship, get back to base and pull

if [ "$CMD" = "sync" ]; then
  read_state
  case "$CASE" in
    C)
      pull_base
      echo "RESULT: on $BASE, pulled"
      ;;
    B)
      back_to_base || { echo "RESULT: no changes on $CUR -- $(worktree_note)"; exit 0; }
      # -d, not -D: git refuses if the branch has anything not merged.
      if g branch -d "$CUR" >/dev/null 2>&1; then
        echo "RESULT: no changes on $CUR -- back on $BASE, pulled, deleted local $CUR"
      else
        echo "RESULT: no changes on $CUR -- back on $BASE, pulled, kept local $CUR (git says it is not fully merged)"
      fi
      ;;
    B_MERGED)
      back_to_base || { echo "RESULT: $CUR was already merged in PR #$MERGED_PR -- $(worktree_note)"; exit 0; }
      # Safe to force-delete: its exact head commit is PR #$MERGED_PR, already squash-merged.
      g branch -D "$CUR" >/dev/null 2>&1
      echo "RESULT: $CUR was already merged in PR #$MERGED_PR -- back on $BASE, pulled, deleted local $CUR"
      ;;
    A|A_NEW_BRANCH)
      stop "there is work to ship on $CUR -- use: ship"
      ;;
    *)
      stop "$WHY"
      ;;
  esac
  exit 0
fi

# ---------------------------------------------------------------------------
# ship: cases A and A_NEW_BRANCH -- commit, push, PR, squash-merge, back to base

[ "$CMD" = "ship" ] || usage

[ -n "$MSG_FILE" ] || stop "ship needs --message-file - (the message on stdin)"
if [ "$MSG_FILE" = "-" ]; then
  MSG_FILE="$(mktemp "${TMPDIR:-/tmp}/git-pr-msg.XXXXXX")"
  TMP_FILES="$TMP_FILES $MSG_FILE"
  cat > "$MSG_FILE"
else
  [ -f "$MSG_FILE" ] || stop "message file $MSG_FILE does not exist"
  msg_dir="$(cd "$(dirname "$MSG_FILE")" && pwd)"
  case "$msg_dir/" in
    "$REPO/"*) stop "message file $MSG_FILE is inside the repo -- git add -A would commit it. Pass the message on stdin: --message-file -" ;;
  esac
fi
TITLE="$(sed -n '1p' "$MSG_FILE" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
[ -n "$TITLE" ] || stop "the first line of $MSG_FILE (the title) is empty"

command -v gh >/dev/null 2>&1 || stop "gh is not installed -- https://cli.github.com"

read_state

case "$CASE" in
  A) [ -z "$NEW_BRANCH" ] || stop "already on branch $CUR -- drop --new-branch" ;;
  A_NEW_BRANCH) [ -n "$NEW_BRANCH" ] || stop "on $BASE with uncommitted changes -- pass --new-branch <name>" ;;
  B|B_MERGED|C) stop "nothing to ship on $CUR -- use: sync" ;;
  *) stop "$WHY" ;;
esac

REPO_NWO="$(nwo)"
[ -n "$REPO_NWO" ] || stop "gh cannot see this repo on GitHub -- run: gh auth status"

if [ "$CASE" = "A_NEW_BRANCH" ]; then
  git check-ref-format --branch "$NEW_BRANCH" >/dev/null 2>&1 || stop "'$NEW_BRANCH' is not a valid branch name"
  g show-ref --verify --quiet "refs/heads/$NEW_BRANCH" && stop "local branch $NEW_BRANCH already exists"
  g ls-remote --exit-code --heads origin "$NEW_BRANCH" >/dev/null 2>&1 && stop "branch $NEW_BRANCH already exists on origin"
fi

# A remote branch with commits we do not have would need a force push. Never.
if g show-ref --verify --quiet "refs/remotes/origin/$CUR" && [ "$CASE" = "A" ]; then
  g merge-base --is-ancestor "origin/$CUR" HEAD || stop "origin/$CUR has commits that are not in local $CUR -- pull them by hand"
fi

if [ "$CASE" = "A_NEW_BRANCH" ]; then
  out="$(g checkout -b "$NEW_BRANCH" 2>&1)" || { tail_of "$out"; stop "git checkout -b $NEW_BRANCH failed"; }
  CUR="$NEW_BRANCH"
fi

# 1. commit
if [ "$DIRTY" -gt 0 ]; then
  g add -A
  out="$(g commit -q -m "$TITLE" 2>&1)" || { tail_of "$out"; stop "git commit failed (a pre-commit hook?) -- the changes are staged on $CUR"; }
fi
SHA="$(g rev-parse HEAD)"

# 2. push -- plain push, never forced
out="$(g push -u origin "$CUR" 2>&1)" || { tail_of "$out"; stop "git push origin $CUR was rejected -- nothing was forced"; }

# 3. PR -- reuse an open one for this branch, else create it
PR_URL="$(gh pr list -R "$REPO_NWO" --head "$CUR" --base "$BASE" --state open --limit 1 --json url -q '.[0].url // empty' 2>/dev/null)"
if [ -z "$PR_URL" ]; then
  BODY_FILE="$(mktemp "${TMPDIR:-/tmp}/git-pr-body.XXXXXX")"
  TMP_FILES="$TMP_FILES $BODY_FILE"
  sed '1d' "$MSG_FILE" | tr -d '\r' | sed '/./,$!d' > "$BODY_FILE"
  out="$(gh pr create -R "$REPO_NWO" --base "$BASE" --head "$CUR" --title "$TITLE" --body-file "$BODY_FILE" --assignee @me 2>&1)" \
    || { tail_of "$out"; stop "gh pr create failed -- $CUR is pushed, no PR was made"; }
  PR_URL="$(printf '%s\n' "$out" | grep -Eo 'https://[^ ]+/pull/[0-9]+' | tail -n 1)"
  [ -n "$PR_URL" ] || { tail_of "$out"; stop "gh pr create printed no PR URL"; }
fi
echo "PR: $PR_URL"

if [ $NO_MERGE -eq 1 ]; then
  echo "RESULT: PR open, not merged (--no-merge): $PR_URL -- still on $CUR"
  exit 0
fi

# GitHub can take a moment to see the push. Merge only the commit we pushed.
i=0
until [ "$(gh pr view "$PR_URL" --json headRefOid -q .headRefOid 2>/dev/null)" = "$SHA" ]; do
  i=$((i + 1))
  [ $i -le 15 ] || stop "after 30 s the PR head is still not $SHA -- not merging. The PR is open: $PR_URL"
  sleep 2
done

# 4. squash-merge. -R keeps gh away from the local checkout (it only deletes the
# remote branch). --match-head-commit refuses if anyone pushed after us.
# --auto is the fallback when checks or reviews gate the merge: GitHub then
# merges only once they pass. --admin is never used.
if out="$(gh pr merge "$PR_URL" -R "$REPO_NWO" --squash --delete-branch --match-head-commit "$SHA" 2>&1)"; then
  :
elif out2="$(gh pr merge "$PR_URL" -R "$REPO_NWO" --auto --squash --delete-branch --match-head-commit "$SHA" 2>&1)"; then
  echo "RESULT: auto-merge enabled on $PR_URL -- GitHub merges it when checks and reviews pass. Still on $CUR."
  exit 0
else
  tail_of "$out"
  tail_of "$out2"
  stop "gh pr merge failed (conflict, or merge blocked) -- the PR is open: $PR_URL"
fi

STATE="$(gh pr view "$PR_URL" --json state -q .state 2>/dev/null)"
[ "$STATE" = "MERGED" ] || stop "gh reported success but the PR state is '$STATE' -- check $PR_URL"

# 5. back to base. The tree is clean: everything was committed above.
back_to_base || { echo "RESULT: merged $PR_URL -- $(worktree_note)"; exit 0; }
g fetch --prune origin >/dev/null 2>&1

# Force-delete is safe only because the branch tip is exactly the merged PR head.
if [ "$(g rev-parse "refs/heads/$CUR" 2>/dev/null)" = "$SHA" ] \
  && [ "$(gh pr view "$PR_URL" --json headRefOid -q .headRefOid 2>/dev/null)" = "$SHA" ]; then
  g branch -D "$CUR" >/dev/null 2>&1
  echo "RESULT: merged $PR_URL -- back on $BASE, pulled, deleted $CUR"
else
  echo "RESULT: merged $PR_URL -- back on $BASE, pulled, kept local $CUR (its tip is not the merged commit)"
fi
exit 0

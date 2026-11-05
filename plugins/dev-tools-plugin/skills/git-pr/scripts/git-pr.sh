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
# Fast-forwards aside, the one merge it starts locally is origin/<base> into
# the feature branch, and only when the PR would conflict -- after everything
# is committed and pushed, so the tree is clean. That leaves the history linear enough for a
# plain push; a rebase would need a force push. `abort` is the only way back
# out of it (git merge --abort), and since the merge began from a clean tree,
# all it can discard is edits made to resolve that merge.
#
# Every step that could change something checks first. When a check fails the
# script prints "STOP: <reason>", exits 3, and changes nothing after that point.
# A STOP is for the human; the skill reports it and moves on. "RESOLVE:" (exit
# 4) is not a failure: the base merge is waiting for its conflicts to be
# edited, then `continue`.
#
# LINKED WORKTREES (claude -w)
#
# git lets only one checkout hold a branch, and the main checkout holds the
# base branch. So in a linked worktree "back on base and pulled" means: fast-
# forward the base branch where it is checked out (--ff-only; local changes
# there that would be overwritten turn it into a note, never a STOP -- the PR
# is merged by then), and park this worktree on origin/<base> as a detached
# HEAD. A detached HEAD on origin/<base> is a valid start: the next run ships
# new work from it on a new branch.
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
#   git-pr.sh continue <repo> [--base <branch>] [--no-merge]
#   git-pr.sh abort    <repo> [--base <branch>]
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
CONFLICT_DIFF_LINES=300

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

# A failed command's first lines on one line, for a RESULT note.
one_line() { printf '%s\n' "$1" | sed -n '1,3p' | tr '\t\n' '  ' | sed 's/  */ /g;s/ $//' | cut -c1-200; }

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
# Physical path: `git worktree list` prints physical paths, and base_holder
# compares against them.
REPO="$(cd "$REPO" && pwd -P)"
[ -e "$REPO/.git" ] || stop "$REPO is not a git repo"
g remote get-url origin >/dev/null 2>&1 || stop "$REPO has no remote named origin"

read_state() {
  local out f
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

  GITDIR="$(g rev-parse --absolute-git-dir)"
  IS_WORKTREE=0
  [ "$GITDIR" = "$(g rev-parse --path-format=absolute --git-common-dir)" ] || IS_WORKTREE=1

  # A detached HEAD on origin/BASE is where a finished worktree is parked (see
  # LINKED WORKTREES); work started there ships on a new branch, like work on
  # BASE itself. Any other detached HEAD needs a human.
  DETACHED=0
  if ! CUR="$(g symbolic-ref --quiet --short HEAD)"; then
    g merge-base --is-ancestor HEAD "origin/$BASE" 2>/dev/null \
      || stop "detached HEAD that is not on origin/$BASE -- check out a branch first"
    DETACHED=1
    CUR="(detached HEAD on origin/$BASE)"
  fi

  for f in REBASE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
    [ -e "$GITDIR/$f" ] && stop "a rebase, cherry-pick or revert is in progress"
  done
  # The one merge this script starts: origin/BASE into a feature branch (see
  # ship). It is resumed with `continue`. Any other merge needs a human.
  RESOLVING=0
  if [ -e "$GITDIR/MERGE_HEAD" ]; then
    if [ $DETACHED -eq 0 ] && [ "$CUR" != "$BASE" ] \
      && g merge-base --is-ancestor MERGE_HEAD "origin/$BASE" 2>/dev/null; then
      RESOLVING=1
    else
      stop "a merge is in progress that is not $BASE into a feature branch"
    fi
  elif [ -n "$(g diff --name-only --diff-filter=U)" ]; then
    stop "the working tree has unresolved conflicts"
  fi

  DIRTY="$(g status --porcelain --untracked-files=all | wc -l | tr -d ' ')"
  AHEAD="$(g rev-list --count "origin/$BASE..HEAD")"
  BEHIND="$(g rev-list --count "HEAD..origin/$BASE")"
  HEAD_SHA="$(g rev-parse HEAD)"
  MERGED_PR=""

  if [ $RESOLVING -eq 1 ]; then
    CASE="RESOLVING"
  elif [ $DETACHED -eq 1 ] || [ "$CUR" = "$BASE" ]; then
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

open_pr_for_branch() {
  gh pr list -R "$REPO_NWO" --head "$CUR" --base "$BASE" --state open --limit 1 --json url -q '.[0].url // empty' 2>/dev/null
}

# ---------------------------------------------------------------------------
# conflicts

# The commit `ship` would push: HEAD, or -- with uncommitted work -- HEAD plus
# that work, built in a throwaway index. The real index, the working tree and
# every ref stay untouched; only unreferenced objects are written.
tip_with_worktree() {
  local dir tree
  if [ "$DIRTY" -eq 0 ]; then
    g rev-parse HEAD
    return
  fi
  dir="$(mktemp -d "${TMPDIR:-/tmp}/git-pr-idx.XXXXXX")" || return 1
  # A copy of the real index keeps git's stat cache, so only changed files are
  # hashed. No index yet: git starts an empty one.
  cp "$(g rev-parse --path-format=absolute --git-path index)" "$dir/index" 2>/dev/null
  if GIT_INDEX_FILE="$dir/index" git -C "$REPO" add -A >/dev/null 2>&1 \
    && tree="$(GIT_INDEX_FILE="$dir/index" git -C "$REPO" write-tree 2>/dev/null)"; then
    rm -rf "$dir"
    g commit-tree "$tree" -p HEAD -m "git-pr conflict probe" 2>/dev/null
    return
  fi
  rm -rf "$dir"
  return 1
}

# Would merging origin/BASE into commit $1 conflict? Sets N_CONFLICTS (a count,
# or "unknown") and CONFLICT_FILES (one path per line). Touches nothing:
# merge-tree merges in memory.
predict_conflicts() {
  local out rc
  N_CONFLICTS=0
  CONFLICT_FILES=""
  [ "$BEHIND" -gt 0 ] || return 0 # origin/BASE has nothing new to conflict with
  out="$(g -c core.quotePath=false merge-tree --write-tree --name-only --no-messages "origin/$BASE" "$1" 2>/dev/null)"
  rc=$?
  case $rc in
    0) ;;
    1)
      CONFLICT_FILES="$(printf '%s\n' "$out" | sed '1d;/^$/d')"
      N_CONFLICTS="$(printf '%s\n' "$CONFLICT_FILES" | sed '/^$/d' | wc -l | tr -d ' ')"
      ;;
    *) N_CONFLICTS="unknown" ;;
  esac
}

# Every unmerged path of the merge in progress, as "<kind> <path>". The kind
# says which side did what: "us" is the branch, "them" is origin/BASE.
unmerged() {
  # -z: plain porcelain quotes a path with a space in it.
  g status --porcelain -z --untracked-files=no | while IFS= read -r -d '' entry; do
    p="${entry:3}"
    case "${entry:0:2}" in
      UU) echo "both-modified $p" ;;
      AA) echo "both-added $p" ;;
      UD) echo "deleted-on-$BASE $p" ;;
      DU) echo "deleted-on-branch $p" ;;
      AU) echo "added-on-branch $p" ;;
      UA) echo "added-on-$BASE $p" ;;
      DD) echo "both-deleted $p" ;;
    esac
  done
}

# What the merge in progress needs: the conflicted files, and what each side
# changed in them since the branch forked -- enough to resolve with intent.
show_conflicts() {
  local list paths mb f
  list="$(unmerged)"
  paths="$(printf '%s\n' "$list" | sed '/^$/d;s/^[^ ]* //')"
  echo "CONFLICTS=$(printf '%s\n' "$paths" | sed '/^$/d' | wc -l | tr -d ' ')"
  printf '%s\n' "$list" | sed '/^$/d;s/^/CONFLICT /'
  [ -n "$paths" ] || return 0
  mb="$(g merge-base HEAD MERGE_HEAD)"
  echo
  echo "--- what $CUR changed in them since it forked from $BASE (first $CONFLICT_DIFF_LINES lines)"
  printf '%s\n' "$paths" | while IFS= read -r f; do g diff "$mb" HEAD -- "$f"; done | head -n "$CONFLICT_DIFF_LINES"
  echo
  echo "--- what origin/$BASE changed in them meanwhile (first $CONFLICT_DIFF_LINES lines)"
  printf '%s\n' "$paths" | while IFS= read -r f; do g diff "$mb" MERGE_HEAD -- "$f"; done | head -n "$CONFLICT_DIFF_LINES"
}

# ---------------------------------------------------------------------------
# getting back onto the base branch

# Pull the base branch, fast-forward only. A diverged base is a STOP, never a reset.
pull_base() {
  local out
  out="$(g pull --ff-only origin "$BASE" 2>&1)" || { tail_of "$out"; stop "git pull --ff-only origin $BASE failed"; }
}

# Check out the base branch and pull it. For the main checkout only -- a linked
# worktree goes through park_worktree instead.
back_to_base() {
  local out
  out="$(g checkout "$BASE" 2>&1)" || { tail_of "$out"; stop "git checkout $BASE failed"; }
  pull_base
}

# The checkout that has BASE checked out, if any.
base_holder() {
  g worktree list --porcelain | awk -v want="branch refs/heads/$BASE" '
    /^worktree / { p = substr($0, 10) }
    $0 == want   { print p; exit }'
}

# Fast-forward BASE where some other checkout -- normally the main checkout --
# has it, so the user's base is current. Prints what happened, for the RESULT
# line. Never a STOP: local changes there are their owner's, and git refuses
# (rather than overwrites) when they are in the way.
update_base_holder() {
  local holder out
  holder="$(base_holder)"
  if [ -z "$holder" ]; then
    echo "no checkout has $BASE checked out"
  elif out="$(git -C "$holder" merge --ff-only --quiet "origin/$BASE" 2>&1)"; then
    echo "$BASE fast-forwarded in $holder"
  else
    echo "$BASE NOT updated in $holder -- $(one_line "$out")"
  fi
}

# A linked worktree after its branch is merged: update BASE where it lives,
# move this worktree onto origin/BASE (detached), and delete the branch when $1
# says it is safe. The tree is clean here: everything was committed.
park_worktree() {
  local safe="$1" what="$2" note out kept
  note="$(update_base_holder)"
  out="$(g checkout --quiet --detach "origin/$BASE" 2>&1)" \
    || { tail_of "$out"; stop "git checkout --detach origin/$BASE failed -- $what; $note"; }
  if [ "$safe" = "yes" ] && g branch -D "$CUR" >/dev/null 2>&1; then
    kept="deleted $CUR"
  else
    kept="kept local $CUR (its tip is not the merged commit)"
  fi
  echo "RESULT: $what -- $note; this worktree is now on origin/$BASE (detached), $kept"
}

# ---------------------------------------------------------------------------
# status: read-only apart from the fetch (and the unreferenced probe commit)

print_state() {
  echo "REPO=$REPO"
  if [ $IS_WORKTREE -eq 1 ]; then
    echo "WORKTREE=yes ($BASE is checked out in: $(base_holder))"
  else
    echo "WORKTREE=no"
  fi
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

if [ "$CMD" = "status" ]; then
  read_state
  print_state
  if [ "$CASE" = "A" ] || [ "$CASE" = "A_NEW_BRANCH" ]; then
    if tip="$(tip_with_worktree)"; then predict_conflicts "$tip"; else N_CONFLICTS="unknown"; fi
    echo "CONFLICTS=$N_CONFLICTS"
    [ -z "$CONFLICT_FILES" ] || printf '%s\n' "$CONFLICT_FILES" | sed 's/^/CONFLICT /'
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
  elif [ "$CASE" = "RESOLVING" ]; then
    show_conflicts
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# sync: cases B, B_MERGED and C -- nothing to ship, get back to base and pull

if [ "$CMD" = "sync" ]; then
  read_state
  case "$CASE" in
    C)
      if [ $DETACHED -eq 1 ]; then
        note="$(update_base_holder)"
        out="$(g checkout --quiet --detach "origin/$BASE" 2>&1)" \
          || { tail_of "$out"; stop "git checkout --detach origin/$BASE failed"; }
        echo "RESULT: on origin/$BASE (detached) -- $note"
      else
        pull_base
        echo "RESULT: on $BASE, pulled"
      fi
      ;;
    B)
      if [ $IS_WORKTREE -eq 1 ]; then
        # Nothing on the branch yet: it stays -- it is this worktree's name --
        # and only catches up with origin/BASE.
        note="$(update_base_holder)"
        out="$(g merge --ff-only --quiet "origin/$BASE" 2>&1)" \
          || { tail_of "$out"; stop "git merge --ff-only origin/$BASE failed on $CUR"; }
        echo "RESULT: no changes on $CUR -- $note; $CUR fast-forwarded to origin/$BASE"
        exit 0
      fi
      back_to_base
      # -d, not -D: git refuses if the branch has anything not merged.
      if g branch -d "$CUR" >/dev/null 2>&1; then
        echo "RESULT: no changes on $CUR -- back on $BASE, pulled, deleted local $CUR"
      else
        echo "RESULT: no changes on $CUR -- back on $BASE, pulled, kept local $CUR (git says it is not fully merged)"
      fi
      ;;
    B_MERGED)
      # Safe to force-delete: its exact head commit is PR #$MERGED_PR, already squash-merged.
      if [ $IS_WORKTREE -eq 1 ]; then
        park_worktree yes "$CUR was already merged in PR #$MERGED_PR"
        exit 0
      fi
      back_to_base
      g branch -D "$CUR" >/dev/null 2>&1
      echo "RESULT: $CUR was already merged in PR #$MERGED_PR -- back on $BASE, pulled, deleted local $CUR"
      ;;
    A|A_NEW_BRANCH)
      stop "there is work to ship on $CUR -- use: ship"
      ;;
    RESOLVING)
      stop "a merge of origin/$BASE into $CUR is waiting for its conflicts -- use: continue, or abort"
      ;;
    *)
      stop "$WHY"
      ;;
  esac
  exit 0
fi

# ---------------------------------------------------------------------------
# abort: back out of the base merge that ship started

if [ "$CMD" = "abort" ]; then
  read_state
  [ "$CASE" = "RESOLVING" ] || stop "there is no merge of origin/$BASE into a feature branch to abort"
  out="$(g merge --abort 2>&1)" || { tail_of "$out"; stop "git merge --abort failed"; }
  echo "RESULT: merge of origin/$BASE into $CUR aborted -- $CUR is as it was pushed; its PR is open and still conflicts"
  exit 0
fi

# ---------------------------------------------------------------------------
# ship and continue: commit, push, PR, squash-merge, back to base

# Push $CUR, plain -- never forced.
push_branch() {
  local out
  out="$(g push -u origin "$CUR" 2>&1)" || { tail_of "$out"; stop "git push origin $CUR was rejected -- nothing was forced"; }
}

# Squash-merge PR_URL at exactly SHA, then get back onto the base branch.
merge_and_return() {
  local i out out2 mergeable state
  # GitHub can take a moment to see the push. Merge only the commit we pushed.
  i=0
  until [ "$(gh pr view "$PR_URL" --json headRefOid -q .headRefOid 2>/dev/null)" = "$SHA" ]; do
    i=$((i + 1))
    [ $i -le 15 ] || stop "after 30 s the PR head is still not $SHA -- not merging. The PR is open: $PR_URL"
    sleep 2
  done

  # ...and a moment more to work out whether it still merges cleanly. The
  # local check came first, but origin/BASE can move in between.
  i=0
  while :; do
    mergeable="$(gh pr view "$PR_URL" --json mergeable -q .mergeable 2>/dev/null)"
    [ "$mergeable" = "UNKNOWN" ] || break
    i=$((i + 1))
    [ $i -le 15 ] || break
    sleep 2
  done
  [ "$mergeable" != "CONFLICTING" ] \
    || stop "GitHub says $PR_URL conflicts with $BASE, though it did not here ($BASE moved?) -- run /git-pr again to resolve it"

  # squash-merge. -R keeps gh away from the local checkout (it only deletes the
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
    stop "gh pr merge failed (merge blocked?) -- the PR is open: $PR_URL"
  fi

  state="$(gh pr view "$PR_URL" --json state -q .state 2>/dev/null)"
  [ "$state" = "MERGED" ] || stop "gh reported success but the PR state is '$state' -- check $PR_URL"

  # Force-delete is safe only because the branch tip is exactly the merged PR head.
  SAFE=no
  if [ "$(g rev-parse "refs/heads/$CUR" 2>/dev/null)" = "$SHA" ] \
    && [ "$(gh pr view "$PR_URL" --json headRefOid -q .headRefOid 2>/dev/null)" = "$SHA" ]; then
    SAFE=yes
  fi

  # Back to base. The tree is clean: everything was committed above.
  if [ $IS_WORKTREE -eq 1 ]; then
    g fetch --prune origin >/dev/null 2>&1
    park_worktree "$SAFE" "merged $PR_URL"
    exit 0
  fi
  back_to_base
  g fetch --prune origin >/dev/null 2>&1
  if [ "$SAFE" = "yes" ]; then
    g branch -D "$CUR" >/dev/null 2>&1
    echo "RESULT: merged $PR_URL -- back on $BASE, pulled, deleted $CUR"
  else
    echo "RESULT: merged $PR_URL -- back on $BASE, pulled, kept local $CUR (its tip is not the merged commit)"
  fi
  exit 0
}

[ "$CMD" = "ship" ] || [ "$CMD" = "continue" ] || usage

command -v gh >/dev/null 2>&1 || stop "gh is not installed -- https://cli.github.com"

# --- continue: the base merge is resolved -- commit it, push, merge the PR

if [ "$CMD" = "continue" ]; then
  read_state
  [ "$CASE" = "RESOLVING" ] || stop "there is no merge of origin/$BASE into a feature branch to continue"
  REPO_NWO="$(nwo)"
  [ -n "$REPO_NWO" ] || stop "gh cannot see this repo on GitHub -- run: gh auth status"

  # Every conflicted file must be resolved: no marker left. `=======` alone is
  # not checked -- it is also a Markdown heading underline.
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$REPO/$f" ] || continue
    line="$(grep -nE '^(<<<<<<<|>>>>>>>|\|\|\|\|\|\|\|)( |$)' "$REPO/$f" | head -n 1 | cut -d: -f1)"
    [ -z "$line" ] || stop "conflict marker left in $f:$line -- resolve it, then continue (or abort)"
  done <<EOF
$(g -c core.quotePath=false diff --name-only --diff-filter=U)
EOF
  WHY="$(new_files_problem)"
  [ -z "$WHY" ] || stop "$WHY"

  g add -A
  out="$(g commit -q --no-edit 2>&1)" \
    || { tail_of "$out"; stop "git commit failed (a pre-commit hook?) -- the resolution is staged, the merge still in progress"; }
  SHA="$(g rev-parse HEAD)"
  push_branch

  PR_URL="$(open_pr_for_branch)"
  [ -n "$PR_URL" ] || stop "the resolved merge is pushed, but $CUR has no open PR into $BASE -- run /git-pr again to open one"
  echo "PR: $PR_URL"
  if [ $NO_MERGE -eq 1 ]; then
    echo "RESULT: conflicts with $BASE resolved and pushed, PR open, not merged (--no-merge): $PR_URL -- still on $CUR"
    exit 0
  fi
  merge_and_return
fi

# --- ship: cases A and A_NEW_BRANCH

[ -n "$MSG_FILE" ] || stop "ship needs --message-file - (the message on stdin)"
if [ "$MSG_FILE" = "-" ]; then
  MSG_FILE="$(mktemp "${TMPDIR:-/tmp}/git-pr-msg.XXXXXX")"
  TMP_FILES="$TMP_FILES $MSG_FILE"
  cat > "$MSG_FILE"
else
  [ -f "$MSG_FILE" ] || stop "message file $MSG_FILE does not exist"
  msg_dir="$(cd "$(dirname "$MSG_FILE")" && pwd -P)"
  case "$msg_dir/" in
    "$REPO/"*) stop "message file $MSG_FILE is inside the repo -- git add -A would commit it. Pass the message on stdin: --message-file -" ;;
  esac
fi
TITLE="$(sed -n '1p' "$MSG_FILE" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
[ -n "$TITLE" ] || stop "the first line of $MSG_FILE (the title) is empty"

read_state

case "$CASE" in
  A) [ -z "$NEW_BRANCH" ] || stop "already on branch $CUR -- drop --new-branch" ;;
  A_NEW_BRANCH) [ -n "$NEW_BRANCH" ] || stop "on $CUR with uncommitted changes -- pass --new-branch <name>" ;;
  RESOLVING) stop "a merge of origin/$BASE into $CUR is waiting for its conflicts -- use: continue, or abort" ;;
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
if [ "$CASE" = "A" ] && g show-ref --verify --quiet "refs/remotes/origin/$CUR"; then
  g merge-base --is-ancestor "origin/$CUR" HEAD || stop "origin/$CUR has commits that are not in local $CUR -- pull them by hand"
fi

if [ "$CASE" = "A_NEW_BRANCH" ]; then
  out="$(g checkout -b "$NEW_BRANCH" 2>&1)" || { tail_of "$out"; stop "git checkout -b $NEW_BRANCH failed"; }
  CUR="$NEW_BRANCH"
  DETACHED=0
fi

# 1. commit
if [ "$DIRTY" -gt 0 ]; then
  g add -A
  out="$(g commit -q -m "$TITLE" 2>&1)" || { tail_of "$out"; stop "git commit failed (a pre-commit hook?) -- the changes are staged on $CUR"; }
fi
SHA="$(g rev-parse HEAD)"

# 2. push
push_branch

# 3. PR -- reuse an open one for this branch, else create it
PR_URL="$(open_pr_for_branch)"
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

# 4. a PR that would conflict: merge origin/BASE into the branch here, where
# Claude can resolve it, then `continue`. The tree is clean (all committed and
# pushed), so `abort` can always get back to exactly this point.
predict_conflicts "$SHA"
if [ "$N_CONFLICTS" != "0" ] && [ "$N_CONFLICTS" != "unknown" ]; then
  if out="$(g merge --no-ff --no-edit "origin/$BASE" 2>&1)"; then
    # git's own merge got through after all (rerere, say): push that and go on.
    SHA="$(g rev-parse HEAD)"
    push_branch
  else
    [ -e "$GITDIR/MERGE_HEAD" ] || { tail_of "$out"; stop "git merge origin/$BASE failed -- the PR is open: $PR_URL"; }
    echo "RESOLVE: merging origin/$BASE into $CUR conflicts -- edit the files below, then run: continue $REPO (or: abort $REPO). The PR is open: $PR_URL"
    show_conflicts
    exit 4
  fi
fi

# 5. squash-merge, back to base
merge_and_return

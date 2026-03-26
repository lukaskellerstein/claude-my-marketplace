---
name: sync-spec-kit
description: Synchronize the spec folder with the current state of implementation on a feature branch. Use this skill when the user says "sync spec", "update spec", "spec is outdated", "reflect changes in spec", "update the plan", "sync specification", "keep spec up to date", "spec drift", or any variation of wanting to reconcile implementation changes back into the spec-kit specification files (spec.md, plan.md, tasks.md, research.md, etc.).
---

# sync-spec-kit Skill

Keep the spec-kit specification folder (`.specify/specs/<feature>/`) in sync with the actual implementation on a feature branch.

---

## Workflow

### Step 1: Validate context

1. Check the current branch:

```bash
git branch --show-current
```

2. If the branch is `main` or `master`, **stop immediately** and tell the user:
   > "Spec sync only runs on feature branches. You're currently on `main`. Switch to your feature branch first."

3. Derive the feature name from the branch. Strip common prefixes (`feature/`, `feat/`, `bugfix/`, `fix/`, `hotfix/`, `chore/`, `refactor/`) and use the remainder.

### Step 2: Locate the spec folder

1. List available spec folders:

```bash
ls .specify/specs/
```

2. Match the feature name to a spec folder (exact match first, then fuzzy). If no match, list available specs and ask the user which one to sync.

### Step 3: Delegate to the sync-spec-kit-agent

Once the branch and spec folder are confirmed, launch the **`sync-spec-kit-agent`** using the Agent tool. Pass it the following context in the prompt:

- The current branch name
- The spec folder path (e.g., `.specify/specs/user-auth/`)
- Any specific context the user provided about what changed (e.g., "I added rate limiting", "we switched to Redis")

Example Agent invocation prompt:

> Sync the spec-kit specification folder `.specify/specs/<feature>/` with the current implementation on branch `<branch-name>`. <user's additional context if any>

The agent will:
1. Read all current spec files
2. Analyze the full git diff, changed files, and commit history against the base branch
3. Identify all spec drift (new requirements, changed requirements, architecture changes, etc.)
4. Update all spec files hierarchically (spec.md → plan.md → tasks.md → research.md → others)
5. Present a summary of everything that changed

### Step 4: Review the agent's output

After the agent completes, relay its summary to the user. If the agent encountered issues (e.g., no spec folder found, ambiguous match), surface those to the user and help resolve them.

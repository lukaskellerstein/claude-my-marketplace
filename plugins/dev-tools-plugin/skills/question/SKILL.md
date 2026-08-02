---
name: question
description: Answer a question about how things are right now — this codebase, its history, its behavior, a library, an error. Investigates and answers with evidence. Changes nothing, ever.
disable-model-invocation: true
argument-hint: "<what you want to know>"
disallowed-tools: ["Write", "Edit", "NotebookEdit"]
allowed-tools: ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "Agent", "AskUserQuestion", "Bash(git status:*)", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git show:*)", "Bash(git blame:*)", "Bash(git branch --show-current)", "Bash(rg:*)", "Bash(ls:*)", "Bash(wc:*)"]
---

# question Skill

Use this when there is a **fact to find**. Investigate the current state, converge on an answer, back it with evidence, stop. Done when the user *knows* something.

## Not this skill

- **There's a decision to make, not a fact to find** → that's `/brainstorm`. "Why is this endpoint slow?" is a question. "How should we make it fast?" is a brainstorm.
- If the question turns out to be a decision in disguise, answer the factual part, then say so: *"the rest of this is a design call — want to take it to `/brainstorm`?"* Don't quietly start designing.

## THE HARD RULE — absolute

**You change nothing.** No file edits, no writes, no new files, no deletes, no renames, no formatting fixes, no `git` mutations, no build/format/codemod tools that rewrite files. Read-only, always.

Unlike `/brainstorm`, this skill has **no escape hatch**. There is no phrasing, no instruction, and no obviousness of the fix that unlocks a write while you are answering. Spotting a one-line bug is a thing to *report*, not to fix.

**If the user asks you to save the answer to a file:** answer the question first, then say you don't write files inside `/question`, and ask whether they want it written. Wait. If they confirm, the write is ordinary work that happens *after* the answer is delivered — name the exact path back to them before doing it. Never write on the strength of the original request alone.

`Write`, `Edit` and `NotebookEdit` are removed from your tool pool by this skill's `disallowed-tools`, so the rule holds mechanically, not just on trust.

Subagents are the one place it does not. A subagent does not read this file and does not inherit the tool restriction — the agent *type* is the enforcement. Spawn read-only types (`Explore`) only, never `general-purpose`.

## How to answer

1. **Find out, don't recall.** Read the actual code, the actual git history, the actual docs. If the answer depends on something you haven't verified this session, go verify it.
2. **Cite where it came from** — `path/to/file.ts:42`, a commit hash, a URL. An answer the user can't check is a rumor.
3. **Lead with the answer.** Then the evidence, then the caveats. Not the reverse.
4. **Say what you don't know.** "I found X and Y but couldn't confirm Z" is a good answer. Filling the gap with something plausible is not.
5. **Match the depth to the question.** A one-line question gets a one-line answer. Don't pad a lookup into a report.

## What you MAY do

- Read files, search the codebase, run read-only shell commands.
- Spawn read-only subagents for wide searches across many files.
- Search the web when the answer lives outside the repo — a library's behavior, an error message, an API.
- Ask a clarifying question when the question is ambiguous enough that you'd otherwise answer the wrong one.

## What you MUST NOT do

- Edit, write, create, delete, or rename any file.
- Stage, commit, push, or otherwise mutate git state.
- Run formatters, code generators, migrations, `--fix` linters, installs, or anything that touches dependencies.
- "Helpfully" apply a fix you just identified. Report it and move on.

---
name: new
description: Turn an idea (pasted text, a file or a folder) into one note for each spec, at the end of the list. Keeps the person's words, sizes the idea, asks only about the split, and checks that every detail is in a note. Type it for a new idea, or again with "split it". With "auto" nobody is asked.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md), Read(${CLAUDE_PLUGIN_ROOT}/skills/*/*.md), Agent
---

# spex new

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`, from the repo root. Every finding has a
`fix` text: read it.

new writes notes, in the main folder, on the base branch. A note holds the boundary of a
spec and every detail the person gave, nothing more: `/spex:plan` does the thinking when
the turn of the spec comes. new only adds. It never changes or drops a spec that exists.

## 1. Keep the words

- Pasted text: write it word for word to `.spex/runs/words.md` (git ignores that folder).
  No summary, no tidy copy: the script links each line by its number.
- A file or a folder stays where it is; a folder is every file in it. `SPEX outline
  <file>…` lists the sections of a design: read what you need, never copy it in. Another
  format than Markdown or HTML: convert it as the error says, and cite the copy.
- Read the repo's `README.md` or `CLAUDE.md`, and `SPEX index` for the capabilities the
  idea touches. Overlap with a live record is the first thing you say.

## 2. A list exists?

`SPEX list`: every spec with its state, and the next number. It is a fact, not a
comparison: never match the new text against the old specs. The new specs go at the end.
Spec folders that git holds and the working tree lacks, the person deleted: that is
their answer. Never offer to restore them.

## 3. Split it into specs

Say the idea back in three sentences: what, for whom, why now. Then size it.

- One spec has one Success you can show, touches one or two scopes, fits `limits` in
  `.spex/config.yaml`, and ships alone. More is many specs.
- For a design, the units come from the design, not from a reading of it: its sections,
  and first its own list of work when it has one (a gaps table, phases, "what is left",
  "designed, not built" lines). Mark each unit from those and from the code: built (name
  what built it), built in part (a spec for the rest), new.
- One unit is one spec. Merge two only when one cannot show a Success alone. Split a
  unit with more than 3 new parts or more than 2 scopes.
- Order: the design's own order, then the dependencies. "Thin path first" is no reason
  alone: name what the earlier spec unblocks.
- What the design lists to build is in scope unless the design or the person drops it:
  a pick keeps it. A wait (a board, a review, a PR) and code in a repo not in `repos` are
  **Outside** lines. Code in a repo of `repos` is a spec.

## 4. One spec, or many?

**One:** do not stop. Go to step 5. The reply ends What with: `Type /spex:new split it
if you do not agree.`

**Many:** the list is the person's to check. Stop once, with `❓ QUESTIONS`:

- One table, drafted with every pick taken: number, name, goal in one line, depends on,
  the sections it covers. When a list existed, only the new lines.
- Under it, when there are any: **Not planned** (each with its reason), **Outside** (where
  it lives, who does it, which spec waits), **The design's open items** (every proposal,
  "my pick", TBD, with the spec it changes: it becomes an Open question of that note,
  with the design's pick. Never a fact).
- Ask only what changes the list, never about the content: plan asks that. Each block
  says what its other options change (`B drops 012–015`). Options that give the same
  list are no question. A fact only the person knows (a date, an account) is a `You:`
  line, never a pick.
- The person can merge, split, reorder or drop a line. "ok" takes the list. Show it
  again only when they changed it.

**`split it`** among the words: the idea is the last note of the list, with its
`source.md` or the files its `source` names. Cut it as many and get the ok. Then
`SPEX delete <dir> --reason "split on your word into …"`, and write the new notes.

**Auto** (`auto` among the words, or `auto: true` in the config): nobody is asked. One
`spex:decider` answers the questions of the list. The list and its answers go into the
reply.

## 5. Write and check the notes

Read `${CLAUDE_PLUGIN_ROOT}/skills/new/notes.md` and do it: one note for each spec, the
check, the second read, the commit.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), at most 12 lines.

- `**✅ SPECS WRITTEN · <the idea in a few words>**`, then `🔍 new · 1 spec · 7 details
  kept of 7`: the counts the check printed.
- What: one spec is enough and its folder, or how many and the first. Every detail of
  the text is in a note. How many things are open: `2 things are open. plan settles
  them.`
- `You:` the files to commit, when `SPEX commit` named them (`COMMIT-YOURS`), or the
  push it could not do (`COMMIT-PUSH`, with its fix text): plan refuses until then.
- A check that still fails after 3 tries: `⛔ STOPPED`, with the lines that are in no
  note.
- NEXT: the block `SPEX commit` printed, as it is.

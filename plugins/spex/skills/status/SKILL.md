---
name: status
description: Say where the work stopped — the one spec that is open, its phase, if the phase is started or done, a correction or a comment that is not finished, and the one command to go on. No agent runs and nothing changes. Use when the user says "spex status", "where was I", "what is next", or comes back to a repo after a break.
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs *), Read(${CLAUDE_PLUGIN_ROOT}/reply.md)
---

# spex status

`SPEX` = `${CLAUDE_PLUGIN_ROOT}/scripts/spex.mjs`. It needs no spec name: one spec is open
at a time, and the script finds it, also from the main folder while the spec is in its
worktree.

## Steps

1. `SPEX status`. Print what it printed, as it is: the `📍` line, each `not finished:`
   line, and the NEXT block. Change no word of it.
2. When the person asks for the whole list: `SPEX list`, as printed.

Nothing else. Do not read a file of the spec, do not start an agent, do not run the command
that NEXT names: the person types it. The script names the phase only. It keeps no step
inside a phase, so do not guess one: a phase that is started runs again from its first
box, and the files of the first run are still on disk.

## Reply

In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first), with no banner and no
verdict: line 1 is the `📍` line of the script, then its other lines, then its NEXT block.
At most 10 lines.

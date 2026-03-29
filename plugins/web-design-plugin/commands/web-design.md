---
description: Design and build a complete website or webapp from a project brief — end-to-end workflow from design to working React/Vite code
argument-hint: "<project description or file path> [--variations N] [--fast] [--no-media]"
allowed-tools: ["Read", "Agent"]
---

# /web-design — Entry Point

Parse the user's arguments and spawn the **web-design-orchestrator** agent.

## Parse Arguments

Extract from the user's input:
- **Brief**: Project description (inline text) or path to a file containing the brief
- **--variations N**: Generate N visual variations after the main design (default: 0)
- **--fast**: Skip user checkpoints, go straight through all phases
- **--no-media**: Skip media generation (structure-only prototype)

If the brief is a file path, read the file contents.

## Spawn Orchestrator

Spawn the `web-design-orchestrator` agent with a prompt containing:

```
Design and build a complete website.

**Project brief:**
[paste the full brief — either inline text or file contents]

**Flags:**
- variations: [N or 0]
- fast: [true/false]
- no-media: [true/false]

**Output directory:** designs/[next available number]/

Follow your full 5-phase workflow: Understand → Plan → Document → Implement → Test.
```

If `designs/` already has numbered directories, use the next available number.

That's it. The orchestrator handles everything from here.

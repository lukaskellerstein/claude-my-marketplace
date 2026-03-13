---
description: Initialize or update the docs/ folder structure with architecture and feature documentation sections, including mermaid diagrams
argument-hint: "[--force to overwrite existing docs/README.md]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Agent"]
---

# Initialize Documentation Structure

Create a unified `docs/` folder for the project with proper organization.

## Steps

1. **Check existing state**: Look for an existing `docs/` folder and any documentation files scattered in the repo.

2. **Create folder structure** (skip existing folders):
   ```
   docs/
   ├── README.md
   ├── architecture/
   │   ├── README.md
   │   └── decisions/
   │       └── README.md
   ├── features/
   │   └── README.md
   └── guides/
       └── README.md
   ```

3. **Analyze the codebase** to understand:
   - What services/components exist
   - What frameworks/languages are used
   - What infrastructure is in place
   - Key entry points and data flows

4. **Generate docs/README.md** — the documentation index linking to all sections.

5. **Generate docs/architecture/README.md** with:
   - A system overview section
   - A **mermaid C4 Context diagram** showing the system boundary, users, and external dependencies
   - A **mermaid C4 Container diagram** showing internal services, databases, and message queues
   - A component table listing each service, its responsibility, and technology
   - Links to detailed architecture docs

6. **Generate docs/features/README.md** — a feature index. Scan the codebase for distinct features and list them. Create a stub `docs/features/<feature>/README.md` for each significant feature found.

7. **Generate docs/guides/README.md** — link to getting-started and development guides.

8. **Use the mermaid MCP server** to validate all generated diagrams.

## Important

- Always use mermaid diagrams — never ASCII art or external image links
- Use the mermaid MCP server (`mcp__mermaid__*`) to validate diagram syntax
- If `docs/` already exists and `--force` is NOT passed, do NOT overwrite existing files — only create missing ones
- Base all diagrams and descriptions on actual codebase analysis, not assumptions
- Keep generated docs concise — they are starting points to be expanded by the team

# Company Package Structure

A company package follows the Agent Companies specification (`agentcompanies/v1`).

```
{company-slug}/
├── COMPANY.md                          # Company definition (name, goals, metadata)
├── GOALS.md                            # Rich goal hierarchy (optional, overrides COMPANY.md goals)
├── agents/
│   └── {agent-slug}/
│       ├── AGENTS.md                   # Agent identity, role, instructions (mandatory)
│       ├── HEARTBEAT.md                # Heartbeat execution protocol
│       ├── SOUL.md                     # Personality and voice
│       ├── TOOLS.md                    # Agent's personal tool notes (starts empty)
│       └── runtime/                    # Per-agent Claude Code runtime config
│           ├── settings.json           # Permissions, enabledPlugins, env vars
│           ├── mcp.json                # MCP server definitions
│           └── agents/                 # Claude Code subagent definitions
│               └── *.md
├── projects/
│   └── {project-slug}/
│       ├── PROJECT.md                  # Project definition
│       └── tasks/
│           └── {task-slug}/TASK.md     # Starter task
├── tasks/
│   └── {task-slug}/TASK.md             # Company-level starter tasks
├── skills/
│   └── {skill-slug}/SKILL.md           # Shared skills (one per skill referenced in any AGENTS.md)
├── global/                             # Shared runtime config (all agents)
│   ├── settings.json                   # Global Claude Code settings (baseline)
│   └── plugins.json                    # Marketplace and plugin installation
├── .paperclip.yaml                     # Vendor extension (adapter, budget, env)
├── README.md                           # Setup guide and org overview
└── LICENSE                             # MIT default
```

## Spec Reference

Full spec: `docs/companies/companies-spec.md`
Web: https://agentcompanies.io/specification

## Frontmatter Examples

### COMPANY.md

**Goals are mandatory (2-5).** Each must be specific and measurable. Never omit goals.

Goals are the top of the Paperclip work hierarchy: **Goal → Projects → Issues**. On import, each goal string becomes a `company`-level goal object with status `active`. Projects link to goals, and issues inherit `goalId` from their project — so all work traces back to these objectives.

```yaml
name: Company Name
description: What this company does
slug: company-slug
schema: agentcompanies/v1
version: 1.0.0
goals:
  - Launch MVP product with core features and user onboarding
  - Acquire first 50 paying customers within 90 days
  - Establish automated CI/CD pipeline with test coverage above 80%
  - Build content marketing engine producing 2+ blog posts per week
```

### GOALS.md (optional)

When present, GOALS.md provides a rich goal hierarchy with subgoals, ownership, and project linkage. It overrides the simple `goals: string[]` in COMPANY.md.

```yaml
goals:
  - slug: launch-mvp
    title: Launch MVP product with core features
    description: Ship authentication, onboarding, and core workflow
    level: company
    status: active
    ownerAgentSlug: cto
    projectSlugs: [mvp-backend, mvp-frontend]
    subgoals:
      - slug: build-auth
        title: Build authentication system
        level: team
        ownerAgentSlug: backend-lead
        projectSlugs: [mvp-backend]
      - slug: build-onboarding
        title: Build user onboarding flow
        level: team
        ownerAgentSlug: frontend-lead
  - slug: acquire-customers
    title: Acquire first 50 paying customers
    level: company
    status: active
    ownerAgentSlug: head-of-growth
```

**Field rules:**
- `slug` — required, unique within the package
- `title` — required
- `description` — optional
- `level` — optional, auto-assigned by depth: company → team → agent → task
- `status` — optional, defaults to "active"
- `ownerAgentSlug` — optional, references an agent slug from the package
- `projectSlugs` — optional, references project slugs from the package
- `subgoals` — optional, recursive nesting (max 4 levels)

### AGENTS.md

```yaml
name: CEO
title: Chief Executive Officer
reportsTo: null
skills:
  - strategy-review
  - delegation-playbook
```

Body contains the agent's instructions.

**Skill resolution rule:** Every skill in `skills:` must have a matching `skills/<shortname>/SKILL.md` in the package. Do NOT list Paperclip built-in skills (`paperclip`, `paperclip-create-agent`, `para-memory-files`) — they are available automatically at runtime and listing them causes import warnings.

### PROJECT.md

```yaml
name: Project Name
description: What this project delivers
slug: project-slug
owner: agent-slug
```

### TASK.md

```yaml
name: Task Name
assignee: agent-slug
project: project-slug
```

Body contains the task description.

## Deployment Summary

| Source (in package) | Destination (in container) | Scope |
|---|---|---|
| `global/settings.json` | `/paperclip/.claude/settings.json` | All agents |
| `global/plugins.json` | `/docker-init/claude/plugins.json` | All agents |
| `agents/{slug}/runtime/settings.json` | `<workspace>/.claude/settings.json` | One agent |
| `agents/{slug}/runtime/mcp.json` | `<workspace>/.mcp.json` | One agent |
| `agents/{slug}/runtime/agents/*.md` | `<workspace>/.claude/agents/*.md` | One agent |

Where `<workspace>` is `/paperclip/instances/default/workspaces/{agentId}/`.

## Global Config Setup

The `global/` files are NOT imported via the company import API. They must be placed in the Paperclip repo and mounted into the Docker container:

1. Copy `global/settings.json` and `global/plugins.json` into the Paperclip repo (e.g., `docker/init/claude/`)
2. Add a volume mount in `docker/docker-compose.yml`:
   ```yaml
   volumes:
     - ./init/claude:/docker-init/claude:ro
   ```
3. Rebuild/restart the container

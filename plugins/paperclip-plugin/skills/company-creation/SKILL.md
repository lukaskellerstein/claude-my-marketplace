---
name: company-creation
description: >
  Generate a complete Paperclip company package following the Agent Companies spec (agentcompanies/v1) —
  COMPANY.md with YAML frontmatter, agents with runtime config, teams, projects, tasks, skills,
  global settings, and a .paperclip.yaml vendor extension. Use when a user wants to create a new
  company on Paperclip or needs a full company package generated.
---

# Company Creation Skill

This skill generates a complete, ready-to-deploy company package for the Paperclip platform following the Agent Companies specification (`agentcompanies/v1`). The output is a portable package that can be version-controlled, shared, forked, and imported.

## When to Use

- User wants to create a new company on Paperclip
- User has a business idea and needs the full agent organization generated
- User invokes `/company <description>`

## Output Structure

The skill produces a directory named after the company slug (kebab-case) with this structure:

```
{company-slug}/
├── COMPANY.md                          # Company definition (name, goals, metadata)
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
│               └── *.md               # Subagent markdown files (if needed)
├── teams/
│   └── {team-slug}/TEAM.md            # Org subtree definition
├── projects/
│   └── {project-slug}/
│       ├── PROJECT.md                  # Project definition
│       └── tasks/
│           └── {task-slug}/TASK.md     # Starter task
├── tasks/
│   └── {task-slug}/TASK.md             # Company-level starter tasks
├── skills/
│   └── {skill-slug}/SKILL.md           # Shared skills (if applicable)
├── global/                             # Shared runtime config (all agents)
│   ├── settings.json                   # Global Claude Code settings (baseline)
│   └── plugins.json                    # Marketplace and plugin installation
└── .paperclip.yaml                     # Vendor extension (adapter, budget, env)
```

## Company Package Generation Process

### Phase 1: Business Understanding

From the user's description, determine:

1. **Company name & slug** — short, memorable, brandable; slug is kebab-case
2. **Business type** — e-commerce, SaaS, marketplace, agency, content platform, etc.
3. **Core product/service lines** — what does the company sell or deliver?
4. **Target market** — who are the customers?
5. **Tech stack** — what technologies are needed? (default: React/TypeScript frontend, Python/FastAPI backend, Docker/K8s infra)
6. **Revenue model** — how does money come in? (subscriptions, one-time purchases, commissions, etc.)
7. **Key risks** — what could go wrong?

### Phase 2: Org Design

Design the agent organization based on the business needs:

1. **CEO** (always present) — strategy, delegation, board communication
2. **CTO** (always present for tech companies) — engineering leadership, architecture
3. **Additional C-suite** — CMO (marketing), CFO (finance), COO (operations) — only if the business needs them
4. **Engineers** — backend-engineer, frontend-engineer, plus domain-specific (ml-engineer, data-engineer, etc.)
5. **QA** — qa-engineer, ux-tester — if the company has a user-facing product
6. **Content/Creative** — content-creator, designer — if the company needs marketing or design
7. **Operations** — head-of-operations — if there's logistics, fulfillment, or vendor management

**Rules:**
- Minimum viable org: CEO + CTO + 1-2 engineers
- Maximum recommended: 10-12 agents (budget-aware)
- Every agent must report to exactly one manager (tree structure)
- Only managers delegate; ICs execute
- Agent slugs are kebab-case (e.g., `backend-engineer`, `head-of-operations`)

### Phase 3: COMPANY.md

The top-level company definition with YAML frontmatter:

```markdown
---
name: {Company Name}
description: {What this company does}
slug: {company-slug}
schema: agentcompanies/v1
version: 1.0.0
goals:
  - {First goal}
  - {Second goal}
---

# {Company Name}

{Comprehensive business description: product lines, target market, revenue model, tech stack, key risks, growth opportunities}
```

### Phase 4: Agent Configuration

For each agent, generate the full instruction bundle at `agents/{agent-slug}/`:

#### AGENTS.md (Mandatory — Agent Identity & Instructions)

```yaml
name: {Agent Name}
title: {Job Title}
reportsTo: {manager-slug or null for CEO}
skills:
  - {skill-1}
  - {skill-2}
```

Body contents:
- **Role statement** — one line: what this agent is, what they own
- **Home directory convention** — `$AGENT_HOME` is their personal space
- **Company context** — 2-3 paragraph business summary relevant to this agent
- **Delegation rules** (for managers) — routing table of who handles what
- **What the agent does personally** — short list of direct responsibilities
- **Tech stack** — languages, frameworks, tools
- **Key systems owned** — domains and services
- **Safety rules** — what's forbidden
- **References** — pointers to HEARTBEAT.md, SOUL.md, TOOLS.md

#### HEARTBEAT.md (Execution Protocol)

Numbered checklist:
1. **Identity & context** — `GET /api/agents/me`, read wake env vars
2. **Local planning check** — read today's plan, review progress
3. **Approval follow-up** — if `PAPERCLIP_APPROVAL_ID` is set
4. **Get assignments** — fetch tasks, prioritize
5. **Checkout and work** — `POST /api/issues/{id}/checkout`, do the work
6. **Delegation** (for managers) — create subtasks
7. **Fact extraction** — extract durable facts into memory
8. **Exit** — comment on in-progress work, exit cleanly

#### SOUL.md (Personality & Voice)

Two sections only — keep it tight:
- **Strategic posture** — decision-making principles and priorities
- **Voice and tone** — how the agent communicates

#### TOOLS.md (Tool Notes)

Starts as a minimal scaffold — NOT pre-filled by the company author:

```markdown
# Tools

(Your tools will go here. Add notes about them as you acquire and use them.)
```

#### runtime/settings.json (Per-Agent Settings)

**CRITICAL:** Read the `role-plugin-matrix.md` reference in the **agent-design** skill directory for the exact JSON format.

```json
{
  "enabledPlugins": {
    "{plugin-name}-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_{plugin-name}-plugin_{mcp-server-name}"
    ]
  }
}
```

Role-to-plugin summary (see `role-plugin-matrix.md` for full details):

| Role | Plugins | MCP Permissions |
|------|---------|----------------|
| CEO | dev-tools-plugin, office-plugin, media-plugin | mermaid, media-playwright |
| CTO | dev-tools-plugin, office-plugin, media-plugin, infra-plugin | mermaid, media-playwright |
| CMO | office-plugin, media-plugin, design-plugin | mermaid, media-playwright, media-mcp, ElevenLabs |
| Engineers (backend) | dev-tools-plugin, infra-plugin | -- |
| Engineers (frontend) | dev-tools-plugin, design-plugin, web-design-plugin | webdesign-playwright, chrome |
| DevOps | dev-tools-plugin, infra-plugin | -- |
| QA | dev-tools-plugin | chrome |
| UX/Design | dev-tools-plugin, design-plugin, web-design-plugin | webdesign-playwright |
| Content | office-plugin, media-plugin, design-plugin | mermaid, media-playwright, media-mcp, ElevenLabs |
| HeadOfOperations | office-plugin, media-plugin | mermaid, media-playwright |

#### runtime/mcp.json (Per-Agent MCP Servers)

Most agents have empty `mcpServers: {}`. Agents that need Chrome DevTools:

```json
{
  "mcpServers": {
    "chrome": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-chrome-devtools@latest"]
    }
  }
}
```

**Which agents get Chrome MCP:** Frontend Engineer, QA Engineer, UX Tester

#### runtime/agents/ (Subagents)

Per-agent subagent definitions. Specialized Claude Code agents that the main agent can spawn:

```markdown
---
name: {subagent-name}
description: >
  What this subagent does.
model: sonnet
color: blue
---

You are a [role]. Your job is to [responsibility].
```

Use subagents for quick subtasks within the same session (review, test, search). Use Paperclip task delegation for tracked work.

### Phase 5: Teams

Group agents into teams at `teams/{team-slug}/TEAM.md`:

```markdown
---
name: {Team Name}
slug: {team-slug}
lead: {lead-agent-slug}
members:
  - {agent-slug-1}
  - {agent-slug-2}
---

# {Team Name}

{Team purpose and responsibilities}
```

### Phase 6: Projects & Tasks

#### Projects at `projects/{project-slug}/PROJECT.md`:

```markdown
---
name: {Project Name}
slug: {project-slug}
status: active
---

# {Project Name}

{Project description, scope, and deliverables}
```

#### Tasks at `projects/{project-slug}/tasks/{task-slug}/TASK.md` or `tasks/{task-slug}/TASK.md`:

```markdown
---
name: {Task Name}
slug: {task-slug}
assignee: {agent-slug}
priority: {critical|high|medium|low}
status: todo
---

# {Task Name}

{Task description with expected subtasks and delegation path}
```

### Phase 7: Global Configuration

#### global/settings.json

Baseline Claude Code settings shared by every agent. Universal deny rules:

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Read(./**/*.pem)",
      "Read(./**/*.key)"
    ]
  }
}
```

#### global/plugins.json

Marketplace and plugin installation manifest:

```json
{
  "marketplaces": [
    {
      "source": "lukaskellerstein/claude-my-marketplace",
      "scope": "user"
    }
  ],
  "plugins": [
    { "name": "documentation-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "media-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "design-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "infra-plugin@claude-my-marketplace", "scope": "user" }
  ]
}
```

Only include plugins that at least one agent in the company actually uses.

### Phase 8: Vendor Extension

#### .paperclip.yaml

```yaml
adapter: claude_local
budget:
  total_monthly_cents: {total}
  per_agent:
    ceo: {cents}
    cto: {cents}
    # ...
env:
  required:
    - PAPERCLIP_API_URL
    - GH_TOKEN
    - DOCKER_HUB_USERNAME
    - DOCKER_HUB_TOKEN
  optional:
    - STRIPE_SECRET_KEY
    - STRIPE_WEBHOOK_SECRET
```

### Phase 9: Import Script

Generate an import script that creates the whole company inside Paperclip via the API:

1. Creates the company via `POST /api/companies`
2. Sets the budget via `PATCH /api/companies/{id}`
3. Creates goals via `POST /api/companies/{id}/goals`
4. Creates agents in hierarchy order (parents first) via `POST /api/companies/{id}/agents`
5. Uploads instruction bundles for each agent
6. Deploys per-agent runtime config
7. Creates initial tasks assigned to CEO
8. Prints a summary with all created IDs

The script should:
- Use `curl` for API calls to `$PAPERCLIP_API_URL` (default: `http://localhost:3100`)
- Capture returned IDs and use them for subsequent calls
- Be idempotent where possible
- Print clear progress messages
- Exit on first error (`set -euo pipefail`)

## Deployment Summary

| Source (in company package) | Destination (in container) | Scope |
|---|---|---|
| `global/settings.json` | `/paperclip/.claude/settings.json` | All agents |
| `global/plugins.json` | `/docker-init/claude/plugins.json` | All agents |
| `agents/{slug}/runtime/settings.json` | `<agent_workspace>/.claude/settings.json` | One agent |
| `agents/{slug}/runtime/mcp.json` | `<agent_workspace>/.mcp.json` | One agent |
| `agents/{slug}/runtime/agents/*.md` | `<agent_workspace>/.claude/agents/*.md` | One agent |

Where `<agent_workspace>` is `/paperclip/instances/default/workspaces/{agentId}/`.

## Required Software & Services

Every company package should document what external services are needed:

- **Slack** — team communication
- **Google Workspace** — Email, Calendar, Drive
- **Stripe** — payment processing
- **Domain** — company domain name
- **GitHub** — source code, CI/CD
- **Docker Hub** — container registry
- **Kubernetes** — orchestration
- **Logistics** (if physical): Zasilkovna (Czech), DHL (international)

## References

- Agent Companies spec: see the spec document
- Paperclip API: see API documentation
- Example company: see the Figurio blueprint in the Paperclip repository

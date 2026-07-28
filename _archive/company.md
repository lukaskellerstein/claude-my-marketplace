# Paperclip Company Plugin

## Overview

I want to create a new paperclip-plugin that will help user / guide user, and create a "company" in paperclip.

## Company Package Structure

A company follows the Agent Companies specification (`agentcompanies/v1`). The package is a directory of markdown files with YAML frontmatter.

```
<company-slug>/
├── COMPANY.md                          # Company definition (name, goals, metadata)
├── agents/
│   └── <agent-slug>/
│       ├── AGENTS.md                   # Agent identity, role, instructions (mandatory)
│       ├── HEARTBEAT.md                # Heartbeat execution protocol
│       ├── SOUL.md                     # Personality and voice
│       ├── TOOLS.md                    # Agent's personal tool notes (starts empty)
│       └── runtime/                    # Per-agent Claude Code runtime config
│           ├── settings.json           # Permissions, enabledPlugins, env vars
│           ├── mcp.json                # MCP server definitions
│           └── agents/                 # Claude Code subagent definitions
│               ├── reviewer.md
│               └── test-runner.md
├── projects/
│   └── <project-slug>/
│       ├── PROJECT.md                  # Project definition
│       └── tasks/
│           └── <task-slug>/TASK.md     # Starter task
├── tasks/
│   └── <task-slug>/TASK.md             # Company-level starter tasks
├── skills/
│   └── <skill-slug>/SKILL.md           # Shared skills
├── global/                             # Shared runtime config (all agents)
│   ├── settings.json                   # Global Claude Code settings (baseline)
│   └── plugins.json                    # Marketplace and plugin installation
└── .paperclip.yaml                     # Vendor extension (adapter, budget, env)
```

**Spec reference:** `docs/companies/companies-spec.md`

---

## Company Definition Files (spec-compliant)

These files follow the Agent Companies specification and are vendor-neutral.

### `COMPANY.md`

```yaml
name: Company Name
description: What this company does
slug: company-slug
schema: agentcompanies/v1
version: 1.0.0
goals:
  - First goal
  - Second goal
```

### `AGENTS.md`

The agent's job description and operating manual. One per agent at `agents/<slug>/AGENTS.md`.

```yaml
name: CEO
title: Chief Executive Officer
reportsTo: null
skills:
  - paperclip
  - code-review
```

Contents of the body:

- **Role statement** — one line: what this agent is, what they own
- **Home directory convention** — `$AGENT_HOME` is their personal space for memory, knowledge, and notes
- **Delegation rules** (for managers) — routing table of who handles what type of work, with explicit "do NOT do X yourself" boundaries
- **What the agent does personally** — the short list of responsibilities they don't delegate
- **Keeping work moving** — follow-up expectations, how to handle blocked or stale tasks
- **Memory/planning conventions** — which skills to use for knowledge management (e.g., `para-memory-files`)
- **Safety rules** — what's forbidden (secret exfiltration, destructive commands without board approval)
- **References** — pointers to HEARTBEAT.md, SOUL.md, TOOLS.md

### `SOUL.md`

The agent's personality and voice. Sibling to `AGENTS.md` at `agents/<slug>/SOUL.md`. Two sections only — keep it tight:

- **Strategic posture** — decision-making principles and priorities (e.g., "default to action", "think in constraints not wishes", "optimize for learning speed and reversibility", trade-off preferences)
- **Voice and tone** — how the agent communicates: sentence structure, formality level, when to use energy vs. gravity vs. brevity, writing style rules

### `TOOLS.md`

A living toolkit reference that the agent maintains over time. Starts as a minimal scaffold:

```markdown
# Tools

(Your tools will go here. Add notes about them as you acquire and use them.)
```

This file is **not pre-filled by the company author**. The agent populates it as it discovers and uses tools, APIs, services, and infrastructure.

### `HEARTBEAT.md`

The step-by-step execution checklist the agent runs every time it wakes up. At `agents/<slug>/HEARTBEAT.md`.

Numbered protocol:

1. **Identity & context** — call `GET /api/agents/me`, read wake env vars (`PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`)
2. **Local planning check** — read today's plan, review progress, resolve blockers, record updates
3. **Approval follow-up** — if `PAPERCLIP_APPROVAL_ID` is set, review and handle linked issues
4. **Get assignments** — fetch assigned tasks, prioritize (`in_progress` > `todo`), skip tasks with active runs
5. **Checkout and work** — `POST /api/issues/{id}/checkout`, do the work, update status. Never retry a 409.
6. **Delegation** (for managers) — create subtasks with `parentId` and `goalId`
7. **Fact extraction** — extract durable facts from conversations into memory, update daily notes
8. **Exit** — comment on in-progress work, exit cleanly if nothing left to do

https://docs.paperclip.ing/guides/agent-developer/heartbeat-protocol

### `PROJECT.md`, `TASK.md`, `SKILL.md`

Follow the Agent Companies spec. See `docs/companies/companies-spec.md` for full details.

---

## Standard Roles

Paperclip supports these role types: `ceo`, `cto`, `cmo`, `cfo`, `engineer`, `designer`, `pm`, `qa`, `devops`, `researcher`, `general`. Each agent has a `role` (from this list) and a freeform `title` and `name` for specificity.

Use these as inspiration when designing a company org. Not every company needs all roles — start with the minimum viable org and grow.

### Executive & Leadership

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| CEO | `ceo` | Chief Executive Officer | Strategy, goal decomposition, delegation, board communication, hiring proposals. The only agent that talks to the board. | — |
| CTO | `cto` | Chief Technology Officer | Technical architecture, engineering leadership, build-vs-buy decisions, code quality standards, unblocking engineers. | CEO |
| CMO | `cmo` | Chief Marketing Officer | Brand strategy, marketing campaigns, content planning, SEO, customer acquisition, social media strategy. | CEO |
| CFO | `cfo` | Chief Financial Officer | Financial planning, budgeting, cost analysis, pricing strategy, revenue forecasting, cash flow management. | CEO |
| COO | `general` | Chief Operating Officer | Operations management, vendor relations, fulfillment logistics, supply chain, process optimization. | CEO |

### Engineering

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| BackendEngineer | `engineer` | Backend Engineer | API development, database design, payment integration, server-side logic. Python/FastAPI, Node.js, or Go. | CTO |
| FrontendEngineer | `engineer` | Frontend Engineer | UI implementation, responsive design, component libraries, client-side state. React/TypeScript, Tailwind. | CTO |
| FullstackEngineer | `engineer` | Fullstack Engineer | End-to-end feature development across frontend and backend. For smaller teams that don't need separate FE/BE. | CTO |
| InfraEngineer | `devops` | Infrastructure Engineer | Docker, Kubernetes, Terraform, CI/CD pipelines, monitoring, cloud infrastructure. | CTO |
| MLEngineer | `engineer` | ML Engineer | Machine learning pipelines, model training/serving, AI integrations, data preprocessing. | CTO |
| DataEngineer | `engineer` | Data Engineer | ETL pipelines, data warehousing, analytics infrastructure, data quality. | CTO |
| MobileEngineer | `engineer` | Mobile Engineer | iOS/Android development, React Native, mobile-specific UX patterns. | CTO |
| SoftwareArchitect | `engineer` | Software Architect | System design, API contracts, technical decision records, cross-team technical alignment. | CTO |

### Quality & Testing

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| QAEngineer | `qa` | QA Engineer | Test planning, automated testing, regression testing, bug reporting, test coverage. | CTO |
| UXTester | `qa` | UX Tester | User flow testing, accessibility audits, usability evaluation, browser/device testing. | CTO |
| SecurityEngineer | `engineer` | Security Engineer | Security audits, vulnerability scanning, penetration testing, compliance, secret management. | CTO |

### Design & Creative

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| UIDesigner | `designer` | UI Designer | Visual design, component design, design system maintenance, mockups, prototypes. | CTO or CMO |
| UXDesigner | `designer` | UX Designer | User research, wireframing, information architecture, interaction design, usability testing. | CTO or CMO |
| ChiefDesigner | `designer` | Chief Designer | Design leadership, brand visual identity, design system strategy, cross-team design consistency. | CEO or CTO |
| GraphicDesigner | `designer` | Graphic Designer | Marketing visuals, social media graphics, presentation decks, print materials. | CMO |

### Marketing & Content

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| ContentCreator | `general` | Content Creator | Blog posts, product descriptions, email copy, social media posts, SEO content. | CMO |
| MarketingSpecialist | `general` | Marketing Specialist | Campaign execution, analytics, A/B testing, paid ads, conversion optimization. | CMO |
| SocialMediaManager | `general` | Social Media Manager | Daily social media management, community engagement, influencer outreach, trend monitoring. | CMO |
| SEOSpecialist | `researcher` | SEO Specialist | Keyword research, on-page optimization, link building, technical SEO, search analytics. | CMO |

### Sales & Support

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| SalesRepresentative | `general` | Sales Representative | Lead qualification, outreach, demos, proposal writing, CRM management, B2B sales. | CEO or CMO |
| CustomerSupport | `general` | Customer Support | Ticket handling, customer inquiries, FAQ maintenance, escalation, satisfaction tracking. | COO or CEO |
| AccountManager | `general` | Account Manager | Existing client relationships, upselling, renewals, client success, feedback collection. | CEO or CMO |

### Operations & Logistics

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| HeadOfOperations | `general` | Head of Operations | Vendor management, fulfillment SOP, shipping logistics, quality assurance, cost optimization. | CEO |
| WarehouseManager | `general` | Warehouse Manager | Inventory management, order fulfillment, packaging, shipping coordination, stock tracking. | COO |
| SupplyChainManager | `general` | Supply Chain Manager | Supplier sourcing, procurement, lead time optimization, cost negotiation, vendor evaluation. | COO |

### Research & Strategy

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| ProductManager | `pm` | Product Manager | Product roadmap, feature prioritization, requirements, stakeholder alignment, user stories. | CEO or CTO |
| MarketResearcher | `researcher` | Market Researcher | Competitive analysis, market sizing, customer surveys, trend reports, pricing research. | CEO or CMO |
| DataAnalyst | `researcher` | Data Analyst | Business metrics, dashboards, reporting, data-driven insights, KPI tracking. | CEO or CFO |

### Typical Org Patterns

**Micro startup (3-4 agents):** CEO + CTO + FullstackEngineer (+ ContentCreator if marketing needed)

**Small tech company (5-7 agents):** CEO + CTO + BackendEngineer + FrontendEngineer + QAEngineer (+ CMO + ContentCreator)

**E-commerce company (8-10 agents):** CEO + CTO + BackendEngineer + FrontendEngineer + CMO + ContentCreator + HeadOfOperations + UIDesigner

**Full-service agency (10-12 agents):** CEO + CTO + BackendEngineer + FrontendEngineer + CMO + ContentCreator + UIDesigner + QAEngineer + InfraEngineer + ProductManager + CustomerSupport

---

## Runtime Configuration

Runtime configuration is split into two scopes:

| Scope | Location in package | Deployed to | Affects |
|-------|-------------------|-------------|---------|
| **Global** (all agents) | `global/` | `/paperclip/.claude/` (user-level) | Baseline for every agent in the container |
| **Per-agent** | `agents/<slug>/runtime/` | `<agent_workspace>/` (project-level) | Only that specific agent |

Claude Code resolves settings in layers: **user-level** (global) is the baseline, **project-level** (per-agent) overrides specific fields. Both layers merge at runtime.

### Global Configuration (`global/`)

Processed once at container startup by the Docker entrypoint (`scripts/docker-entrypoint.sh`). Affects all agents.

**Important — Paperclip repo setup required:** The `global/` files are NOT imported via the company import API. They must be placed in the Paperclip repository and mounted into the Docker container. The plugin should instruct the user to:

1. Copy `global/settings.json` and `global/plugins.json` into the Paperclip repo (e.g., `docker/init/claude/`)
2. Add a volume mount in `docker/docker-compose.yml`:
   ```yaml
   volumes:
     - ./init/claude:/docker-init/claude:ro
   ```
3. Rebuild/restart the container — the entrypoint will process these files at startup

#### `global/settings.json`

Baseline Claude Code settings shared by every agent. Sets universal guardrails.

**Deployed to:** `/paperclip/.claude/settings.json`

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

Use this for:
- Universal deny rules (no agent should ever do X)
- Shared env vars needed by all agents
- Baseline permissions common to every role

Do NOT put per-agent `enabledPlugins` here — that belongs in the per-agent `settings.json`.

#### `global/plugins.json`

Marketplace and plugin installation manifest. Installs plugin binaries globally so any agent can enable them.

**Mounted at:** `/docker-init/claude/plugins.json`

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

- `marketplaces` — plugin registries to add (runs `claude plugins marketplace add`)
- `plugins` — individual plugins to install (runs `claude plugins install`)
- `scope` — `"user"` (default) or `"project"`

**How it works:** The entrypoint iterates through each entry and runs the corresponding `claude plugins` CLI commands as the `node` user before the server starts. Plugins are installed into `/paperclip/.claude/plugins/` and are available to all agents. Each agent then selectively **enables** the plugins it needs via its own `settings.json` `enabledPlugins` field.

---

### Per-Agent Configuration (`agents/<slug>/runtime/`)

Each agent can have its own runtime config that overrides or extends the global baseline. These files are deployed to the agent's workspace directory, which becomes `cwd` when Claude Code runs.

#### `runtime/settings.json`

Per-agent Claude Code settings. Overrides the global baseline for this agent only.

**Source:** `agents/<slug>/runtime/settings.json`
**Deployed to:** `<agent_workspace>/.claude/settings.json`

**Reference:** https://code.claude.com/docs/en/settings

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm *)",
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot"
    ]
  },
  "enabledPlugins": {
    "documentation-plugin@claude-my-marketplace": true,
    "design-plugin@claude-my-marketplace": true,
    "infra-plugin@claude-my-marketplace": false
  },
  "env": {
    "SOME_VAR": "value"
  }
}
```

| Field | Purpose |
|-------|---------|
| `permissions.allow` | Tools and commands the agent can use without approval. MCP tool names: `mcp__<server>__<tool>` |
| `permissions.deny` | Explicitly blocked tools/commands (merged with global deny) |
| `enabledPlugins` | Which globally-installed plugins are active for this agent. `true` = enabled, `false` = disabled |
| `env` | Environment variables for this agent's session |

**Plugin architecture:** Marketplaces and plugin binaries are installed **globally once** via `global/plugins.json`. The per-agent `enabledPlugins` field controls which of those are **active** for each specific agent:

- FrontendEngineer: `design-plugin: true`, `web-design-plugin: true`
- BackendEngineer: `infra-plugin: true`, `design-plugin: false`
- CEO: `documentation-plugin: true`, no engineering plugins

**Available plugins from the marketplace** (https://github.com/lukaskellerstein/claude-my-marketplace):

| Plugin | What it provides | MCP servers | Best for |
|--------|-----------------|-------------|----------|
| `dev-tools-plugin` | Git workflows, dead-code analysis, dependency updates, spec-driven dev, docs generation | — | All engineering roles |
| `office-plugin` | Professional PPTX presentations, DOCX documents, XLSX spreadsheets | — | CEO, managers, content, operations |
| `infra-plugin` | Kubernetes/GKE, Istio, Helm, Terraform, Traefik, auth (Keycloak, OAuth2-proxy) | — | CTO, DevOps, infra engineers |
| `media-plugin` | AI image/video/music/speech generation, stock photos, SVG icons, charts, diagrams | media-mcp (Gemini), ElevenLabs, Mermaid Chart, Playwright | CMO, content creators, designers |
| `design-plugin` | Creative direction, styleguides, aesthetic strategy, typography, color systems, design review | — | Designers, frontend engineers, CMO |
| `web-design-plugin` | End-to-end website/webapp design and implementation, visual testing, anti-slop workflow. **Depends on:** design-plugin → media-plugin | Playwright | Frontend engineers, UX roles |
| `company-plugin` | Shipping logistics (Zásilkovna, DHL), payment processing (Stripe) | DHL API Assistant, Stripe | Operations, e-commerce roles |

Plugin names in `enabledPlugins` use the format `{name}@claude-my-marketplace` (e.g., `"media-plugin@claude-my-marketplace": true`).

**Plugin dependencies:** `web-design-plugin` depends on `design-plugin`, which depends on `media-plugin` and `office-plugin`. If you enable `web-design-plugin`, also enable its dependencies.

#### `runtime/mcp.json`

Per-agent MCP (Model Context Protocol) server configuration. Gives the agent access to external tools — browsers, APIs, databases, or any MCP-compatible service.

**Source:** `agents/<slug>/runtime/mcp.json` (no leading dot)
**Deployed to:** `<agent_workspace>/.mcp.json` (with leading dot)

The leading dot is required at the destination because Claude Code reads MCP configuration from `<cwd>/.mcp.json`.

**Format:**

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "<executable>",
      "args": ["<arg1>", "<arg2>"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `mcpServers` | Top-level object, each key is a unique server name |
| `command` | Executable to run (e.g., `npx`, `node`, `python`, `uvx`) |
| `args` | Array of command-line arguments |
| `env` | (optional) Environment variables for the server process |

**Examples:**

Browser automation (for QA, frontend, UX agents):
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-playwright@latest"]
    }
  }
}
```

Multiple servers:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-playwright@latest"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-github@latest"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

Empty file (agent has no MCP servers):
```json
{
  "mcpServers": {}
}
```

**How it works at runtime:** The `claude_local` adapter runs Claude Code with `cwd` set to the agent's workspace directory. Claude Code natively discovers `.mcp.json` in its working directory and starts the configured MCP servers for that session.

**Important:** MCP tools must also be allowed in the agent's `runtime/settings.json` permissions. Tool names follow the pattern `mcp__<server-name>__<tool-name>` (e.g., `mcp__playwright__browser_navigate`).

#### `runtime/agents/` (Subagents)

Per-agent subagent definitions. Specialized Claude Code agents that the main agent can spawn via the `Agent` tool during its work. Each subagent runs as a subprocess within the parent agent's session.

**Source:** `agents/<slug>/runtime/agents/*.md`
**Deployed to:** `<agent_workspace>/.claude/agents/*.md`

Claude Code discovers subagents from `<cwd>/.claude/agents/`. Subagents are discovered from `cwd` only — NOT from `--add-dir` directories.

**Format:** Each subagent is a markdown file with YAML frontmatter and a prompt body.

```markdown
---
name: <unique-name>
description: >
  What this subagent does.

  <example>
  Context: When to use this subagent
  user: "trigger phrase or task description"
  </example>
model: sonnet
color: blue
---

You are a [role]. Your job is to [responsibility].
```

**Frontmatter fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique identifier (e.g., `code-reviewer`) |
| `description` | string | Yes | Purpose description. Include `<example>` blocks for delegation hints |
| `model` | string | No | `haiku`, `sonnet`, `opus`, or `inherit` (default: inherits parent) |
| `tools` | string/array | No | Allowed tools. Omit to allow all |
| `disallowedTools` | string/array | No | Explicitly blocked tools |
| `maxTurns` | number | No | Maximum agentic turns |
| `color` | string | No | Visual indicator: `blue`, `purple`, `yellow`, `green`, `red` |

**Example — Code reviewer (read-only):**

```markdown
---
name: code-reviewer
description: >
  Reviews code for quality, security, and best practices. Never modifies code.

  <example>
  Context: User wants code review
  user: "review the authentication module"
  </example>
model: sonnet
disallowedTools: Edit, Write
color: blue
---

You are a senior code reviewer. Analyze code for:
- Security vulnerabilities
- Error handling gaps
- Performance issues
- Code style consistency

Report findings with file paths and line numbers. NEVER modify code.
```

**When to use subagents vs Paperclip task delegation:**

| Scenario | Use |
|----------|-----|
| Quick subtask within the same session (review, test, search) | **Subagent** |
| Work that should be tracked, approved, or assigned to a different role | **Paperclip task delegation** |
| Read-only analysis that doesn't need its own budget/session | **Subagent** |
| Work that requires a different workspace or repo | **Paperclip task delegation** |

---

## Deployment Summary

| Source (in company package) | Destination (in container) | Scope |
|---|---|---|
| `global/settings.json` | `/paperclip/.claude/settings.json` | All agents |
| `global/plugins.json` | `/docker-init/claude/plugins.json` | All agents |
| `agents/<slug>/runtime/settings.json` | `<agent_workspace>/.claude/settings.json` | One agent |
| `agents/<slug>/runtime/mcp.json` | `<agent_workspace>/.mcp.json` | One agent |
| `agents/<slug>/runtime/agents/*.md` | `<agent_workspace>/.claude/agents/*.md` | One agent |

Where `<agent_workspace>` is `/paperclip/instances/default/workspaces/{agentId}/`.

---

## Complete Example

```
figurio/
├── COMPANY.md
├── agents/
│   ├── ceo/
│   │   ├── AGENTS.md
│   │   ├── HEARTBEAT.md
│   │   ├── SOUL.md
│   │   ├── TOOLS.md
│   │   └── runtime/
│   │       └── settings.json           # enabledPlugins: documentation-plugin
│   ├── cto/
│   │   ├── AGENTS.md
│   │   ├── HEARTBEAT.md
│   │   ├── SOUL.md
│   │   ├── TOOLS.md
│   │   └── runtime/
│   │       ├── settings.json           # enabledPlugins: infra-plugin
│   │       └── agents/
│   │           └── arch-reviewer.md    # Architecture review subagent
│   ├── frontend-engineer/
│   │   ├── AGENTS.md
│   │   ├── HEARTBEAT.md
│   │   └── runtime/
│   │       ├── settings.json           # enabledPlugins: design-plugin, web-design-plugin
│   │       ├── mcp.json                # playwright for browser testing
│   │       └── agents/
│   │           └── test-runner.md      # Frontend test runner subagent
│   └── backend-engineer/
│       ├── AGENTS.md
│       ├── HEARTBEAT.md
│       └── runtime/
│           ├── settings.json           # enabledPlugins: infra-plugin
│           └── agents/
│               └── db-migration-checker.md
├── projects/
│   └── platform-launch/
│       ├── PROJECT.md
│       └── tasks/
│           └── setup-ci/TASK.md
├── skills/
│   └── code-review/SKILL.md
├── global/
│   ├── settings.json                   # Universal deny rules
│   └── plugins.json                    # Marketplace + all plugin installs
└── .paperclip.yaml                     # Adapter config, budgets, env inputs
```

---

## Required Software

Each company will have clearly defined software it needs:
- **Slack**
- **Google Workspace** — Email, Calendar, Drive, etc.
- **Payments** — Stripe, Card

## Required Infrastructure

Each company also needs:
- Domain
- Infra — by default k8s, helm, terraform
- GitHub account
- Docker Hub account

## Logistics

- Packaging, sending — Czech = Zásilkovna, World = DHL

## Plugin Concept

A Claude Code marketplace plugin that acts as a **Paperclip company advisor** — not just a one-time setup wizard, but an ongoing companion for designing, building, and improving AI companies running on Paperclip.

Distributed via the Claude Code marketplace.

### Two Modes

**1. Company Creator (`/company <description>`)**

A conversational skill that interviews you about your business idea and generates a complete company package ready to import into Paperclip. The flow:

1. **Discovery interview** — asks about the business: what it does, target market, product lines, revenue model, key operations
2. **Org design** — proposes an agent hierarchy (CEO, CTO, engineers, marketing, ops) tailored to the business, with reasoning for each role
3. **Goal setting** — defines top-level company goals and initial tasks
4. **Skills & tools** — recommends which Paperclip skills, MCP servers, plugins, and subagents each agent needs
5. **Infrastructure & integrations** — asks about required software (Slack, GitHub, Stripe, etc.), domain, hosting, API keys
6. **Package generation** — outputs a complete company package folder following the Agent Companies spec (see structure above), including:
   - `COMPANY.md`, all `AGENTS.md` files with instructions, `HEARTBEAT.md`, `SOUL.md`
   - Per-agent `runtime/` config (settings.json, mcp.json, subagents)
   - Global config (`global/settings.json`, `global/plugins.json`)
   - `.paperclip.yaml` vendor extension (adapter config, budgets, env inputs)
   - Projects, starter tasks, skills
   - An import script that creates the whole company inside Paperclip via the API

The generated company config must be high-quality and tailored — not generic org charts. The value is in the embedded Paperclip knowledge: correct heartbeat protocols, proper delegation rules, realistic budgets, and well-scoped agent instructions.

**2. Company Analyzer (`/company-analyze`)**

Reads the state of a running Paperclip company and produces actionable improvement suggestions. This is where the **recurring value** lives — setup is one-time, but analysis is ongoing. The analyzer can:

- Identify bottlenecked agents (over budget, stalled tasks, delegation failures)
- Suggest hiring new agents when capacity is insufficient
- Recommend heartbeat interval adjustments based on task patterns
- Flag agents with overly broad or narrow permissions
- Detect missing skills or MCP servers that would improve agent effectiveness
- Propose org chart restructuring based on observed delegation patterns
- Benchmark budgets against actual usage and suggest rebalancing

### Key Design Principles

- **Quality over speed** — a poorly generated company config destroys trust fast. The agent must produce instructions that are specific, actionable, and reflect real Paperclip best practices.
- **Stay current** — Paperclip is moving fast. The plugin should read Paperclip's own docs and skills at runtime rather than relying on baked-in knowledge that goes stale.
- **Advisor framing** — position as a company advisor you bring in at any stage (fresh start, mid-flight diagnosis, scaling up), not just a setup wizard.
- **Output is a package, not a config** — the output is a portable Agent Companies spec package that can be version-controlled, shared, forked, and imported — not a one-off API call.

## Source References

- **Source code:** `/home/lukas/Projects/Github/paperclipai/paperclip`
- **Documentation:** `/home/lukas/Projects/Github/paperclipai/paperclip/docs` (including API documentation)
- **Existing skills:** `/home/lukas/Projects/Github/paperclipai/paperclip/.claude/skills` and `/home/lukas/Projects/Github/paperclipai/paperclip/skills`
- **Onboarding assets (canonical examples):** `/home/lukas/Projects/Github/paperclipai/paperclip/server/src/onboarding-assets/ceo/`
- **Agent Companies spec:** `/home/lukas/Projects/Github/paperclipai/paperclip/docs/companies/companies-spec.md`

## Additional Ideas

- Leverage other existing plugins where they make sense for certain agents
- Offer a `/brainstorming` command for brainstorming ideas
- Come up with the best structure of the plugin that will help users create the best possible "companies" for their ideas

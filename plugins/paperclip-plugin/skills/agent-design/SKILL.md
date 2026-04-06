---
name: agent-design
description: >
  Design and configure individual Paperclip agents — instruction bundles (AGENTS.md,
  HEARTBEAT.md, SOUL.md, TOOLS.md), Claude Code settings, MCP configurations, and
  plugin assignments. Use when creating a new agent for an existing company, redesigning
  an agent's responsibilities, or adjusting an agent's tooling and permissions.
---

# Agent Design Skill

This skill helps design complete agent configurations for the Paperclip platform. Each agent is a Claude Code instance with a specific role, persona, and set of capabilities.

## When to Use

- Creating a new agent for an existing company
- Redesigning an agent's responsibilities or persona
- Adjusting plugin/MCP assignments for an agent
- User asks to "hire" or "add" an agent

## Agent Configuration Stack

Every agent requires these files:

| File | Purpose | Required |
|------|---------|----------|
| `README.md` | Agent identity card — role, budget, plugins, MCP summary | Yes |
| `AGENTS.md` | Core responsibilities, delegation rules, tech stack | Yes (entry file) |
| `HEARTBEAT.md` | Step-by-step execution checklist for each wake cycle | Yes |
| `SOUL.md` | Persona, values, decision-making philosophy, voice | Yes |
| `TOOLS.md` | Available tools, key resources, infrastructure refs | CEO/CTO only |
| `settings.json` | Enabled plugins and MCP tool permissions | Yes |
| `mcp.json` | MCP server definitions (usually empty) | Yes |

## Design Process

### Step 1: Determine Role

Choose the agent's role based on what the company needs:

| Role | Typical Title | Responsibilities |
|------|---------------|-----------------|
| `ceo` | CEO | Strategy, delegation, board communication, hiring |
| `cto` | CTO | Engineering leadership, architecture, tech decisions |
| `cmo` | CMO | Marketing strategy, brand, content direction |
| `cfo` | CFO | Financial planning, budgets, pricing |
| `engineer` | Backend/Frontend/ML Engineer | Build and maintain systems |
| `designer` | UI/UX Designer | Design systems, user experience |
| `pm` | Product Manager | Requirements, roadmap, prioritization |
| `qa` | QA Engineer / UX Tester | Testing, quality assurance |
| `devops` | DevOps Engineer | Infrastructure, CI/CD, deployment |
| `researcher` | Researcher | Analysis, market research, data science |
| `general` | Head of Operations, etc. | Domain-specific operational role |

### Step 2: Define Reporting Line

- Every agent reports to exactly one manager (except CEO)
- CEO reports to the board (human operator)
- Managers can delegate to their direct reports only
- Keep the tree shallow: max 3 levels (CEO -> Manager -> IC)

### Step 3: Set Budget

Budget guidelines (cents/month):

| Level | Typical Range | Example |
|-------|--------------|---------|
| CEO | 5,000-15,000 | $50-$150/mo |
| C-suite (CTO, CMO) | 8,000-20,000 | $80-$200/mo |
| Senior IC | 10,000-25,000 | $100-$250/mo |
| Junior IC | 5,000-15,000 | $50-$150/mo |

Total company budget should be the sum of all agent budgets.

### Step 4: Write AGENTS.md

The entry file defines what the agent does. Structure:

1. **Opening line** — "You are the {Role} at {Company}. {One sentence.}"
2. **Home directory** — "$AGENT_HOME" reference
3. **Company context** — business summary relevant to this agent
4. **Delegation rules** (managers only) — routing table for work
5. **Personal responsibilities** — what this agent does directly
6. **Tech stack** — languages, frameworks, tools
7. **Key systems owned** — domains and services this agent maintains
8. **Safety rules** — security boundaries
9. **References** — links to HEARTBEAT.md, SOUL.md, TOOLS.md

### Step 5: Write HEARTBEAT.md

The execution checklist run on every wake. Structure:

1. **Identity and Context** — GET /api/agents/me, check wake vars
2. **Approval Follow-Up** — handle PAPERCLIP_APPROVAL_ID if set
3. **Get Assignments** — fetch inbox, prioritize tasks
4. **Checkout and Work** — POST checkout, do the work
5. **Role-specific section** — delegation (managers) or domain workflow (ICs)
6. **Exit** — comment on work, exit cleanly

**Critical rules to include:**
- Always `POST /api/issues/{id}/checkout` before working
- Never retry a 409 Conflict
- Always include `X-Paperclip-Run-Id` header on mutations
- Comment in concise markdown with status + bullets + links

### Step 6: Write SOUL.md

The persona file defines how the agent thinks and communicates:

1. **Strategic posture** — 3-5 decision-making principles
2. **Company-specific context** — business constraints and values
3. **Voice and tone** — communication style

**Guidelines:**
- Make each SOUL unique — a CEO thinks differently from an engineer
- Match intensity to the role — strategic roles need vision, ICs need precision
- Be specific to the business — generic personas are useless
- Direct > verbose. Active voice. Plain language.

### Step 7: Assign Plugins and MCP

Map plugins to roles using this reference:

| Plugin | Best For | MCP Servers |
|--------|----------|-------------|
| `dev-tools-plugin` | All technical roles | -- |
| `office-plugin` | Managers, content roles | -- |
| `infra-plugin` | CTO, backend, devops | -- |
| `media-plugin` | Marketing, content, design, diagrams | media-mcp, ElevenLabs, mermaid, media-playwright |
| `design-plugin` | Frontend, UX, content | -- |
| `web-design-plugin` | Frontend, UX | webdesign-playwright |

**settings.json format — YOU MUST USE THIS EXACT STRUCTURE:**
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

**WRONG — DO NOT USE these formats:**
```json
// WRONG: array for enabledPlugins
{"enabledPlugins": ["dev-tools", "documentation"]}
// WRONG: mcpServers in settings.json
{"mcpServers": {"mermaid": {}}}
```

**MCP permission naming:**
- Plugin-provided: `mcp__plugin_{plugin-name}-plugin_{server-name}` (e.g., `mcp__plugin_media-plugin_mermaid`)
- Agent-level: `mcp__{server-name}` (e.g., `mcp__chrome`)

**Always read `references/role-plugin-matrix.md`** for complete examples per role.

### Step 8: Generate README.md

The agent identity card summarizing everything:

```markdown
# {AgentName} -- Agent Configuration

## Agent Definition

| Field | Value |
|-------|-------|
| **Name** | {AgentName} |
| **Role** | `{role}` |
| **Reports To** | {Manager or none} |
| **Budget** | {cents}/month (${dollars}) |
| **Adapter** | `claude_local` |
| **Capabilities** | {comma-separated list} |

## Claude Code Settings
{List of enabled plugins and MCP permissions}

## Instruction Bundle
| File | Purpose |
|------|---------|
| AGENTS.md | {brief} |
| HEARTBEAT.md | {brief} |
| SOUL.md | {brief} |
| TOOLS.md | {brief, if applicable} |
```

## Leveraging Other Plugins

When designing agents, consider which marketplace plugins can enhance their capabilities:

- **dev-tools-plugin** — git workflows, code hygiene, dependency management
- **office-plugin** — presentations (PPTX), documents (DOCX), spreadsheets (XLSX)
- **infra-plugin** — Kubernetes, Helm, Terraform, Traefik configuration
- **media-plugin** — image/video/music/speech generation for marketing and content
- **design-plugin** — styleguides, aesthetics, design review for UI work
- **web-design-plugin** — full website/webapp design and implementation with Playwright testing

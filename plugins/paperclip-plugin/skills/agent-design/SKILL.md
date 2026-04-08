---
name: agent-design
description: >
  Design and configure individual Paperclip agents following the Agent Companies spec —
  instruction bundles (AGENTS.md with YAML frontmatter, HEARTBEAT.md, SOUL.md, TOOLS.md),
  runtime config (settings.json, mcp.json, subagents), and plugin assignments. Use when
  creating a new agent, redesigning responsibilities, or adjusting tooling and permissions.
---

# Agent Design Skill

This skill helps design complete agent configurations for the Paperclip platform following the Agent Companies specification (`agentcompanies/v1`). Each agent is a Claude Code instance with a specific role, persona, and set of capabilities.

## When to Use

- Creating a new agent for an existing company
- Redesigning an agent's responsibilities or persona
- Adjusting plugin/MCP assignments for an agent
- User asks to "hire" or "add" an agent

## Agent File Layout

Every agent lives at `agents/{agent-slug}/` with this structure:

```
agents/{agent-slug}/
├── AGENTS.md                   # Agent identity, role, instructions (mandatory)
├── HEARTBEAT.md                # Heartbeat execution protocol
├── SOUL.md                     # Personality and voice
├── TOOLS.md                    # Agent tool reference — plugins, MCP servers, usage guidelines
└── runtime/                    # Per-agent Claude Code runtime config
    ├── settings.json           # Permissions, enabledPlugins, env vars
    ├── mcp.json                # MCP server definitions
    └── agents/                 # Claude Code subagent definitions
        ├── reviewer.md
        └── test-runner.md
```

Agent slugs are kebab-case (e.g., `ceo`, `backend-engineer`, `head-of-operations`).

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

The mandatory entry file with YAML frontmatter:

```markdown
---
name: {Agent Name}
title: {Job Title}
reportsTo: {manager-slug or null}
skills:
  - {custom-skill-1}
  - {custom-skill-2}
---

You are the {Role} at {Company}. {One-sentence job description}.

Your home directory is $AGENT_HOME. Everything personal to you lives there.

Company-wide artifacts live in the project root, outside your personal directory.

## Company Context
{2-3 paragraph business summary relevant to this agent's domain}

## Delegation (for managers only)
{Routing table: who handles what type of work, with explicit "do NOT do X yourself" boundaries}

## What you DO personally
{Bullet list of responsibilities this agent doesn't delegate}

## Tech Stack
{Technologies this agent works with}

## Key Systems You Own
{Systems and domains this agent is responsible for}

## Keeping Work Moving
{Follow-up expectations, how to handle blocked or stale tasks}

## Safety
- Never exfiltrate secrets or private data.
- Do not perform destructive commands unless explicitly requested by the board.

## References
- `$AGENT_HOME/HEARTBEAT.md` -- execution checklist
- `$AGENT_HOME/SOUL.md` -- persona and values
- `$AGENT_HOME/TOOLS.md` -- tools reference
```

**Skill assignment rules:**

Each agent should have multiple relevant skills — not just `paperclip`. Skills make agents effective at their specific responsibilities.

**Built-in Paperclip skills — do NOT list these in `skills:` frontmatter:**

The following skills are managed by Paperclip's runtime and are automatically available to agents. Do NOT include them in the AGENTS.md `skills:` array — they are not part of the company package and listing them causes import warnings.

| Skill | Purpose | Available to |
|-------|---------|-------------|
| `paperclip` | API coordination, heartbeat protocol, task management | All agents automatically |
| `paperclip-create-agent` | Governance-aware hiring of new agents | Managers automatically |
| `para-memory-files` | Persistent PARA-method memory across sessions | All agents automatically |

**Only list custom, company-specific skills in `skills:` frontmatter.** These MUST have a matching `skills/<shortname>/SKILL.md` file in the package.

**Custom skills per role** (MUST create `skills/<shortname>/SKILL.md` for each):

Generate these skills tailored to the company's domain. The skill names and content should be specific to the business, not generic.

| Role | Recommended custom skills | What the SKILL.md should contain |
|------|--------------------------|----------------------------------|
| CEO | `strategy-review`, `delegation-playbook` | How to evaluate strategy proposals, delegation routing rules, board communication format |
| CTO | `architecture-review`, `tech-decisions` | Architecture review checklist, ADR format, build-vs-buy evaluation criteria |
| CMO | `campaign-planning`, `brand-voice` | Campaign planning framework, brand tone/voice guide, channel strategy |
| CFO | `financial-analysis`, `pricing-model` | Financial reporting templates, pricing strategy framework, budget review process |
| Backend Engineer | `api-design`, `database-patterns` | API design conventions, database schema patterns, error handling standards for this company's stack |
| Frontend Engineer | `component-patterns`, `accessibility` | Component architecture, design system usage, a11y checklist for the company's UI framework |
| Fullstack Engineer | `api-design`, `component-patterns` | Combined backend + frontend conventions |
| Infrastructure Engineer | `deployment-runbook`, `incident-response` | Deployment procedures, rollback steps, incident response playbook |
| QA Engineer | `test-strategy`, `bug-report-format` | Test planning approach, coverage goals, bug report template with reproduction steps |
| UX Tester | `usability-checklist`, `accessibility` | Usability heuristics, a11y audit process, device/browser test matrix |
| Designer | `design-system`, `design-review` | Design system principles, component guidelines, review criteria |
| Content Creator | `content-style-guide`, `seo-checklist` | Writing style, tone, SEO rules, content calendar approach |
| Product Manager | `prd-template`, `feature-prioritization` | PRD format, prioritization framework (RICE/ICE), user story format |
| Head of Operations | `vendor-evaluation`, `fulfillment-sop` | Vendor assessment criteria, fulfillment step-by-step, QA checklist |
| Sales Representative | `sales-playbook`, `objection-handling` | Sales process stages, qualification criteria, common objections and responses |
| Customer Support | `support-playbook`, `escalation-rules` | Ticket handling procedures, escalation paths, FAQ maintenance process |

**Example AGENTS.md frontmatter for a Backend Engineer at an e-commerce company:**

```yaml
name: BackendEngineer
title: Backend Engineer
reportsTo: cto
skills:
  - api-design
  - database-patterns
```

This requires two custom skill files in the package:
- `skills/api-design/SKILL.md` — REST API conventions, endpoint naming, pagination, error responses specific to the e-commerce platform
- `skills/database-patterns/SKILL.md` — Schema patterns for products, orders, customers; migration conventions; indexing strategy

Note: `paperclip` and `para-memory-files` are NOT listed — they're built-in and available automatically.

**Skill file generation rule:**
- Every skill in `skills:` MUST have a `skills/<shortname>/SKILL.md` in the package
- Do NOT list `paperclip`, `paperclip-create-agent`, or `para-memory-files` in `skills:` — they're Paperclip built-ins managed by the runtime, and listing them causes import warnings
- Skills shared across multiple agents need only ONE `skills/<shortname>/SKILL.md`
- Skill content must be specific to the company's domain, tech stack, and conventions — not generic boilerplate
- **Every SKILL.md MUST have YAML frontmatter** with at least `name` and `description`. See the **skill-creator** skill for the full format, structure, and examples.

### Step 5: Write HEARTBEAT.md

Step-by-step execution checklist the agent runs every time it wakes up:

```markdown
# HEARTBEAT.md -- {AgentName} Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context
- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check
- Read today's plan, review progress, resolve blockers, record updates.

## 3. Approval Follow-Up (if applicable)
If `PAPERCLIP_APPROVAL_ID` is set:
- Review the approval and its linked issues.
- Close resolved issues or comment on what remains open.

## 4. Get Assignments
- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 5. Checkout and Work
- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 -- that task belongs to someone else.
- Do the work. Update status and comment when done.

## 6. {Role-specific section}
{For managers: delegation rules and subtask creation with parentId and goalId.
 For ICs: domain-specific workflow steps.}

## 7. Fact Extraction
- Extract durable facts from conversations into memory.
- Update daily notes.

## 8. Exit
- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

## Rules
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.
```

### Step 6: Write SOUL.md

Two sections only — keep it tight:

```markdown
# SOUL.md -- {Company} {Role} Persona

## Strategic Posture
{3-5 decision-making principles specific to this role and company.
 E.g., "default to action", "think in constraints not wishes",
 "optimize for learning speed and reversibility", trade-off preferences}

## Voice and Tone
{How the agent communicates: sentence structure, formality level,
 when to use energy vs. gravity vs. brevity, writing style rules}
```

**Guidelines:**
- Make each SOUL unique — a CEO thinks differently from an engineer
- Match intensity to the role — strategic roles need vision, ICs need precision
- Be specific to the business — generic personas are useless
- Direct > verbose. Active voice. Plain language.

### Step 7: Write TOOLS.md

Pre-fill TOOLS.md with the agent's assigned plugins, MCP servers, and role-specific usage guidelines. Use the same plugin assignments you will configure in Step 8 — refer to `references/role-plugin-matrix.md` for the mapping.

**Template:**

```markdown
# Tools — {Role}

## Plugins

| Plugin | Capabilities |
|--------|-------------|
| `{plugin-name}` | {one-line description from role-plugin-matrix} |

## MCP Servers

(Only if the agent has MCP servers assigned)

| Server | Permission | What it does |
|--------|-----------|-------------|
| {server} | `{permission-string}` | {brief description} |

## Google Workspace

(Only if the agent is GWS-eligible per role-plugin-matrix)

Available via the `gws` CLI. Email configured via `AGENT_EMAIL` env var.

**Services:** {list relevant GWS services for this role}.

Run `gws --help` or `gws <service> --help` for CLI documentation.

## Usage Guidelines

- {Role-specific guideline 1}
- {Role-specific guideline 2}
- {Role-specific guideline 3}

---
*Add personal tool notes below as you discover and use tools.*
```

**Rules:**
- List every plugin from the agent's `runtime/settings.json` with its capabilities
- Include MCP servers section only if the agent has MCP permissions
- Include Google Workspace section only if the agent is GWS-eligible
- Usage guidelines should be role-specific (3-5 bullets) — e.g., a CEO delegates technical tools, an engineer uses them directly
- Keep it concise — one line per plugin, not a full manual

### Step 8: Configure runtime/settings.json

Map plugins to roles using the reference matrix.

**YOU MUST USE THIS EXACT STRUCTURE:**
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

### Step 9: Configure runtime/mcp.json

Most agents have empty `mcpServers: {}`. Agents that need Chrome DevTools for browser testing:

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

### Step 10: Configure runtime/agents/ (Subagents)

Define subagents the agent can spawn via the `Agent` tool. Each subagent is a markdown file with YAML frontmatter:

```markdown
---
name: {subagent-name}
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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique identifier (e.g., `code-reviewer`) |
| `description` | string | Yes | Purpose description with `<example>` blocks |
| `model` | string | No | `haiku`, `sonnet`, `opus`, or `inherit` |
| `tools` | string/array | No | Allowed tools. Omit to allow all |
| `disallowedTools` | string/array | No | Blocked tools |
| `maxTurns` | number | No | Maximum agentic turns |
| `color` | string | No | `blue`, `purple`, `yellow`, `green`, `red` |

**When to use subagents vs Paperclip task delegation:**

| Scenario | Use |
|----------|-----|
| Quick subtask within the same session (review, test, search) | **Subagent** |
| Work that should be tracked, approved, or assigned to a different role | **Paperclip task delegation** |
| Read-only analysis that doesn't need its own budget/session | **Subagent** |
| Work that requires a different workspace or repo | **Paperclip task delegation** |

## Deployment

| Source (in package) | Destination (in container) | Scope |
|---|---|---|
| `agents/{slug}/runtime/settings.json` | `<agent_workspace>/.claude/settings.json` | One agent |
| `agents/{slug}/runtime/mcp.json` | `<agent_workspace>/.mcp.json` | One agent |
| `agents/{slug}/runtime/agents/*.md` | `<agent_workspace>/.claude/agents/*.md` | One agent |

Where `<agent_workspace>` is `/paperclip/instances/default/workspaces/{agentId}/`.

## Leveraging Other Plugins

When designing agents, consider which marketplace plugins can enhance their capabilities:

- **dev-tools-plugin** — git workflows, code hygiene, dependency management
- **office-plugin** — presentations (PPTX), documents (DOCX), spreadsheets (XLSX)
- **infra-plugin** — Kubernetes, Helm, Terraform, Traefik configuration
- **media-plugin** — image/video/music/speech generation for marketing and content
- **design-plugin** — styleguides, aesthetics, design review for UI work
- **web-design-plugin** — full website/webapp design and implementation with Playwright testing

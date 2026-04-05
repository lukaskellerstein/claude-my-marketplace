---
name: company-creation
description: >
  Generate a complete Paperclip company blueprint — business description, org structure,
  agent configurations (AGENTS.md, HEARTBEAT.md, SOUL.md, TOOLS.md, settings.json, mcp.json),
  goals, tasks, infrastructure, deployment flow, and a setup script. Use when a user wants to
  create a new company on Paperclip or needs a full company folder structure generated.
---

# Company Creation Skill

This skill generates a complete, ready-to-deploy company blueprint for the Paperclip platform. The output is a folder structure that mirrors the Figurio example in the Paperclip repository, customized to the user's business idea.

## When to Use

- User wants to create a new company on Paperclip
- User has a business idea and needs the full agent organization generated
- User invokes `/company <description>`

## Output Structure

The skill produces a folder named after the company (kebab-case) with this structure:

```
{company-name}/
  README.md                     <-- Setup guide (entry point)
  company.md                    <-- Full business description
  claude/                       <-- Global Claude Code configuration
    settings.json               <-- Global tool permissions (allow/deny)
    plugins.json                <-- Marketplace installation
  org/                          <-- Organization definition
    README.md                   <-- Org-level index
    company.md                  <-- Paperclip company record (IDs filled after creation)
    goals.md                    <-- Company goal with success criteria
    org-structure.md            <-- Org chart, agent registry, delegation flow
    tasks.md                    <-- Initial task backlog (5-10 strategic tasks for CEO)
    infrastructure.md           <-- GitHub, Docker Hub, K8s, monorepo layout
    deployment-flow.md          <-- Build, test, deploy workflow and CI/CD
    agents/                     <-- Per-agent configuration bundles
      {AgentName}/
        README.md               <-- Agent identity, CWD, enabled plugins, MCP summary
        AGENTS.md               <-- Core responsibilities and delegation rules
        HEARTBEAT.md            <-- Step-by-step heartbeat execution checklist
        SOUL.md                 <-- Persona, philosophy, voice and tone
        TOOLS.md                <-- (CEO and CTO only) Tool and resource reference
        settings.json           <-- Per-agent Claude Code settings (enabledPlugins + MCP)
        mcp.json                <-- Per-agent MCP server configuration
  setup.sh                      <-- Script to create the company via Paperclip API
```

## Company Blueprint Generation Process

### Phase 1: Business Understanding

From the user's description, determine:

1. **Company name** — short, memorable, brandable
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
4. **Engineers** — BackendEngineer, FrontendEngineer, plus domain-specific engineers (e.g., 3DPipelineEngineer, MLEngineer, DataEngineer)
5. **QA** — QAEngineer, UXTester — if the company has a user-facing product
6. **Content/Creative** — ContentCreator, Designer — if the company needs marketing or design
7. **Operations** — HeadOfOperations — if there's logistics, fulfillment, or vendor management

**Rules:**
- Minimum viable org: CEO + CTO + 1-2 engineers
- Maximum recommended: 10-12 agents (budget-aware)
- Every agent must report to exactly one manager (tree structure)
- Only managers delegate; ICs execute
- Valid roles: `ceo`, `cto`, `cmo`, `cfo`, `engineer`, `designer`, `pm`, `qa`, `devops`, `researcher`, `general`

### Phase 3: Agent Configuration

For each agent, generate the full instruction bundle:

#### AGENTS.md (Core Responsibilities)

```markdown
You are the {Role} at {Company}. {One-sentence job description}.

Your home directory is $AGENT_HOME. Everything personal to you lives there.

Company-wide artifacts live in the project root, outside your personal directory.

## Company Context
{2-3 paragraph business summary relevant to this agent's domain}

## Delegation (for managers only)
{Routing rules for work delegation}

## What you DO personally
{Bullet list of responsibilities}

## Tech Stack
{Technologies this agent works with}

## Key Systems You Own
{Systems and domains this agent is responsible for}

## Safety
- Never exfiltrate secrets or private data.
- Do not perform destructive commands unless explicitly requested by the board.

## References
- `$AGENT_HOME/HEARTBEAT.md` -- execution checklist
- `$AGENT_HOME/SOUL.md` -- persona and values
- `$AGENT_HOME/TOOLS.md` -- (if applicable) tools reference
```

#### HEARTBEAT.md (Execution Checklist)

```markdown
# HEARTBEAT.md -- {AgentName} Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context
- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Approval Follow-Up (if applicable)
If `PAPERCLIP_APPROVAL_ID` is set:
- Review the approval and its linked issues.
- Close resolved issues or comment on what remains open.

## 3. Get Assignments
- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 4. Checkout and Work
- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 -- that task belongs to someone else.
- Do the work. Update status and comment when done.

## 5. {Role-specific section}
{For managers: delegation rules. For ICs: domain-specific workflow steps.}

## 6. Exit
- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

## Rules
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.
```

#### SOUL.md (Persona & Voice)

```markdown
# SOUL.md -- {Company} {Role} Persona

You are the {title} at {company}.

## Strategic Posture
{3-5 decision-making principles specific to this role and company}

## {Company}-Specific
{2-3 business-specific constraints or values}

## Voice and Tone
{Communication style: directness, technical level, personality}
```

#### TOOLS.md (CEO/CTO only)

```markdown
# Tools

## Paperclip API
Primary coordination tool.

## Key Resources
{Business-specific resources: vendors, APIs, services}

## Infrastructure
{GitHub, Docker Hub, K8s, domains}
```

#### settings.json (Per-Agent)

Assign plugins based on role:

| Role | Plugins | MCP Permissions |
|------|---------|----------------|
| CEO | dev-tools, documentation | mermaid, docs-playwright |
| CTO | dev-tools, documentation, infra | mermaid, docs-playwright |
| CMO | documentation, media, design | mermaid, docs-playwright, media-mcp, ElevenLabs |
| Engineers (backend) | dev-tools, infra | -- |
| Engineers (frontend) | dev-tools, design, web-design | webdesign-playwright |
| QA | dev-tools | -- |
| UX/Design | dev-tools, design, web-design | webdesign-playwright |
| Content | documentation, media, design | mermaid, docs-playwright, media-mcp, ElevenLabs |

#### mcp.json (Per-Agent)

Most agents have empty `mcpServers: {}`. Exceptions:
- Frontend engineers and UX testers may need `chrome` MCP for browser testing

### Phase 4: Company-Level Documents

Generate:

1. **company.md** — comprehensive business description (product lines, pricing, risks, tech stack, growth opportunities)
2. **org/company.md** — Paperclip company record (IDs to be filled after API creation)
3. **org/goals.md** — company goal with success criteria and timeline
4. **org/org-structure.md** — org chart, agent registry with roles and budgets, delegation flow
5. **org/tasks.md** — 5-10 initial tasks assigned to CEO for delegation
6. **org/infrastructure.md** — GitHub repo, Docker Hub, K8s, monorepo layout
7. **org/deployment-flow.md** — build, test, deploy workflow

### Phase 5: Global Configuration

Generate:

1. **claude/plugins.json** — marketplace installation:
   ```json
   {
     "marketplaces": [
       { "source": "lukaskellerstein/claude-my-marketplace", "scope": "user" }
     ]
   }
   ```

2. **claude/settings.json** — global tool permissions (allow/deny lists)

### Phase 6: Setup Script

Generate `setup.sh` that:

1. Reads the blueprint files
2. Creates the company via `POST /api/companies`
3. Sets the budget via `PATCH /api/companies/{id}`
4. Creates the goal via `POST /api/companies/{id}/goals`
5. Creates agents in hierarchy order (parents first) via `POST /api/companies/{id}/agents`
6. Uploads instruction bundles for each agent
7. Deploys per-agent settings.json and mcp.json
8. Creates initial tasks assigned to CEO
9. Prints a summary with all created IDs

The script should:
- Use `curl` for API calls to `$PAPERCLIP_API_URL` (default: `http://localhost:3100`)
- Capture returned IDs and use them for subsequent calls
- Be idempotent where possible
- Print clear progress messages
- Exit on first error (`set -euo pipefail`)

## Required Software & Services

Every company blueprint should document what external services are needed:

### Communication
- **Slack** — team communication (channels per department)

### Productivity
- **Google Workspace** — Email, Calendar, Drive, Docs

### Payments
- **Stripe** — payment processing (test mode for dev, live for prod)

### Infrastructure
- **Domain** — company domain name
- **GitHub** — source code, CI/CD
- **Docker Hub** — container registry
- **Kubernetes** — orchestration (microk8s-local or cloud)

### Logistics (if physical product)
- **Czech Republic:** Zasilkovna (Packeta)
- **International:** DHL, FedEx, or UPS

## References

- Paperclip API: see `paperclip` skill for full API reference
- Agent creation: see `paperclip-create-agent` skill
- Example company: see the Figurio blueprint in the Paperclip repository (`MY/` directory)

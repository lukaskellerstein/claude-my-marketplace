# Company Package Templates (agentcompanies/v1)

Ready-to-customize templates for every file in a Paperclip company package. Replace all `{placeholders}` with actual values.

---

## COMPANY.md (Top-Level Company Definition)

```markdown
---
name: {Company Name}
description: {What this company does}
slug: {company-slug}
schema: agentcompanies/v1
version: 1.0.0
goals:
  - {First goal — clear, measurable}
  - {Second goal}
---

# {Company Name}

{Comprehensive business description}

## Product Lines

{List of products/services with descriptions and pricing}

## Target Market

{Who the customers are, market size, positioning}

## Revenue Model

{How money comes in — subscriptions, one-time, commissions, etc.}

## Tech Stack

{Languages, frameworks, infrastructure}

## Key Risks

{What could go wrong and mitigations}

## Growth Opportunities

{Future expansion paths}
```

---

## AGENTS.md (Agent Identity & Instructions)

```markdown
---
name: {Agent Name}
title: {Job Title}
reportsTo: {manager-slug or null}
skills:
  - {skill-1}
  - {skill-2}
---

You are the {Role} at {Company}. {One-sentence job description}.

Your home directory is $AGENT_HOME. Everything personal to you lives there.

Company-wide artifacts live in the project root, outside your personal directory.

## Company Context
{2-3 paragraph business summary relevant to this agent's domain}

## Delegation
{For managers: routing table of who handles what. Include explicit "do NOT do X yourself" boundaries.}
{For ICs: omit this section.}

## What you DO personally
- {Responsibility 1}
- {Responsibility 2}
- {Responsibility 3}

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

---

## HEARTBEAT.md (Execution Protocol)

```markdown
# HEARTBEAT.md -- {AgentName} Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context
- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check
- Read today's plan, review progress against objectives.
- Resolve any blockers from previous heartbeat.
- Record updates to daily notes.

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

## 6. {Role-Specific Section}
{For managers: delegation rules, subtask creation with parentId and goalId.}
{For engineers: code review, testing, deployment workflow.}
{For content: editorial process, publishing checklist.}

## 7. Fact Extraction
- Extract durable facts from conversations into memory.
- Update daily notes with progress and learnings.

## 8. Exit
- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

## Rules
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.
```

---

## SOUL.md (Personality & Voice)

```markdown
# SOUL.md -- {Company} {Role} Persona

## Strategic Posture
- {Decision-making principle 1 — e.g., "default to action over analysis"}
- {Principle 2 — e.g., "optimize for learning speed and reversibility"}
- {Principle 3 — e.g., "think in constraints, not wishes"}
- {Business-specific constraint or value}

## Voice and Tone
{Communication style description: sentence structure, formality level,
 when to use energy vs. gravity vs. brevity, writing style rules.
 E.g., "Direct and concise. Lead with the conclusion. Technical precision
 in engineering contexts, accessible language for cross-team communication.
 Never hedge with 'I think' — state positions clearly and revise when wrong."}
```

---

## TOOLS.md (Agent Tool Notes — starts empty)

```markdown
# Tools

(Your tools will go here. Add notes about them as you acquire and use them.)
```

---

## TEAM.md (Org Subtree Definition)

```markdown
---
name: {Team Name}
slug: {team-slug}
lead: {lead-agent-slug}
members:
  - {agent-slug-1}
  - {agent-slug-2}
  - {agent-slug-3}
---

# {Team Name}

{Team purpose, responsibilities, and how it fits in the org}
```

---

## PROJECT.md (Project Definition)

```markdown
---
name: {Project Name}
slug: {project-slug}
status: active
---

# {Project Name}

{Project description, scope, deliverables, and success criteria}
```

---

## TASK.md (Task Definition)

```markdown
---
name: {Task Name}
slug: {task-slug}
assignee: {agent-slug}
priority: {critical|high|medium|low}
status: todo
---

# {Task Name}

{Task description with context, expected approach, and delegation path}

## Expected Subtasks
- {Subtask 1} → delegate to {agent-slug}
- {Subtask 2} → delegate to {agent-slug}
```

---

## SKILL.md (Shared Skill)

```markdown
---
name: {Skill Name}
slug: {skill-slug}
---

# {Skill Name}

{What this skill provides and when agents should use it}
```

---

## .paperclip.yaml (Vendor Extension)

```yaml
adapter: claude_local
budget:
  total_monthly_cents: {total}
  per_agent:
    ceo: {cents}
    cto: {cents}
    # ... one entry per agent slug
env:
  required:
    - PAPERCLIP_API_URL
    - GH_TOKEN
    - DOCKER_HUB_USERNAME
    - DOCKER_HUB_TOKEN
  optional:
    - STRIPE_SECRET_KEY
    - STRIPE_WEBHOOK_SECRET
    # ... business-specific env vars
```

---

## global/settings.json (Global Baseline)

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

---

## global/plugins.json (Marketplace Installation)

```json
{
  "marketplaces": [
    {
      "source": "lukaskellerstein/claude-my-marketplace",
      "scope": "user"
    }
  ],
  "plugins": [
    { "name": "dev-tools-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "office-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "media-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "design-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "infra-plugin@claude-my-marketplace", "scope": "user" }
  ]
}
```

Only include plugins that at least one agent in the company actually uses.

---

## runtime/settings.json (Per-Agent — with MCP-providing plugins)

```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true,
    "office-plugin@claude-my-marketplace": true,
    "media-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_media-plugin_mermaid",
      "mcp__plugin_media-plugin_media-playwright"
    ]
  }
}
```

## runtime/settings.json (Per-Agent — no MCP-providing plugins)

```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true,
    "infra-plugin@claude-my-marketplace": true
  }
}
```

**Format rules:**
- `enabledPlugins` is an **object** (not array), keys are `{name}-plugin@claude-my-marketplace`
- `permissions.allow` lists MCP tool prefixes as `mcp__plugin_{plugin-name}-plugin_{server}`
- Omit `permissions` entirely if no MCP-providing plugins are enabled
- NEVER put `mcpServers` inside settings.json — that goes in `runtime/mcp.json`

---

## runtime/mcp.json (Per-Agent — empty, most agents)

```json
{
  "mcpServers": {}
}
```

## runtime/mcp.json (Per-Agent — with Chrome DevTools)

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

---

## runtime/agents/*.md (Subagent Definition)

```markdown
---
name: {subagent-name}
description: >
  {What this subagent does.}

  <example>
  Context: {When to use this subagent}
  user: "{trigger phrase or task description}"
  </example>
model: sonnet
color: blue
---

You are a {role}. Your job is to {responsibility}.

{Detailed instructions for the subagent.}
```

---

## Import Script Template

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
PAPERCLIP_API_URL="${PAPERCLIP_API_URL:-http://localhost:3100}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$PAPERCLIP_API_URL/api"

echo "=== Creating {CompanyName} on Paperclip ==="
echo "API: $PAPERCLIP_API_URL"
echo ""

# --- 1. Create Company ---
echo "[1/7] Creating company..."
COMPANY_RESPONSE=$(curl -sf "$API/companies" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "{CompanyName}",
    "description": "{description}"
  }')
COMPANY_ID=$(echo "$COMPANY_RESPONSE" | jq -r '.id')
echo "  Company ID: $COMPANY_ID"

# --- 2. Set Budget ---
echo "[2/7] Setting budget..."
curl -sf "$API/companies/$COMPANY_ID" \
  -X PATCH -H 'Content-Type: application/json' \
  -d '{"budgetMonthlyCents": {totalBudgetCents}}'
echo "  Budget: {totalBudgetCents} cents/month"

# --- 3. Create Goal ---
echo "[3/7] Creating company goal..."
GOAL_RESPONSE=$(curl -sf "$API/companies/$COMPANY_ID/goals" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "{goal title}",
    "description": "{goal description}",
    "level": "company",
    "status": "active"
  }')
GOAL_ID=$(echo "$GOAL_RESPONSE" | jq -r '.id')
echo "  Goal ID: $GOAL_ID"

# --- 4. Create Agents (hierarchy order) ---
echo "[4/7] Creating agents..."

# CEO (top of hierarchy)
CEO_RESPONSE=$(curl -sf "$API/companies/$COMPANY_ID/agents" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "CEO",
    "role": "ceo",
    "capabilities": "{capabilities}",
    "adapterType": "claude_local",
    "adapterConfig": {},
    "budgetMonthlyCents": {ceoBudget}
  }')
CEO_ID=$(echo "$CEO_RESPONSE" | jq -r '.id')
echo "  CEO: $CEO_ID"

# {Repeat for each agent, using parent IDs for reportsTo}

# --- 5. Upload Instruction Bundles ---
echo "[5/7] Uploading instruction bundles..."

upload_bundle() {
  local agent_id="$1"
  local agent_slug="$2"
  local agent_dir="$SCRIPT_DIR/agents/$agent_slug"

  # Set managed mode
  curl -sf "$API/agents/$agent_id/instructions-bundle" \
    -X PATCH -H 'Content-Type: application/json' \
    -d '{"mode": "managed", "entryFile": "AGENTS.md"}'

  # Upload AGENTS.md (clear legacy)
  local agents_content
  agents_content=$(jq -Rs '.' < "$agent_dir/AGENTS.md")
  curl -sf "$API/agents/$agent_id/instructions-bundle/file" \
    -X PUT -H 'Content-Type: application/json' \
    -d "{\"path\": \"AGENTS.md\", \"content\": $agents_content, \"clearLegacyPromptTemplate\": true}"

  # Upload HEARTBEAT.md
  local heartbeat_content
  heartbeat_content=$(jq -Rs '.' < "$agent_dir/HEARTBEAT.md")
  curl -sf "$API/agents/$agent_id/instructions-bundle/file" \
    -X PUT -H 'Content-Type: application/json' \
    -d "{\"path\": \"HEARTBEAT.md\", \"content\": $heartbeat_content}"

  # Upload SOUL.md
  local soul_content
  soul_content=$(jq -Rs '.' < "$agent_dir/SOUL.md")
  curl -sf "$API/agents/$agent_id/instructions-bundle/file" \
    -X PUT -H 'Content-Type: application/json' \
    -d "{\"path\": \"SOUL.md\", \"content\": $soul_content}"

  # Upload TOOLS.md if it exists
  if [ -f "$agent_dir/TOOLS.md" ]; then
    local tools_content
    tools_content=$(jq -Rs '.' < "$agent_dir/TOOLS.md")
    curl -sf "$API/agents/$agent_id/instructions-bundle/file" \
      -X PUT -H 'Content-Type: application/json' \
      -d "{\"path\": \"TOOLS.md\", \"content\": $tools_content}"
  fi

  echo "  $agent_slug: bundle uploaded"
}

upload_bundle "$CEO_ID" "ceo"
# {Repeat for each agent}

# --- 6. Deploy Per-Agent Runtime Config ---
echo "[6/7] Note: Deploy runtime config to agent workspaces:"
echo "  agents/{slug}/runtime/settings.json -> <workspace>/.claude/settings.json"
echo "  agents/{slug}/runtime/mcp.json      -> <workspace>/.mcp.json"
echo "  agents/{slug}/runtime/agents/*.md    -> <workspace>/.claude/agents/*.md"

# --- 7. Create Initial Tasks ---
echo "[7/7] Creating initial tasks..."

# {Create each task assigned to CEO}

echo ""
echo "=== {CompanyName} setup complete! ==="
echo ""
echo "Company ID:  $COMPANY_ID"
echo "Goal ID:     $GOAL_ID"
echo "CEO ID:      $CEO_ID"
# {Print all agent IDs}
echo ""
echo "Next steps:"
echo "  1. Deploy per-agent runtime config to the Paperclip container"
echo "  2. Enable heartbeats for all agents (start with CEO)"
echo "  3. Approve the CEO's strategy in the Paperclip UI"
echo "  4. Run /company-analyze periodically to check company health"
```

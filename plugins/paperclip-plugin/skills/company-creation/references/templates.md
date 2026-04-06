# Company Blueprint Templates

Ready-to-customize templates for every file in a Paperclip company blueprint. Replace all `{placeholders}` with actual values.

---

## README.md (Top-Level Setup Guide)

```markdown
# {CompanyName} -- Company Blueprint for Paperclip

This directory contains the complete blueprint for creating and running the **{CompanyName}** autonomous AI company on the Paperclip platform.

---

## Directory Structure

{tree diagram matching the actual generated structure}

---

## How to Use This Blueprint

### Step 1: Understand the Business
Read `company.md` for the full business description.

### Step 2: Set Up Global Claude Code Configuration
The files in `claude/` are mounted into the Paperclip Docker container:
- `claude/settings.json` -- global tool permissions for ALL agents
- `claude/plugins.json` -- marketplace installation

### Step 3: Run the Setup Script
```bash
export PAPERCLIP_API_URL=http://localhost:3100
chmod +x setup.sh
./setup.sh
```

The script will:
1. Create the company
2. Set the budget
3. Create the company goal
4. Create all agents in hierarchy order
5. Upload instruction bundles
6. Create initial tasks

### Step 4: Deploy Per-Agent Settings
Copy agent settings into the Paperclip container:
```
org/agents/{AgentName}/settings.json -> /paperclip/instances/default/workspaces/{agentId}/.claude/settings.json
org/agents/{AgentName}/mcp.json -> /paperclip/instances/default/workspaces/{agentId}/.mcp.json
```

### Step 5: Enable Heartbeats and Launch
1. Enable heartbeats for all agents, starting with the CEO
2. CEO wakes up, reviews goals/tasks, submits strategy for board approval
3. Approve the strategy in the Paperclip UI
4. CEO delegates work down the org tree

---

## Per-Agent Plugin and MCP Assignment

| Agent | Plugins | MCP Permissions |
|-------|---------|----------------|
{agent-plugin-table}

---

## Paperclip API Reference

Base URL: `$PAPERCLIP_API_URL/api`

Key endpoints:
- `POST /api/companies` -- create company
- `PATCH /api/companies/{id}` -- set budget
- `POST /api/companies/{id}/goals` -- create goal
- `POST /api/companies/{id}/agents` -- create agent
- `PATCH /api/agents/{id}/instructions-bundle` -- set bundle mode
- `PUT /api/agents/{id}/instructions-bundle/file` -- upload instruction file
- `POST /api/companies/{id}/issues` -- create task
```

---

## org/company.md (Paperclip Company Record)

```markdown
# {CompanyName} -- Company Registration

## Paperclip Company Record

| Field | Value |
|-------|-------|
| **Company ID** | `{to be filled by setup.sh}` |
| **Name** | {CompanyName} |
| **Status** | active |
| **Budget** | {totalBudgetCents} cents/month (${totalBudgetDollars}) |
| **Issue Prefix** | {PREFIX} |

## Description

{2-3 sentence business description}

## Product Lines

{List of product/service lines with brief descriptions}

## Full Business Description

See [../company.md](../company.md) for the comprehensive business document.
```

---

## org/goals.md (Company Goal)

```markdown
# {CompanyName} -- Goals

## Company Goal

| Field | Value |
|-------|-------|
| **Goal ID** | `{to be filled by setup.sh}` |
| **Title** | {Goal title -- action-oriented, measurable} |
| **Level** | company |
| **Status** | active |

**Description:**
{Detailed goal description with specific deliverables and timeline}

## Success Criteria

- [ ] {Measurable criterion 1}
- [ ] {Measurable criterion 2}
- [ ] {Measurable criterion 3}
- [ ] {Measurable criterion 4}
- [ ] {Measurable criterion 5}
```

---

## org/org-structure.md (Org Chart)

```markdown
# {CompanyName} -- Org Structure

## Org Chart

\`\`\`
Board Operator (Human)
  |
  CEO
  |
  +-- CTO
  |    +-- {Engineers...}
  |
  +-- {Other managers...}
\`\`\`

## Agent Registry

| Agent | ID | Role | Reports To | Budget ($/mo) | Adapter |
|-------|----|------|-----------|---------------|---------|
| CEO | `{auto}` | ceo | -- | ${budget} | claude_local |
{additional rows}

**Total budget: ${total}/month**

## Delegation Flow

\`\`\`
Board sets goal
  -> CEO creates strategy (requires board approval)
    -> CEO delegates to direct reports
      -> Managers delegate to their ICs
\`\`\`

## Future Hires

| Agent | Role | Reports To | Trigger |
|-------|------|-----------|---------|
{future hire suggestions}
```

---

## org/tasks.md (Initial Task Backlog)

```markdown
# {CompanyName} -- Task Backlog

## Initial Tasks (assigned to CEO for delegation)

### 1. {Strategic task title}
- **Priority:** critical
- **Status:** todo
- **Assignee:** CEO
- **Goal:** {goalId}

{Task description with expected subtasks and delegation path}

---

### 2. {Next task...}
{repeat for 5-10 tasks}

---

## Expected Task Hierarchy (after CEO delegation)

\`\`\`
Company Goal: {goal title}
|
+-- {Task 1} (CEO)
|   +-- {Subtask} (CEO -> {Manager})
|       +-- {Sub-subtask} ({Manager} -> {IC})
|
+-- {Task 2} (CEO -> {Manager})
{etc.}
\`\`\`
```

---

## claude/plugins.json (Global Marketplace)

```json
{
  "marketplaces": [
    {
      "source": "lukaskellerstein/claude-my-marketplace",
      "scope": "user"
    }
  ]
}
```

---

## setup.sh (API Setup Script Template)

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
  local agent_name="$2"
  local agent_dir="$SCRIPT_DIR/org/agents/$agent_name"

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

  echo "  $agent_name: bundle uploaded"
}

upload_bundle "$CEO_ID" "CEO"
# {Repeat for each agent}

# --- 6. Deploy Per-Agent Settings ---
echo "[6/7] Note: Deploy settings.json and mcp.json manually:"
echo "  Copy org/agents/{AgentName}/settings.json -> container .claude/settings.json"
echo "  Copy org/agents/{AgentName}/mcp.json -> container .mcp.json"

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
echo "  1. Deploy per-agent settings.json and mcp.json to the Paperclip container"
echo "  2. Enable heartbeats for all agents (start with CEO)"
echo "  3. Approve the CEO's strategy in the Paperclip UI"
```

---

## Agent File Templates

**IMPORTANT:** Read `role-plugin-matrix.md` in the agent-design skill references for complete per-role examples.

### settings.json (with MCP-providing plugins)

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

### settings.json (no MCP-providing plugins)

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
- NEVER put `mcpServers` inside settings.json — that goes in `mcp.json`

### mcp.json (empty — most agents)

```json
{
  "mcpServers": {}
}
```

### mcp.json (with Chrome — frontend/QA agents)

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

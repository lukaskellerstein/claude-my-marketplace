#!/usr/bin/env bash
# =============================================================================
# Pre-Generation Script for Paperclip Company Packages
# =============================================================================
# Scaffolds the deterministic parts of a company package before the AI agent
# writes creative content. Run this after the discovery/org-design phases
# (Phases 1-4) and before file generation (Phase 5).
#
# Usage:
#   bash pre-generate.sh <company-root> <config-json-path>
#
# The config JSON is produced by the AI agent and contains:
#   - companySlug, companyName
#   - gwsDomain, gwsCredentialsFile (optional, for GWS companies)
#   - agents[] with slug, role, reportsTo, email, plugins[], chromeMcp
#
# What this script creates:
#   - Full directory skeleton (agents/, projects/, tasks/, skills/, global/, scripts/)
#   - GWS skills (imported from googleworkspace/cli repo) if any agent is GWS-eligible
#   - global/settings.json (deny rules)
#   - global/plugins.json (union of all agent plugins)
#   - Per-agent runtime/settings.json (enabledPlugins, permissions, env)
#   - Per-agent runtime/mcp.json (Chrome DevTools if needed, else empty)
#   - scripts/setup-secrets.sh (customized from template)
# =============================================================================

set -euo pipefail

# ---- Resolve paths ----
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---- Check dependencies ----
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not found. Install with: apt install jq / brew install jq"
  exit 1
fi

# ---- Parse arguments ----
if [ -z "${1:-}" ] || [ -z "${2:-}" ]; then
  echo "Usage: $0 <company-root> <config-json-path>"
  exit 1
fi

COMPANY_ROOT="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
CONFIG_PATH="$2"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "ERROR: Config file not found: $CONFIG_PATH"
  exit 1
fi

# ---- Validate config JSON ----
if ! jq empty "$CONFIG_PATH" 2>/dev/null; then
  echo "ERROR: Invalid JSON in config file: $CONFIG_PATH"
  exit 1
fi

COMPANY_SLUG=$(jq -r '.companySlug // empty' "$CONFIG_PATH")
COMPANY_NAME=$(jq -r '.companyName // empty' "$CONFIG_PATH")
GWS_DOMAIN=$(jq -r '.gwsDomain // empty' "$CONFIG_PATH")
GWS_CREDENTIALS_FILE=$(jq -r '.gwsCredentialsFile // empty' "$CONFIG_PATH")
AGENT_COUNT=$(jq '.agents | length' "$CONFIG_PATH")

if [ -z "$COMPANY_SLUG" ]; then
  echo "ERROR: companySlug is required in config"
  exit 1
fi
if [ -z "$COMPANY_NAME" ]; then
  echo "ERROR: companyName is required in config"
  exit 1
fi
if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "ERROR: at least one agent is required in config"
  exit 1
fi

echo "[pre-generate] Company: $COMPANY_NAME ($COMPANY_SLUG)"
echo "[pre-generate] Agents: $AGENT_COUNT"

# =============================================================================
# Lookup Tables (from role-plugin-matrix.md)
# =============================================================================

# Plugin -> MCP permissions
declare -A PLUGIN_MCP_PERMS
PLUGIN_MCP_PERMS[media]="mcp__plugin_media-plugin_mermaid mcp__plugin_media-plugin_media-playwright mcp__plugin_media-plugin_media-mcp mcp__plugin_media-plugin_ElevenLabs"
PLUGIN_MCP_PERMS[web-design]="mcp__plugin_web-design-plugin_webdesign-playwright"
PLUGIN_MCP_PERMS[company]="mcp__plugin_company-plugin_dhl-api-assistant mcp__plugin_company-plugin_stripe"

# Plugin dependencies: web-design requires design, media, office; design requires media, office
declare -A PLUGIN_DEPS
PLUGIN_DEPS[web-design]="design media office"
PLUGIN_DEPS[design]="media office"

# =============================================================================
# Helper Functions
# =============================================================================

is_gws_eligible() {
  # Match both abbreviations (CEO, CMO) and full titles (Chief Executive Officer)
  local role_normalized
  role_normalized=$(echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[-_ ]//g')
  case "$role_normalized" in
    ceo|chiefexecutiveofficer) return 0 ;;
    cmo|chiefmarketingofficer) return 0 ;;
    coo|chiefoperatingofficer) return 0 ;;
    headofoperations) return 0 ;;
    contentcreator) return 0 ;;
    marketingspecialist) return 0 ;;
    productmanager) return 0 ;;
    customersupport) return 0 ;;
    *) return 1 ;;
  esac
}

expand_plugins() {
  # Given a space-separated list of plugins, expand dependencies
  local plugins="$1"
  local expanded="$plugins"
  local changed=true

  while $changed; do
    changed=false
    for plugin in $expanded; do
      if [ -n "${PLUGIN_DEPS[$plugin]:-}" ]; then
        for dep in ${PLUGIN_DEPS[$plugin]}; do
          if ! echo " $expanded " | grep -q " $dep "; then
            expanded="$expanded $dep"
            changed=true
          fi
        done
      fi
    done
  done

  # Deduplicate and sort
  echo "$expanded" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

# =============================================================================
# Step 1: Create directory skeleton
# =============================================================================

echo "[pre-generate] Creating directory skeleton..."
mkdir -p "$COMPANY_ROOT"/{projects,tasks,skills,scripts,global}

for i in $(seq 0 $((AGENT_COUNT - 1))); do
  slug=$(jq -r ".agents[$i].slug" "$CONFIG_PATH")
  mkdir -p "$COMPANY_ROOT/agents/$slug/runtime/agents"
done

# =============================================================================
# Step 2: Import GWS skills if needed
# =============================================================================

HAS_GWS_AGENTS=false
for i in $(seq 0 $((AGENT_COUNT - 1))); do
  role=$(jq -r ".agents[$i].role" "$CONFIG_PATH")
  if is_gws_eligible "$role"; then
    HAS_GWS_AGENTS=true
    break
  fi
done

if $HAS_GWS_AGENTS && [ -n "$GWS_DOMAIN" ]; then
  IMPORT_SCRIPT="$SCRIPT_DIR/import-gws-skills.sh"
  if [ -f "$IMPORT_SCRIPT" ]; then
    echo "[pre-generate] Importing GWS skills..."
    if bash "$IMPORT_SCRIPT" "$COMPANY_ROOT"; then
      echo "[pre-generate] GWS skills imported successfully"
    else
      echo "WARN: GWS skill import failed (network issue?). Post-generate will catch missing skills."
    fi
  else
    echo "WARN: GWS import script not found at $IMPORT_SCRIPT"
  fi
elif $HAS_GWS_AGENTS && [ -z "$GWS_DOMAIN" ]; then
  echo "WARN: GWS-eligible agents found but gwsDomain is not set. Skipping GWS import."
else
  echo "[pre-generate] No GWS-eligible agents, skipping GWS import"
fi

# =============================================================================
# Step 3: Generate global/settings.json
# =============================================================================

echo "[pre-generate] Writing global/settings.json..."
cat > "$COMPANY_ROOT/global/settings.json" << 'GLOBAL_SETTINGS'
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
GLOBAL_SETTINGS

# =============================================================================
# Step 4: Generate global/plugins.json
# =============================================================================

echo "[pre-generate] Writing global/plugins.json..."

# Collect all plugins across all agents and expand dependencies
ALL_PLUGINS=""
for i in $(seq 0 $((AGENT_COUNT - 1))); do
  agent_plugins=$(jq -r ".agents[$i].plugins[]?" "$CONFIG_PATH" | tr '\n' ' ')
  ALL_PLUGINS="$ALL_PLUGINS $agent_plugins"
done

ALL_PLUGINS=$(expand_plugins "$ALL_PLUGINS")

# Build the plugins JSON array
PLUGINS_JSON="["
first=true
for plugin in $ALL_PLUGINS; do
  if $first; then
    first=false
  else
    PLUGINS_JSON="$PLUGINS_JSON,"
  fi
  PLUGINS_JSON="$PLUGINS_JSON
    {\"name\": \"${plugin}-plugin@claude-my-marketplace\", \"scope\": \"user\"}"
done
PLUGINS_JSON="$PLUGINS_JSON
  ]"

cat > "$COMPANY_ROOT/global/plugins.json" << PLUGINS_EOF
{
  "marketplaces": [
    {"source": "lukaskellerstein/claude-my-marketplace", "scope": "user"}
  ],
  "plugins": $PLUGINS_JSON
}
PLUGINS_EOF

# Pretty-print with jq
jq '.' "$COMPANY_ROOT/global/plugins.json" > "$COMPANY_ROOT/global/plugins.json.tmp" && \
  mv "$COMPANY_ROOT/global/plugins.json.tmp" "$COMPANY_ROOT/global/plugins.json"

# =============================================================================
# Step 5: Generate per-agent runtime/settings.json
# =============================================================================

echo "[pre-generate] Writing per-agent runtime configs..."

for i in $(seq 0 $((AGENT_COUNT - 1))); do
  slug=$(jq -r ".agents[$i].slug" "$CONFIG_PATH")
  role=$(jq -r ".agents[$i].role" "$CONFIG_PATH")
  email=$(jq -r ".agents[$i].email // empty" "$CONFIG_PATH")
  chrome_mcp=$(jq -r ".agents[$i].chromeMcp // false" "$CONFIG_PATH")
  agent_plugins=$(jq -r ".agents[$i].plugins[]?" "$CONFIG_PATH" | tr '\n' ' ')

  # Expand plugin dependencies for this agent
  agent_plugins=$(expand_plugins "$agent_plugins")

  # Build enabledPlugins object
  ENABLED_PLUGINS="{"
  ep_first=true
  for plugin in $agent_plugins; do
    if $ep_first; then ep_first=false; else ENABLED_PLUGINS="$ENABLED_PLUGINS,"; fi
    ENABLED_PLUGINS="$ENABLED_PLUGINS
      \"${plugin}-plugin@claude-my-marketplace\": true"
  done
  ENABLED_PLUGINS="$ENABLED_PLUGINS
    }"

  # Build permissions.allow array
  PERMS_ITEMS=""
  for plugin in $agent_plugins; do
    if [ -n "${PLUGIN_MCP_PERMS[$plugin]:-}" ]; then
      for perm in ${PLUGIN_MCP_PERMS[$plugin]}; do
        if [ -n "$PERMS_ITEMS" ]; then PERMS_ITEMS="$PERMS_ITEMS,"; fi
        PERMS_ITEMS="$PERMS_ITEMS
        \"$perm\""
      done
    fi
  done
  if [ "$chrome_mcp" = "true" ]; then
    if [ -n "$PERMS_ITEMS" ]; then PERMS_ITEMS="$PERMS_ITEMS,"; fi
    PERMS_ITEMS="$PERMS_ITEMS
        \"mcp__chrome-devtools\""
  fi

  # Build env object for GWS-eligible agents
  ENV_SECTION=""
  if is_gws_eligible "$role" && [ -n "$GWS_DOMAIN" ]; then
    agent_email="${email:-${slug}@${GWS_DOMAIN}}"
    ENV_SECTION=",
    \"env\": {
      \"AGENT_EMAIL\": \"$agent_email\",
      \"COMPANY_DOMAIN\": \"$GWS_DOMAIN\",
      \"GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE\": \"$GWS_CREDENTIALS_FILE\"
    }"
  fi

  # Assemble the full settings.json
  if [ -n "$PERMS_ITEMS" ]; then
    SETTINGS_JSON="{
    \"enabledPlugins\": $ENABLED_PLUGINS,
    \"permissions\": {
      \"allow\": [$PERMS_ITEMS
      ]
    }$ENV_SECTION
  }"
  else
    SETTINGS_JSON="{
    \"enabledPlugins\": $ENABLED_PLUGINS$ENV_SECTION
  }"
  fi

  echo "$SETTINGS_JSON" | jq '.' > "$COMPANY_ROOT/agents/$slug/runtime/settings.json"
  echo "  $slug: $(echo "$agent_plugins" | wc -w | tr -d ' ') plugins$(is_gws_eligible "$role" && [ -n "$GWS_DOMAIN" ] && echo " + GWS" || true)"

  # ---- runtime/mcp.json ----
  if [ "$chrome_mcp" = "true" ]; then
    cat > "$COMPANY_ROOT/agents/$slug/runtime/mcp.json" << 'CHROME_MCP'
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
CHROME_MCP
  else
    echo '{"mcpServers": {}}' | jq '.' > "$COMPANY_ROOT/agents/$slug/runtime/mcp.json"
  fi
done

# =============================================================================
# Step 6: Generate AGENTS.md frontmatter skeletons
# =============================================================================

echo "[pre-generate] Writing AGENTS.md frontmatter skeletons..."

for i in $(seq 0 $((AGENT_COUNT - 1))); do
  slug=$(jq -r ".agents[$i].slug" "$CONFIG_PATH")
  role=$(jq -r ".agents[$i].role" "$CONFIG_PATH")
  reports_to=$(jq -r ".agents[$i].reportsTo // \"null\"" "$CONFIG_PATH")

  # Collect custom skills (supports both string entries and {name, description} objects)
  custom_skills=$(jq -r ".agents[$i].skills[]? | if type == \"object\" then .name else . end // empty" "$CONFIG_PATH" 2>/dev/null)

  # Collect GWS skills
  gws_skills=$(jq -r ".agents[$i].gwsSkills[]? // empty" "$CONFIG_PATH" 2>/dev/null)

  # Build the skills YAML list (custom + GWS merged)
  SKILLS_YAML=""
  for skill in $custom_skills; do
    SKILLS_YAML="$SKILLS_YAML
  - $skill"
  done
  for skill in $gws_skills; do
    SKILLS_YAML="$SKILLS_YAML
  - $skill"
  done

  # Derive name from slug (capitalize, replace hyphens)
  agent_name=$(jq -r ".agents[$i].name // empty" "$CONFIG_PATH" 2>/dev/null)
  if [ -z "$agent_name" ]; then
    agent_name="$role"
  fi

  # Write the AGENTS.md frontmatter skeleton
  agents_md="$COMPANY_ROOT/agents/$slug/AGENTS.md"
  cat > "$agents_md" << AGENTS_EOF
---
name: $agent_name
title: $role
reportsTo: $reports_to
skills:$SKILLS_YAML
---

AGENTS_EOF

  skill_count=0
  [ -n "$custom_skills" ] && skill_count=$(echo "$custom_skills" | wc -w | tr -d ' ')
  gws_skill_count=0
  [ -n "$gws_skills" ] && gws_skill_count=$(echo "$gws_skills" | wc -w | tr -d ' ')
  echo "  $slug: $skill_count custom + $gws_skill_count GWS skills in frontmatter"
done

# =============================================================================
# Step 7: Copy and customize scripts/setup-secrets.sh
# =============================================================================

TEMPLATE="$PLUGIN_ROOT/scripts/setup-secrets-template.sh"
TARGET="$COMPANY_ROOT/scripts/setup-secrets.sh"

if [ -f "$TEMPLATE" ]; then
  echo "[pre-generate] Writing scripts/setup-secrets.sh..."
  cp "$TEMPLATE" "$TARGET"

  # Remove secret sections for plugins no agent uses
  has_plugin() {
    echo " $ALL_PLUGINS " | grep -q " $1 "
  }

  if ! has_plugin "media"; then
    # Remove GEMINI and ELEVENLABS lines
    sed -i '/GEMINI_API_KEY/d' "$TARGET"
    sed -i '/ELEVENLABS_API_KEY/d' "$TARGET"
    sed -i '/# AI \/ Media/d' "$TARGET"
  fi

  if ! has_plugin "company"; then
    # Remove STRIPE lines
    sed -i '/STRIPE_SECRET_KEY/d' "$TARGET"
    sed -i '/STRIPE_WEBHOOK_SECRET/d' "$TARGET"
    sed -i '/# Payments/d' "$TARGET"
  fi
else
  echo "WARN: Setup secrets template not found at $TEMPLATE"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "[pre-generate] Done. Created scaffold for $COMPANY_NAME with $AGENT_COUNT agents."
echo "[pre-generate] Global plugins: $ALL_PLUGINS"
if $HAS_GWS_AGENTS && [ -n "$GWS_DOMAIN" ]; then
  gws_count=$(ls -d "$COMPANY_ROOT/skills/gws-"* "$COMPANY_ROOT/skills/persona-"* "$COMPANY_ROOT/skills/recipe-"* 2>/dev/null | wc -l | tr -d ' ')
  echo "[pre-generate] GWS skills imported: $gws_count"
fi
echo ""
echo "[pre-generate] The AI agent should now write:"
echo "  - COMPANY.md"
echo "  - agents/*/AGENTS.md body (append below the frontmatter --- marker)"
echo "  - agents/*/SOUL.md, HEARTBEAT.md, TOOLS.md"
echo "  - agents/*/runtime/agents/*.md (custom subagents from design briefs)"
echo "  - projects/*/PROJECT.md and tasks"
echo "  - Custom SKILL.md files in skills/"
echo "  - .paperclip.yaml, README.md, LICENSE"
echo ""
echo "[pre-generate] Do NOT overwrite files this script created:"
echo "  - agents/*/AGENTS.md frontmatter (skills are already set)"
echo "  - agents/*/runtime/settings.json, runtime/mcp.json"
echo "  - global/settings.json, global/plugins.json"
echo "  - scripts/setup-secrets.sh"

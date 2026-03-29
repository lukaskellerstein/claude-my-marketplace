#!/usr/bin/env bash
# PostToolUse hook: tracks web-design execution statistics.
# Only active when a stats file exists (created by init-stats.sh).
# Reads tool JSON from stdin and appends to the stats log.

set -euo pipefail

STATS_DIR="/tmp/web-design-stats"
STATS_LOG="${STATS_DIR}/events.log"

# Only track if stats session is active
[ ! -f "${STATS_DIR}/active" ] && exit 0

# Read tool info from stdin
TOOL_JSON=$(cat)

TOOL_NAME=$(echo "$TOOL_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")

[ -z "$TOOL_NAME" ] && exit 0

TIMESTAMP=$(date +%s)

# Track Agent tool calls
if [ "$TOOL_NAME" = "Agent" ]; then
  AGENT_DESC=$(echo "$TOOL_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('description','unknown'))" 2>/dev/null || echo "unknown")
  AGENT_TYPE=$(echo "$TOOL_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('subagent_type','general'))" 2>/dev/null || echo "general")
  echo "AGENT|${TIMESTAMP}|${AGENT_DESC}|${AGENT_TYPE}" >> "$STATS_LOG"
fi

# Track image generation (MCP tools)
case "$TOOL_NAME" in
  *generate_image*)
    echo "IMAGE|${TIMESTAMP}|generated" >> "$STATS_LOG"
    ;;
  *image_sourcing*|*search_photos*|*unsplash*|*pexels*|*pixabay*)
    echo "IMAGE|${TIMESTAMP}|sourced" >> "$STATS_LOG"
    ;;
  *generate_video*)
    echo "VIDEO|${TIMESTAMP}" >> "$STATS_LOG"
    ;;
  *generate_music*|*text_to_speech*)
    echo "AUDIO|${TIMESTAMP}" >> "$STATS_LOG"
    ;;
  *generate_image*|*icon*)
    # icon fetches via curl won't hit MCP, but just in case
    echo "ICON|${TIMESTAMP}" >> "$STATS_LOG"
    ;;
esac

# Track Bash calls for npm/vite (build steps)
if [ "$TOOL_NAME" = "Bash" ]; then
  CMD=$(echo "$TOOL_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
  case "$CMD" in
    *"npm create vite"*|*"npm init"*)
      echo "BUILD|${TIMESTAMP}|project-init" >> "$STATS_LOG"
      ;;
    *"npm install"*|*"npm i "*)
      echo "BUILD|${TIMESTAMP}|deps-install" >> "$STATS_LOG"
      ;;
    *"npm run dev"*|*"npx vite"*)
      echo "BUILD|${TIMESTAMP}|dev-server" >> "$STATS_LOG"
      ;;
  esac
fi

# Track file writes (component creation)
if [ "$TOOL_NAME" = "Write" ]; then
  FILE_PATH=$(echo "$TOOL_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")
  case "$FILE_PATH" in
    *"/src/pages/"*.tsx)
      echo "PAGE|${TIMESTAMP}|${FILE_PATH}" >> "$STATS_LOG"
      ;;
    *"/src/components/"*.tsx)
      echo "COMPONENT|${TIMESTAMP}|${FILE_PATH}" >> "$STATS_LOG"
      ;;
    *"/docs/"*.md)
      echo "DOC|${TIMESTAMP}|${FILE_PATH}" >> "$STATS_LOG"
      ;;
  esac
fi

exit 0

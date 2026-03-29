#!/usr/bin/env bash
# Initialize web-design statistics tracking.
# Only activates when the /web-design command is invoked.
# Fires on every UserPromptSubmit but exits early for non-web-design prompts.

set -euo pipefail

DEBUG_LOG="/tmp/web-design-hooks-debug.log"

# Read hook input from stdin
HOOK_JSON=$(cat)

# Check if this is a /web-design invocation
PROMPT=$(echo "$HOOK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('prompt',''))" 2>/dev/null || echo "")

echo "[$(date)] init-stats.sh fired, prompt=${PROMPT:0:80}" >> "$DEBUG_LOG"

# Only activate for /web-design or /hook-test commands
case "$PROMPT" in
  *"web-design-plugin:web-design"*|*"web-design-plugin:hook-test"*)
    ;;
  *)
    exit 0
    ;;
esac

STATS_DIR="/tmp/web-design-stats"

# Clean previous run
rm -rf "$STATS_DIR"
mkdir -p "$STATS_DIR"

# Create screenshot directory
rm -rf /tmp/web-design-screenshots
mkdir -p /tmp/web-design-screenshots

# Mark session as active
date +%s > "${STATS_DIR}/start_time"
touch "${STATS_DIR}/active"
touch "${STATS_DIR}/events.log"

echo "[$(date)] Stats tracking initialized for /web-design" >> "$DEBUG_LOG"

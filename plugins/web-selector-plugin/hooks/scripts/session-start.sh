#!/usr/bin/env bash
# SessionStart hook: launch the bridge server (if needed) and register this session.
# Reads session JSON from stdin: { "session_id": "...", "cwd": "...", "model": "..." }

set -euo pipefail

BRIDGE_PORT="${CLAUDE_SELECTOR_PORT:-3456}"
BRIDGE_URL="http://localhost:${BRIDGE_PORT}"
SERVER_SCRIPT="${CLAUDE_PLUGIN_ROOT}/bridge-server/server.js"

# Read session info from stdin
SESSION_JSON=$(cat)
SESSION_ID=$(echo "$SESSION_JSON" | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\(.*\)"/\1/')
SESSION_CWD=$(echo "$SESSION_JSON" | grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\(.*\)"/\1/')
SESSION_MODEL=$(echo "$SESSION_JSON" | grep -o '"model"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\(.*\)"/\1/')
SESSION_PID=$$

# Check if bridge is alive
bridge_alive() {
  curl -sf "${BRIDGE_URL}/health" >/dev/null 2>&1
}

# Start bridge if not running
if ! bridge_alive; then
  CLAUDE_SELECTOR_PORT="${BRIDGE_PORT}" nohup node "$SERVER_SCRIPT" >/dev/null 2>&1 &
  disown

  # Wait up to 3 seconds for bridge to come up
  for i in 1 2 3 4 5 6; do
    sleep 0.5
    if bridge_alive; then
      break
    fi
  done

  if ! bridge_alive; then
    echo '{"error": "Failed to start bridge server"}' >&2
    exit 1
  fi
fi

# Register this session
curl -sf -X POST "${BRIDGE_URL}/session/register" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"${SESSION_ID}\",\"pid\":${SESSION_PID},\"cwd\":\"${SESSION_CWD}\",\"model\":\"${SESSION_MODEL}\"}" \
  >/dev/null 2>&1 || true

# Output context for Claude
cat <<EOF
{"additionalContext":"Claude Selector bridge server is running on ${BRIDGE_URL}. Use /claude-selector:select to process element selections from the Chrome extension."}
EOF

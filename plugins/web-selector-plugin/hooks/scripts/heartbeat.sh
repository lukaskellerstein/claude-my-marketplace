#!/usr/bin/env bash
# PostToolUse hook (async): send heartbeat to keep the session alive.
# Reads session JSON from stdin.

set -uo pipefail

BRIDGE_PORT="${CLAUDE_SELECTOR_PORT:-3456}"
BRIDGE_URL="http://localhost:${BRIDGE_PORT}"

# Read session info from stdin
SESSION_JSON=$(cat)
SESSION_ID=$(echo "$SESSION_JSON" | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\(.*\)"/\1/')

# Send heartbeat — silently ignore failures
curl -sf -X POST "${BRIDGE_URL}/session/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"${SESSION_ID}\"}" \
  >/dev/null 2>&1 || true

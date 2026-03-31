#!/usr/bin/env bash
# Print web-design execution statistics via Stop hook.
# Outputs a blocking JSON response so Claude prints the stats table.
# On second Stop (after active marker removed), allows normal stop.

set -eo pipefail

STATS_DIR="/tmp/web-design-stats"
STATS_LOG="${STATS_DIR}/events.log"
DEBUG_LOG="/tmp/web-design-hooks-debug.log"

# Helper: count matching lines in stats log (returns 0 if none)
count_events() {
  local pattern="$1"
  local n
  n=$(grep -c "$pattern" "$STATS_LOG" 2>/dev/null) || true
  echo "${n:-0}"
}

# Debug: log every invocation
ACTIVE_STATUS="no"
[ -f "${STATS_DIR}/active" ] && ACTIVE_STATUS="yes"
PAGE_COUNT_EARLY=$(count_events "^PAGE|")
echo "[$(date)] print-stats.sh fired, active=$ACTIVE_STATUS, PAGE_COUNT=$PAGE_COUNT_EARLY" >> "$DEBUG_LOG"

# Exit silently if no active stats session — allows Claude to stop
[ ! -f "${STATS_DIR}/active" ] && exit 0
[ ! -f "${STATS_DIR}/start_time" ] && exit 0

# Only print when pages have been built (implementation is done)
PAGE_COUNT=$(count_events "^PAGE|")
[ "$PAGE_COUNT" -eq 0 ] && exit 0

START_TIME=$(cat "${STATS_DIR}/start_time")
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINS=$((DURATION / 60))
SECS=$((DURATION % 60))

# Count events from log
AGENT_COUNT=$(count_events "^AGENT|")
IMAGES_GENERATED=$(count_events "^IMAGE|.*|generated")
IMAGES_SOURCED=$(count_events "^IMAGE|.*|sourced")
IMAGES_TOTAL=$((IMAGES_GENERATED + IMAGES_SOURCED))
VIDEO_COUNT=$(count_events "^VIDEO|")
AUDIO_COUNT=$(count_events "^AUDIO|")
COMPONENT_COUNT=$(count_events "^COMPONENT|")
DOC_COUNT=$(count_events "^DOC|")

# Extract agent names for breakdown
AGENT_BREAKDOWN=""
if [ "$AGENT_COUNT" -gt 0 ]; then
  AGENT_BREAKDOWN=$(grep "^AGENT|" "$STATS_LOG" 2>/dev/null | cut -d'|' -f3 | sort | uniq -c | sort -rn | while read -r COUNT NAME; do
    echo "  - ${NAME}: x${COUNT}"
  done)
fi

# Build the stats summary
STATS_TEXT="## /web-design Statistics

| Metric | Value |
|---|---|
| Total Time | ${MINS}m ${SECS}s |
| Agents spawned | ${AGENT_COUNT} |
| Pages built | ${PAGE_COUNT} |
| Components created | ${COMPONENT_COUNT} |
| Design docs | ${DOC_COUNT} |
| Images (total) | ${IMAGES_TOTAL} |
| — AI generated | ${IMAGES_GENERATED} |
| — Stock sourced | ${IMAGES_SOURCED} |
| Videos | ${VIDEO_COUNT} |
| Audio | ${AUDIO_COUNT} |"

if [ -n "$AGENT_BREAKDOWN" ]; then
  STATS_TEXT="${STATS_TEXT}

### Agent breakdown
${AGENT_BREAKDOWN}"
fi

# Deactivate BEFORE outputting — so next Stop allows normal exit
rm -f "${STATS_DIR}/active"

echo "[$(date)] print-stats.sh blocking with stats table" >> "$DEBUG_LOG"

# Output blocking JSON — Claude sees the reason and prints the stats
# Using python to safely JSON-encode the multiline string
python3 -c "
import json, sys
stats = sys.stdin.read()
print(json.dumps({
    'decision': 'block',
    'reason': 'Before finishing, print this execution statistics table exactly as shown (do not modify it):\n\n' + stats
}))
" <<< "$STATS_TEXT"

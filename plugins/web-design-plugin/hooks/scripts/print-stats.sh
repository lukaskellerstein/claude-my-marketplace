#!/usr/bin/env bash
# Print web-design execution statistics as a formatted table.
# Called via Stop hook from hooks.json.
# Only prints when implementation is done (PAGE events exist in log),
# so checkpoint pauses during Phase 2/3 don't trigger output.

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

# Exit silently if no active stats session
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

# Extract agent names
AGENT_LIST=$(grep "^AGENT|" "$STATS_LOG" 2>/dev/null | cut -d'|' -f3 | sort | uniq -c | sort -rn || echo "")

# Print the table
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  /web-design Statistics                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
printf "║  %-20s  %35s  ║\n" "Total Time:" "${MINS}m ${SECS}s"
echo "║                                                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  AGENTS                                                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-20s  %35s  ║\n" "Agents spawned:" "$AGENT_COUNT"
if [ -n "$AGENT_LIST" ]; then
  echo "$AGENT_LIST" | while read -r COUNT NAME; do
    printf "║    %-18s  %35s  ║\n" "$NAME" "x${COUNT}"
  done
fi
echo "║                                                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  OUTPUT                                                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-20s  %35s  ║\n" "Pages built:" "$PAGE_COUNT"
printf "║  %-20s  %35s  ║\n" "Components created:" "$COMPONENT_COUNT"
printf "║  %-20s  %35s  ║\n" "Design docs:" "$DOC_COUNT"
echo "║                                                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  MEDIA                                                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-20s  %35s  ║\n" "Images (total):" "$IMAGES_TOTAL"
printf "║    %-18s  %35s  ║\n" "AI generated:" "$IMAGES_GENERATED"
printf "║    %-18s  %35s  ║\n" "Stock sourced:" "$IMAGES_SOURCED"
printf "║  %-20s  %35s  ║\n" "Videos:" "$VIDEO_COUNT"
printf "║  %-20s  %35s  ║\n" "Audio:" "$AUDIO_COUNT"
echo "║                                                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Deactivate tracking so subsequent Stop events don't re-print
rm -f "${STATS_DIR}/active"

#!/usr/bin/env bash
# Print web-design execution statistics as a formatted table.
# Called via Stop hook on /web-design command.
# Only prints when implementation is done (PAGE events exist in log),
# so checkpoint pauses during Phase 2/3 don't trigger output.

set -euo pipefail

STATS_DIR="/tmp/web-design-stats"
STATS_LOG="${STATS_DIR}/events.log"

# Exit silently if no active stats session
[ ! -f "${STATS_DIR}/active" ] && exit 0
[ ! -f "${STATS_DIR}/start_time" ] && exit 0

# Only print when pages have been built (implementation is done)
PAGE_COUNT=$(grep -c "^PAGE|" "$STATS_LOG" 2>/dev/null || echo "0")
[ "$PAGE_COUNT" -eq 0 ] && exit 0

START_TIME=$(cat "${STATS_DIR}/start_time")
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINS=$((DURATION / 60))
SECS=$((DURATION % 60))

# Count events from log
AGENT_COUNT=$(grep -c "^AGENT|" "$STATS_LOG" 2>/dev/null || echo "0")
IMAGES_GENERATED=$(grep -c "^IMAGE|.*|generated" "$STATS_LOG" 2>/dev/null || echo "0")
IMAGES_SOURCED=$(grep -c "^IMAGE|.*|sourced" "$STATS_LOG" 2>/dev/null || echo "0")
IMAGES_TOTAL=$((IMAGES_GENERATED + IMAGES_SOURCED))
VIDEO_COUNT=$(grep -c "^VIDEO|" "$STATS_LOG" 2>/dev/null || echo "0")
AUDIO_COUNT=$(grep -c "^AUDIO|" "$STATS_LOG" 2>/dev/null || echo "0")
COMPONENT_COUNT=$(grep -c "^COMPONENT|" "$STATS_LOG" 2>/dev/null || echo "0")
DOC_COUNT=$(grep -c "^DOC|" "$STATS_LOG" 2>/dev/null || echo "0")

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

#!/usr/bin/env bash
# Initialize web-design statistics tracking.
# Called by the orchestrator at the start of /web-design.

set -euo pipefail

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

echo "Stats tracking initialized."

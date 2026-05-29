#!/usr/bin/env bash
# PostToolUse hook: sanity-check + render reminder right after an .svg is written.
#
# Reads PostToolUse JSON from stdin. When tool=Write and file_path ends with
# .svg, runs `xmllint --noout` (well-formedness) and echoes a one-line reminder
# to stderr so it's fed back to Claude — enforcing svg-mastery HARD RULE 4
# (never ship an unrendered SVG).
#
# Non-fatal by design: it reports, it does not block. Safe for non-svg writes.
set -euo pipefail

input=$(cat)

tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""')
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

if [ "$tool_name" != "Write" ]; then exit 0; fi
if [ -z "$file_path" ]; then exit 0; fi

case "$file_path" in
	*.svg) ;;
	*) exit 0 ;;
esac

if [ ! -f "$file_path" ]; then exit 0; fi

HARNESS="${CLAUDE_PLUGIN_ROOT}/skills/svg-mastery/scripts/render-qa.mjs"

if command -v xmllint >/dev/null 2>&1; then
	if ! err=$(xmllint --noout "$file_path" 2>&1); then
		echo "svg-check: ✗ MALFORMED XML in $(basename "$file_path") — fix before rendering:" >&2
		printf '%s\n' "$err" >&2
		exit 0
	fi
fi

echo "svg-check: $(basename "$file_path") is well-formed. Per svg-mastery HARD RULE 4, render + score before shipping:" >&2
echo "  node \"$HARNESS\" \"$file_path\" --bg both   then Read the PNG and score it against validation-and-qa.md" >&2
exit 0

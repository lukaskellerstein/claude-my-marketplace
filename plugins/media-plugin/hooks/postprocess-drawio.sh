#!/usr/bin/env bash
# PostToolUse hook: auto-postprocess .drawio files right after they are written.
#
# Reads PostToolUse JSON from stdin. When tool=Write and file_path ends with
# .drawio, runs the local postprocessor in place and echoes a one-line summary
# to stderr so it's fed back to Claude.
#
# Safe for non-drawio writes: exits 0 immediately.
set -euo pipefail

input=$(cat)

tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""')
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

if [ "$tool_name" != "Write" ]; then exit 0; fi
if [ -z "$file_path" ]; then exit 0; fi

case "$file_path" in
	*.drawio) ;;
	*) exit 0 ;;
esac

if [ ! -f "$file_path" ]; then exit 0; fi

SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/postprocessor/postprocess.js"

if [ ! -f "$SCRIPT" ]; then
	echo "drawio-postprocess: script not found at $SCRIPT" >&2
	exit 0
fi

NODE_MODULES="${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/postprocessor/node_modules"

if [ ! -d "$NODE_MODULES" ]; then
	(cd "${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/postprocessor" && npm install --silent --no-audit --no-fund) >&2 || {
		echo "drawio-postprocess: npm install failed; skipping" >&2
		exit 0
	}
fi

report=$(node "$SCRIPT" "$file_path" "$file_path" 2>&1) || {
	echo "drawio-postprocess: failed on $file_path" >&2
	printf '%s\n' "$report" >&2
	exit 0
}

before=$(printf '%s\n' "$report" | awk '/^Before:/,/^$/' | grep -E "Intersections|Unnecessary waypoints" | tr '\n' ' ')
after=$(printf '%s\n' "$report" | awk '/^After:/,/^$/' | grep -E "Intersections|Unnecessary waypoints" | tr '\n' ' ')

echo "drawio-postprocess: $(basename "$file_path") | before: $before| after: $after" >&2
exit 0

#!/usr/bin/env bash
# Doctor + installer for everything the demo pipeline needs.
#
#   setup.sh            check only, print a report, change nothing (default)
#   setup.sh --install  install what is missing
#
# --install touches things outside the project (a Claude Code marketplace plugin, a
# Homebrew package, a Playwright browser download), so /demo-setup shows the user exactly
# what will run and asks first. The SessionStart preflight hook never installs anything.
set -uo pipefail

MODE=check
[[ "${1:-}" == "--install" ]] && MODE=install

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$HOME/.cache/demo-video-plugin"
MISSING=0
ACTIONS=()

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; MISSING=$((MISSING + 1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

echo "demo-video-plugin — environment check"
echo

# ── Core tooling ───────────────────────────────────────────────────────────────
echo "Core tooling"
NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
  if [[ "$NODE_MAJOR" -ge 18 ]]; then ok "node $(node -v)"; else bad "node $(node -v) is too old; Remotion needs 18+"; fi
else
  bad "node not found — install Node 20 LTS"
fi

if command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1; then
  ok "ffmpeg $(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')"
else
  bad "ffmpeg/ffprobe not found — every clip transcode and duration measurement depends on it"
  ACTIONS+=("brew install ffmpeg")
fi

if command -v uvx >/dev/null 2>&1; then
  ok "uvx (runs the demo-elevenlabs MCP server)"
else
  bad "uvx not found — the demo-elevenlabs MCP server cannot start"
  ACTIONS+=("brew install uv")
fi

# ── Playwright ─────────────────────────────────────────────────────────────────
echo
echo "Playwright"
if [[ -d "$HOME/Library/Caches/ms-playwright" || -d "$HOME/.cache/ms-playwright" ]]; then
  ok "browsers installed"
else
  bad "no Playwright browsers — headless Chromium is what records the web clips"
  ACTIONS+=("npx playwright install chromium")
fi

if [[ -d "$CACHE/node_modules/playwright" ]]; then
  ok "playwright module available for the script capture paths (launch, attach)"
elif [[ -d "node_modules/playwright" || -d "node_modules/@playwright/test" ]]; then
  ok "playwright module available in this project"
else
  warn "no importable playwright module — needed by capture-electron.mjs and capture-attached.mjs"
  ACTIONS+=("npm install --prefix \"$CACHE\" playwright")
fi

# ── ElevenLabs ─────────────────────────────────────────────────────────────────
echo
echo "Voiceover"
if [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
  ok "ELEVENLABS_API_KEY is set"
else
  bad "ELEVENLABS_API_KEY is not set — add it to your shell profile or Claude Code env"
fi

# ── Remotion ───────────────────────────────────────────────────────────────────
echo
echo "Remotion"
REMOTION_FOUND=0
for dir in "$HOME/.claude/plugins/marketplaces" "$HOME/.claude/plugins/repos"; do
  [[ -d "$dir" ]] && ls "$dir" 2>/dev/null | grep -qi remotion && REMOTION_FOUND=1
done
if [[ "$REMOTION_FOUND" -eq 1 ]]; then
  ok "remotion plugin/marketplace present"
else
  bad "remotion Claude Code plugin not detected"
  ACTIONS+=("claude plugin marketplace add remotion-dev/claude-code-plugin")
  ACTIONS+=("claude plugin install remotion@remotion")
fi

if [[ -d "$HOME/.claude/skills" ]] && ls "$HOME/.claude/skills" 2>/dev/null | grep -qi remotion; then
  ok "remotion agent skills present"
else
  warn "remotion agent skills not detected — optional, used only for custom compositions beyond"
  warn "the bundled template. Install per https://www.remotion.dev/docs/ai (manual step)."
fi

# ── Recorder: OBS (optional) ───────────────────────────────────────────────────
echo
echo "Recorder: OBS (optional — crisp 60 fps window capture, meta.capture.recorder \"obs\")"
if [[ -d /Applications/OBS.app ]]; then
  ok "OBS $(defaults read /Applications/OBS.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null)"
  if [[ "${NODE_MAJOR:-0}" -ge 22 ]]; then
    ok "node $(node -v) has the global WebSocket obs.mjs needs"
  else
    warn "obs.mjs needs Node 22+ for its WebSocket client"
  fi
  if [[ -n "${OBS_WEBSOCKET_PASSWORD:-}" ]]; then
    ok "OBS_WEBSOCKET_PASSWORD is set"
    if STATUS=$(node "$PLUGIN_ROOT/scripts/obs.mjs" status 2>&1); then
      ok "OBS answers: $(node -e 'const s=JSON.parse(process.argv[1]); console.log(`OBS ${s.obs}, websocket ${s.websocket}, ${s.video.base} @ ${s.video.fps} fps, pause ${s.output.canPause === false ? "NOT possible (" + s.output.detail + ")" : "possible"}`)' "$STATUS")"
    else
      warn "OBS did not answer — ${STATUS#demo-video: }"
    fi
  else
    warn "OBS_WEBSOCKET_PASSWORD is not set. OBS → Tools → WebSocket Server Settings: enable it, copy the"
    warn "password into your secret store, and export it to the environment. Never into a repo."
  fi
else
  warn "OBS not installed — needed only for OBS capture (brew install --cask obs)"
fi

# ── Finish: Final Cut Pro (optional) ───────────────────────────────────────────
echo
echo "Finish: Final Cut Pro (optional — timeline-to-fcpxml.mjs)"
FCP_APP=$(ls -d /Applications/Final\ Cut\ Pro*.app 2>/dev/null | head -1)
if [[ -n "$FCP_APP" ]]; then
  FCP_DTD=$(ls "$FCP_APP"/Contents/Frameworks/Interchange.framework/Versions/A/Resources/FCPXMLv1_*.dtd 2>/dev/null \
    | sed -E 's/.*FCPXMLv1_([0-9]+)\.dtd/\1/' | sort -n | tail -1)
  ok "$(basename "$FCP_APP" .app) $(defaults read "$FCP_APP/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null), imports FCPXML up to 1.${FCP_DTD:-?}"
  if command -v xmllint >/dev/null 2>&1; then ok "xmllint (validates the export against FCP's own DTD)"; else warn "xmllint not found — exports go unvalidated"; fi
else
  warn "Final Cut Pro not installed — needed only for the FCP finish"
fi

# ── MCP servers ────────────────────────────────────────────────────────────────
echo
echo "MCP servers (declared by this plugin — verify in /mcp)"
echo "  demo-playwright   npx @playwright/mcp@latest --caps=devtools …"
echo "  demo-elevenlabs   uvx elevenlabs-mcp"
echo "  The video tools (browser_start_video / browser_stop_video / browser_video_chapter)"
echo "  exist only when --caps=devtools is passed. If /mcp does not list them, the demo"
echo "  cannot record: update @playwright/mcp and restart Claude Code."

# ── Act ────────────────────────────────────────────────────────────────────────
echo
if [[ ${#ACTIONS[@]} -eq 0 ]]; then
  echo "demo-video: everything needed is present."
  exit 0
fi

echo "Suggested commands (${#ACTIONS[@]}):"
for a in "${ACTIONS[@]}"; do echo "  $a"; done

if [[ "$MODE" != install ]]; then
  echo
  echo "Run 'setup.sh --install' (or /demo-setup) to apply these."
  [[ "$MISSING" -gt 0 ]] && exit 1
  exit 0
fi

echo
echo "Installing…"
for a in "${ACTIONS[@]}"; do
  echo "  \$ $a"
  if ! eval "$a"; then
    echo "  failed: $a" >&2
    echo "  Run it manually, then re-run the check." >&2
  fi
done

echo
echo "demo-video: setup pass complete. Restart Claude Code if the remotion plugin was just added,"
echo "then re-run /demo-setup to confirm."

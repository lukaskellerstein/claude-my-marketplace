#!/usr/bin/env bash
# TIER 3 Electron fallback: OS-level screen capture on macOS.
#
# Use only when Playwright's Electron recordVideo produces empty files (a known issue on
# some Playwright/Electron combinations). Quality is lower than a real Playwright
# recording: the OS cursor is captured instead of the styled overlay, display scaling can
# soften text, and timing is less precise.
#
# Requires Screen Recording permission for the terminal running Claude Code:
#   System Settings > Privacy & Security > Screen Recording
#
# usage: capture-screen-macos.sh --app "My App" --out demo/capture/07-native.webm --seconds 20
#        capture-screen-macos.sh --list        # show avfoundation devices
set -euo pipefail

APP=""
OUT=""
SECONDS_TO_RECORD=20
FPS=30
DEVICE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app) APP="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --seconds) SECONDS_TO_RECORD="$2"; shift 2 ;;
    --fps) FPS="$2"; shift 2 ;;
    --device) DEVICE="$2"; shift 2 ;;
    --list) ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | sed -n '/AVFoundation/,$p'; exit 0 ;;
    *) echo "demo-video: unknown argument $1" >&2; exit 1 ;;
  esac
done

[[ "$(uname)" == "Darwin" ]] || { echo "demo-video: this fallback is macOS-only." >&2; exit 1; }
[[ -n "$OUT" ]] || { echo "demo-video: --out is required." >&2; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "demo-video: ffmpeg not found. brew install ffmpeg" >&2; exit 1; }

mkdir -p "$(dirname "$OUT")"

# Find the screen capture device index if not given.
if [[ -z "$DEVICE" ]]; then
  DEVICE=$(ffmpeg -f avfoundation -list_devices true -i "" 2>&1 \
    | awk -F'[][]' '/Capture screen 0/ {print $4; exit}')
  DEVICE="${DEVICE:-1}"
fi

CROP=""
if [[ -n "$APP" ]]; then
  # Front window bounds, so we record the app rather than the whole desktop.
  BOUNDS=$(osascript <<OSA 2>/dev/null || true
tell application "System Events"
  tell process "$APP"
    set p to position of front window
    set s to size of front window
    return (item 1 of p as string) & "," & (item 2 of p as string) & "," & (item 1 of s as string) & "," & (item 2 of s as string)
  end tell
end tell
OSA
)
  if [[ -n "$BOUNDS" ]]; then
    IFS=',' read -r X Y W H <<< "$BOUNDS"
    # Round to even numbers for yuv420p.
    W=$(( (W / 2) * 2 )); H=$(( (H / 2) * 2 ))
    CROP="crop=${W}:${H}:${X}:${Y},"
    echo "demo-video: recording \"$APP\" window at ${W}x${H} offset ${X},${Y}"
    osascript -e "tell application \"$APP\" to activate" >/dev/null 2>&1 || true
    sleep 1
  else
    echo "demo-video: could not read window bounds for \"$APP\" (grant Accessibility permission); recording the full screen." >&2
  fi
fi

RAW="${OUT%.*}.raw.mkv"
echo "demo-video: capturing ${SECONDS_TO_RECORD}s from avfoundation device ${DEVICE}…"
ffmpeg -y -hide_banner -loglevel error \
  -f avfoundation -capture_cursor 1 -framerate "$FPS" -i "${DEVICE}:none" \
  -t "$SECONDS_TO_RECORD" \
  -vf "${CROP}scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  -c:v libx264 -preset ultrafast -crf 16 -pix_fmt yuv420p \
  "$RAW"

# Normalise to the same CFR mp4 contract every other clip follows.
MP4="${OUT%.*}.mp4"
bash "$(dirname "$0")/transcode-clip.sh" "$RAW" "$MP4" --fps "$FPS"
rm -f "$RAW"

echo "demo-video: screen capture -> $MP4"
echo "  Note: this clip shows the real OS cursor, not the styled overlay. Keep it short and"
echo "  prefer it only for genuinely native beats (menus, dialogs, tray, multi-window)."

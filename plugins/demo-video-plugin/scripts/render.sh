#!/usr/bin/env bash
# Render demo/timeline.json to a video with Remotion.
#
# Two presets, because reviewing a draft is cheap and rendering a final is not:
#   --draft  720p, fast preset, higher CRF, half scale     — for the review gate
#   --final  full outputSize, CRF 18, audio at 320k        — for delivery
#
# The studio project reads ../timeline.json, and --public-dir=.. makes staticFile()
# resolve demo/capture/*.mp4 and demo/audio/*.mp3 without copying media around.
#
# usage: render.sh [--draft|--final] [--project DIR] [--out PATH] [--codec h264|prores]
#                  [--concurrency N]
set -euo pipefail

MODE=draft
PROJECT="$(pwd)"
OUT=""
CODEC=h264
COMPOSITION=Demo
CONCURRENCY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --draft) MODE=draft; shift ;;
    --final) MODE=final; shift ;;
    --project) PROJECT="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --codec) CODEC="$2"; shift 2 ;;
    --composition) COMPOSITION="$2"; shift 2 ;;
    --concurrency) CONCURRENCY="$2"; shift 2 ;;
    *) echo "demo-video: unknown argument $1" >&2; exit 1 ;;
  esac
done

DEMO="$PROJECT/demo"
STUDIO="$DEMO/studio"
TIMELINE="$DEMO/timeline.json"

[[ -f "$TIMELINE" ]] || { echo "demo-video: no $TIMELINE. Run scripts/reconcile.mjs first." >&2; exit 1; }
[[ -d "$STUDIO" ]] || { echo "demo-video: no Remotion project at $STUDIO. Run scripts/init-demo.sh." >&2; exit 1; }

# Never render a timeline that does not validate — a broken render wastes minutes.
node "$(dirname "$0")/validate-timeline.mjs" "$TIMELINE" || {
  echo "demo-video: timeline validation failed; not rendering." >&2
  exit 1
}

if [[ -z "$OUT" ]]; then
  if [[ "$MODE" == final ]]; then OUT="$DEMO/out/demo.mp4"; else OUT="$DEMO/out/demo-draft.mp4"; fi
fi
mkdir -p "$(dirname "$OUT")"

if [[ ! -d "$STUDIO/node_modules" ]]; then
  echo "demo-video: installing Remotion dependencies (first render only)…"
  (cd "$STUDIO" && npm install --silent)
fi

if [[ -z "$CONCURRENCY" ]]; then
  CORES=$( (sysctl -n hw.logicalcpu 2>/dev/null || nproc 2>/dev/null) || echo 4 )
  CONCURRENCY=$(( CORES > 2 ? CORES - 1 : 1 ))
fi

COMMON=(
  "$COMPOSITION"
  "$OUT"
  "--public-dir=.."
  "--concurrency=$CONCURRENCY"
  "--log=info"
  "--enforce-audio-track"
)

if [[ "$MODE" == draft ]]; then
  ARGS=("${COMMON[@]}" --scale=0.6 --crf=28 --codec=h264 --audio-codec=aac)
  echo "demo-video: DRAFT render -> $OUT (0.6 scale, crf 28)"
else
  case "$CODEC" in
    prores) ARGS=("${COMMON[@]}" --codec=prores --prores-profile=hq) ;;
    *)      ARGS=("${COMMON[@]}" --crf=18 --codec=h264 --audio-codec=aac --audio-bitrate=320k) ;;
  esac
  echo "demo-video: FINAL render -> $OUT (codec $CODEC)"
fi

cd "$STUDIO"
npx remotion render src/index.ts "${ARGS[@]}"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" 2>/dev/null || echo "?")
SIZE=$(du -h "$OUT" | cut -f1)
echo "demo-video: rendered $OUT — ${DUR}s, ${SIZE}"
if [[ "$MODE" == draft ]]; then
  echo "  Next: scripts/extract-frames.sh \"$OUT\" and review before the final render."
fi

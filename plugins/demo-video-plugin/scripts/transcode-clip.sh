#!/usr/bin/env bash
# Transcode a raw recording — Playwright WebM, OBS MOV/MKV/MP4, ffmpeg MKV — into
# constant-frame-rate H.264 MP4 and write a measured duration sidecar next to it.
#
# The capture hook does this automatically after browser_stop_video, and the capture
# scripts call it after every take. Run it by hand for clips recorded outside them.
#
# usage: transcode-clip.sh <input> [output.mp4] [--fps 30] [--crf 18]
set -euo pipefail

IN="${1:-}"
if [[ -z "$IN" || ! -f "$IN" ]]; then
  echo "usage: transcode-clip.sh <input> [output.mp4] [--fps N] [--crf N]" >&2
  exit 1
fi

OUT="${2:-}"
if [[ -z "$OUT" || "$OUT" == --* ]]; then
  OUT="${IN%.*}.mp4"
fi
if [[ "$(cd "$(dirname "$IN")" && pwd)/$(basename "$IN")" == "$(cd "$(dirname "$OUT")" 2>/dev/null && pwd)/$(basename "$OUT")" ]]; then
  echo "demo-video: $IN would be transcoded onto itself. Keep raw takes in capture/raw/." >&2
  exit 1
fi

FPS=30
CRF=18
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fps) FPS="$2"; shift 2 ;;
    --crf) CRF="$2"; shift 2 ;;
    *) shift ;;
  esac
done

for bin in ffmpeg ffprobe; do
  command -v "$bin" >/dev/null 2>&1 || { echo "demo-video: $bin not found. brew install ffmpeg" >&2; exit 1; }
done

SIZE=$(stat -f%z "$IN" 2>/dev/null || stat -c%s "$IN")
if [[ "$SIZE" -lt 4096 ]]; then
  echo "demo-video: $IN is ${SIZE} bytes — the recording failed. Re-record instead of transcoding." >&2
  exit 1
fi

# Write via a temp file so a killed ffmpeg never leaves a half-written mp4 that the
# reconciler would then measure.
TMP="${OUT}.part"
ffmpeg -y -hide_banner -loglevel error \
  -i "$IN" \
  -r "$FPS" -vsync cfr \
  -c:v libx264 -preset medium -crf "$CRF" -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  -movflags +faststart -an \
  -f mp4 "$TMP"
mv "$TMP" "$OUT"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
case "$DUR" in
  ''|*[!0-9.]*) echo "demo-video: ffprobe reported no usable duration for $OUT ('$DUR') — the transcode failed." >&2; exit 1 ;;
esac
DUR=$(awk -v d="$DUR" 'BEGIN{printf "%.3f", d}')
DIMS=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$OUT")
W="${DIMS%x*}"; H="${DIMS#*x}"
BASE=$(basename "$OUT"); ID="${BASE%.*}"

cat > "${OUT%.*}.json" <<JSON
{
  "id": "${ID}",
  "source": "$(basename "$IN")",
  "file": "capture/${BASE}",
  "durationSeconds": ${DUR},
  "width": ${W},
  "height": ${H},
  "fps": ${FPS},
  "transcodedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

printf 'demo-video: %s -> %s (%.2fs, %sx%s @ %sfps)\n' "$(basename "$IN")" "$BASE" "$DUR" "$W" "$H" "$FPS"

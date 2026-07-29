#!/usr/bin/env bash
# Extract evenly spaced frames from a rendered demo (plus a contact sheet) so the
# frame critic can actually look at the video instead of trusting that it worked.
#
# usage: extract-frames.sh <video.mp4> [outdir] [count]
#        extract-frames.sh demo/out/demo-draft.mp4 demo/out/frames 24
set -euo pipefail

VIDEO="${1:-}"
OUTDIR="${2:-}"
COUNT="${3:-20}"

if [[ -z "$VIDEO" || ! -f "$VIDEO" ]]; then
  echo "usage: extract-frames.sh <video.mp4> [outdir] [count]" >&2
  exit 1
fi
[[ -n "$OUTDIR" ]] || OUTDIR="$(dirname "$VIDEO")/frames"

command -v ffmpeg >/dev/null 2>&1 || { echo "demo-video: ffmpeg not found. brew install ffmpeg" >&2; exit 1; }

rm -rf "$OUTDIR"
mkdir -p "$OUTDIR"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
# Sample strictly inside the clip so the first/last frames (often a fade) are not the sample.
STEP=$(awk -v d="$DUR" -v n="$COUNT" 'BEGIN{printf "%.4f", (d*0.96)/n}')
START=$(awk -v d="$DUR" 'BEGIN{printf "%.4f", d*0.02}')

for ((i = 0; i < COUNT; i++)); do
  T=$(awk -v s="$START" -v st="$STEP" -v i="$i" 'BEGIN{printf "%.3f", s + st*i}')
  LABEL=$(printf '%02d' $((i + 1)))
  ffmpeg -y -hide_banner -loglevel error -ss "$T" -i "$VIDEO" -frames:v 1 \
    -vf "scale=960:-2,drawtext=text='${LABEL} @ ${T}s':x=16:y=16:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8" \
    "$OUTDIR/frame-${LABEL}.png" 2>/dev/null \
    || ffmpeg -y -hide_banner -loglevel error -ss "$T" -i "$VIDEO" -frames:v 1 \
       -vf "scale=960:-2" "$OUTDIR/frame-${LABEL}.png"
done

# Contact sheet: one image the critic can scan for pacing and obvious breakage.
ffmpeg -y -hide_banner -loglevel error -pattern_type glob -i "$OUTDIR/frame-*.png" \
  -vf "scale=480:-2,tile=4x$(( (COUNT + 3) / 4 ))" "$OUTDIR/contact-sheet.png" 2>/dev/null || true

echo "demo-video: extracted $COUNT frames from $(basename "$VIDEO") (${DUR%.*}s) -> $OUTDIR"
echo "  Read $OUTDIR/contact-sheet.png first, then individual frames for anything suspicious."

#!/usr/bin/env bash
# Produce word-level caption timing for generated narration.
#
# The ElevenLabs MCP server exposes no alignment tool, so this calls the forced-alignment
# REST endpoint directly with the same API key. Output lands at
# demo/audio/<id>.align.json, which reconcile.mjs reads when meta.captions is "word".
#
# usage: align-captions.sh [--project DIR] [section-id …]
#        align-captions.sh                 # every section with audio + narration text
#        align-captions.sh 03-search
set -euo pipefail

PROJECT="$(pwd)"
IDS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    *) IDS+=("$1"); shift ;;
  esac
done

DEMO="$PROJECT/demo"
STORYBOARD="$DEMO/storyboard.json"

[[ -n "${ELEVENLABS_API_KEY:-}" ]] || { echo "demo-video: ELEVENLABS_API_KEY is not set." >&2; exit 1; }
[[ -f "$STORYBOARD" ]] || { echo "demo-video: no $STORYBOARD." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "demo-video: curl not found." >&2; exit 1; }

# Sections that have narration text, optionally filtered to the requested ids.
mapfile -t SECTIONS < <(node -e '
const fs=require("fs");
const sb=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
const want=process.argv.slice(2);
for(const s of sb.sections||[]){
  const vo=String(s.voiceover||"").trim();
  if(!vo) continue;
  if(want.length && !want.includes(s.id)) continue;
  process.stdout.write(s.id+"\t"+vo.replace(/\t/g," ")+"\n");
}' "$STORYBOARD" "${IDS[@]+"${IDS[@]}"}")

if [[ ${#SECTIONS[@]} -eq 0 ]]; then
  echo "demo-video: no sections with narration text to align."
  exit 0
fi

ALIGNED=0
for row in "${SECTIONS[@]}"; do
  ID="${row%%$'\t'*}"
  TEXT="${row#*$'\t'}"

  AUDIO=""
  for ext in mp3 wav m4a; do
    if [[ -f "$DEMO/audio/$ID.$ext" ]]; then AUDIO="$DEMO/audio/$ID.$ext"; break; fi
  done
  if [[ -z "$AUDIO" ]]; then
    echo "  skip $ID — no audio file yet" >&2
    continue
  fi

  OUT="$DEMO/audio/$ID.align.json"
  HTTP=$(curl -sS -w '%{http_code}' -o "$OUT.part" \
    -X POST https://api.elevenlabs.io/v1/forced-alignment \
    -H "xi-api-key: $ELEVENLABS_API_KEY" \
    -F "file=@$AUDIO" \
    -F "text=$TEXT")

  if [[ "$HTTP" != "200" ]]; then
    echo "  FAIL $ID — HTTP $HTTP: $(head -c 300 "$OUT.part")" >&2
    rm -f "$OUT.part"
    continue
  fi

  # Keep only what the renderer needs, and fail loudly if the shape is unexpected.
  if node -e '
    const fs=require("fs");
    const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    if(!Array.isArray(d.words)||!d.words.length) throw new Error("no words[] in response");
    const words=d.words.map(w=>({text:w.text,start:w.start,end:w.end}));
    fs.writeFileSync(process.argv[2],JSON.stringify({words},null,2)+"\n");
  ' "$OUT.part" "$OUT"; then
    rm -f "$OUT.part"
    COUNT=$(node -e 'console.log(require(process.argv[1]).words.length)' "$OUT")
    echo "  aligned $ID — $COUNT words -> audio/$ID.align.json"
    ALIGNED=$((ALIGNED + 1))
  else
    echo "  FAIL $ID — unexpected response shape; left at $OUT.part" >&2
  fi
done

echo "demo-video: aligned $ALIGNED section(s)."
echo "  Set meta.captions to \"word\" in the storyboard, then re-run reconcile.mjs."

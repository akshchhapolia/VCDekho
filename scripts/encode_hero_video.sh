#!/usr/bin/env bash
# Re-encode assets/mainvideo.original.mp4 → assets/mainvideo.v2.mp4
# Same 1280×720 / 24fps / 8s loop, no audio. CRF 32 is the highest
# compression that still matches the live background look (grainy sand).
# Filename is versioned because /assets/* is cached immutable.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ORIG="$ROOT/assets/mainvideo.original.mp4"
DEST="$ROOT/assets/mainvideo.v2.mp4"

if ! command -v ffmpeg >/dev/null; then
  echo "ffmpeg is required" >&2
  exit 1
fi
if [[ ! -f "$ORIG" ]]; then
  echo "missing $ORIG" >&2
  exit 1
fi

ffmpeg -y -i "$ORIG" \
  -an \
  -c:v libx264 -preset slow -crf 32 \
  -profile:v high -level 4.0 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -map_metadata -1 \
  "$DEST"

echo "wrote $DEST ($(du -h "$DEST" | awk '{print $1}'))"

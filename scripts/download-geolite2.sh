#!/usr/bin/env bash
# Download GeoLite2-Country.mmdb from MaxMind.
# Requires a free MaxMind account: https://www.maxmind.com/en/geolite2/signup
#
# Usage:
#   MAXMIND_LICENSE_KEY=your_key bash scripts/download-geolite2.sh
#   MAXMIND_LICENSE_KEY=your_key OUTPUT_PATH=/app/GeoLite2-Country.mmdb bash scripts/download-geolite2.sh

set -euo pipefail

KEY="${MAXMIND_LICENSE_KEY:-}"
OUTPUT="${OUTPUT_PATH:-./GeoLite2-Country.mmdb}"

if [ -z "$KEY" ]; then
  echo "ERROR: MAXMIND_LICENSE_KEY is not set."
  echo "  Get a free key at https://www.maxmind.com/en/geolite2/signup"
  exit 1
fi

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

echo "Downloading GeoLite2-Country database..."
curl -fsSL \
  "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=${KEY}&suffix=tar.gz" \
  -o "$TMP/GeoLite2-Country.tar.gz"

echo "Extracting..."
tar -xzf "$TMP/GeoLite2-Country.tar.gz" -C "$TMP"

MMDB=$(find "$TMP" -name "GeoLite2-Country.mmdb" | head -1)
if [ -z "$MMDB" ]; then
  echo "ERROR: GeoLite2-Country.mmdb not found in archive."
  exit 1
fi

cp "$MMDB" "$OUTPUT"
echo "Done. Database saved to: $OUTPUT"

#!/usr/bin/env bash
# Usage: CRON_SECRET=xxx APP_URL=https://yourdomain.com bash scripts/test-digest.sh
# Fires the weekly digest endpoint and checks for a 200 response.

set -euo pipefail

APP_URL="${APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:?CRON_SECRET is required}"

HTTP_CODE=$(curl -sf -w "%{http_code}" -o /tmp/digest-out.json \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/weekly-digest")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Digest endpoint returned 200"
  cat /tmp/digest-out.json
else
  echo "✗ Digest endpoint returned $HTTP_CODE"
  cat /tmp/digest-out.json 2>/dev/null || true
  exit 1
fi

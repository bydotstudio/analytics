#!/usr/bin/env bash
# Run all production-hardening tests.
# Prerequisites:
#   - App running at TEST_URL (default: http://localhost:3000)
#   - DATABASE_URL or PGURL set for RLS test
#   - GeoLite2-Country.mmdb present for geo test (optional — test gracefully skips)
#
# Usage:
#   npm run build && bash scripts/test-all.sh

set -euo pipefail

echo "=== Build check ==="
npm run build

echo ""
echo "=== GeoLite2 country detection ==="
npx tsx scripts/test-geo.ts 8.8.8.8

echo ""
echo "=== Rate limiting ==="
npx tsx scripts/test-rate-limit.ts

echo ""
echo "=== Plan limits ==="
if [ -n "${TEST_COOKIE:-}" ]; then
  npx tsx scripts/test-plan-limits.ts
else
  echo "⚠ Skipped — set TEST_COOKIE to run this test"
fi

echo ""
echo "=== RLS ==="
if [ -n "${PGURL:-}" ] || [ -n "${DATABASE_URL:-}" ]; then
  npx tsx scripts/test-rls.ts
else
  echo "⚠ Skipped — set PGURL or DATABASE_URL to run this test"
fi

echo ""
echo "=== Weekly digest ==="
if [ -n "${CRON_SECRET:-}" ]; then
  bash scripts/test-digest.sh
else
  echo "⚠ Skipped — set CRON_SECRET (and APP_URL) to run this test"
fi

echo ""
echo "=== All tests passed ==="

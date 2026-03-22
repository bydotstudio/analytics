// Usage: TEST_URL=http://localhost:3000 TEST_SITE_ID=<uuid> npx tsx scripts/test-rate-limit.ts
// Fires 125 requests and asserts the 121st+ returns 429.
const url = (process.env.TEST_URL ?? "http://localhost:3000") + "/api/track";
const siteId = process.env.TEST_SITE_ID ?? "00000000-0000-0000-0000-000000000000";
const body = JSON.stringify({ siteId, pathname: "/test" });

let hit429 = false;
for (let i = 0; i < 125; i++) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "1.2.3.4",
    },
    body,
  });
  if (res.status === 429) {
    hit429 = true;
    const retryAfter = res.headers.get("Retry-After");
    console.log(`✓ Got 429 at request ${i + 1} — Retry-After: ${retryAfter}s`);
    break;
  }
}

if (!hit429) {
  console.error("✗ Rate limit was never triggered after 125 requests");
  process.exit(1);
}

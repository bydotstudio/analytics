// Usage: TEST_COOKIE="better-auth.session_token=..." npx tsx scripts/test-plan-limits.ts
// Reads the billing/usage endpoint and asserts limits match plan tier.
const base = process.env.TEST_URL ?? "http://localhost:3000";
const cookie = process.env.TEST_COOKIE ?? "";

const res = await fetch(`${base}/api/billing/usage`, {
  headers: { Cookie: cookie },
});

if (!res.ok) {
  console.error(`✗ Request failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const data = (await res.json()) as {
  plan: string;
  sites: number;
  events_this_month: number;
  limits: { sites: number | null; events_per_month: number };
};

console.log(`Plan: ${data.plan}`);
console.log(`Events this month: ${data.events_this_month.toLocaleString()}`);
console.log(`Event limit: ${data.limits.events_per_month.toLocaleString()}`);

if (data.plan === "pro") {
  console.assert(
    data.limits.events_per_month === 1_000_000,
    `✗ Pro should have 1M limit, got ${data.limits.events_per_month}`
  );
  console.log("✓ Pro plan: 1M event limit correct");
} else {
  console.assert(
    data.limits.events_per_month === 20_000,
    `✗ Free should have 20k limit, got ${data.limits.events_per_month}`
  );
  console.log("✓ Free plan: 20k event limit correct");
}

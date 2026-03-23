import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "pg";
import {
  getPool,
  getCh,
  appUrl,
  createTestUser,
  createTestSite,
  createTestSession,
  authHeader,
  pollUntil,
} from "./helpers";

// Shared across all tests in this file
let pool: Pool;
let ch: ReturnType<typeof getCh>;
let siteId: string;
let sessionToken: string;

beforeAll(async () => {
  pool = getPool();
  ch = getCh();

  const userId = await createTestUser(pool);
  siteId = await createTestSite(pool, userId);
  sessionToken = await createTestSession(pool, userId);
});

afterAll(async () => {
  await pool.end();
  await ch.close();
});

// ── Pageview ingest ───────────────────────────────────────────────────────────

describe("pageview ingest", () => {
  it("POST /api/track → 200 and event appears in ClickHouse", async () => {
    const res = await fetch(`${appUrl()}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        pathname: "/integration-test",
        sessionId: "sess-ingest-1",
        referrer: "google.com",
      }),
    });

    expect(res.status).toBe(200);

    await pollUntil(async () => {
      const result = await ch.query({
        query: `SELECT count() AS n FROM analytics.events
                WHERE site_id = '${siteId}'
                  AND event_type = 'pageview'
                  AND pathname = '/integration-test'`,
        format: "JSONEachRow",
      });
      const rows = await result.json<{ n: string }>();
      return Number(rows[0]?.n) >= 1;
    });
  });

  it("stats/summary reflects the ingested pageview", async () => {
    const res = await fetch(
      `${appUrl()}/api/stats/summary?siteId=${siteId}`,
      { headers: authHeader(sessionToken) }
    );

    expect(res.status).toBe(200);
    const stats = await res.json();

    // We ingested exactly 1 event in the test above — it must appear today
    expect(stats.today).toBeGreaterThanOrEqual(1);
    expect(stats.last_7d).toBeGreaterThanOrEqual(1);
    expect(stats.last_30d).toBeGreaterThanOrEqual(1);
  });

  it("stats/pages includes the ingested pathname", async () => {
    const res = await fetch(
      `${appUrl()}/api/stats/pages?siteId=${siteId}`,
      { headers: authHeader(sessionToken) }
    );

    expect(res.status).toBe(200);
    const pages = await res.json();
    const found = pages.find((p: { label: string }) =>
      p.label === "/integration-test"
    );
    expect(found).toBeDefined();
    expect(found.visitors).toBeGreaterThanOrEqual(1);
  });
});

// ── Custom event ingest ───────────────────────────────────────────────────────

describe("custom event ingest", () => {
  it("POST /api/track/event → 204 and revenue appears in stats", async () => {
    const res = await fetch(`${appUrl()}/api/track/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        name: "purchase",
        revenue: 49.99,
        currency: "USD",
        sessionId: "sess-event-1",
        pathname: "/checkout",
      }),
    });

    expect(res.status).toBe(204);

    // Wait for async ClickHouse insert
    await pollUntil(async () => {
      const result = await ch.query({
        query: `SELECT count() AS n FROM analytics.events
                WHERE site_id = '${siteId}'
                  AND event_type = 'custom'
                  AND event_name = 'purchase'`,
        format: "JSONEachRow",
      });
      const rows = await result.json<{ n: string }>();
      return Number(rows[0]?.n) >= 1;
    });

    // Verify via revenue stats API
    const statsRes = await fetch(
      `${appUrl()}/api/stats/revenue?siteId=${siteId}`,
      { headers: authHeader(sessionToken) }
    );

    expect(statsRes.status).toBe(200);
    const stats = await statsRes.json();
    expect(stats.total_conversions).toBeGreaterThanOrEqual(1);
    expect(stats.total_revenue).toBeCloseTo(49.99, 1);
  });
});

// ── Active visitors ───────────────────────────────────────────────────────────

describe("active visitors", () => {
  it("stats/active returns a non-negative count", async () => {
    const res = await fetch(
      `${appUrl()}/api/stats/active?siteId=${siteId}`,
      { headers: authHeader(sessionToken) }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.active).toBe("number");
    expect(data.active).toBeGreaterThanOrEqual(0);
  });
});

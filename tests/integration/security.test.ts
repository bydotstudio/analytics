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

let pool: Pool;
let ch: ReturnType<typeof getCh>;

beforeAll(() => {
  pool = getPool();
  ch = getCh();
});

afterAll(async () => {
  await pool.end();
  await ch.close();
});

// ── Site isolation ────────────────────────────────────────────────────────────

describe("site isolation", () => {
  it("user B cannot read user A site stats → 404", async () => {
    const userAId = await createTestUser(pool);
    const siteAId = await createTestSite(pool, userAId);

    const userBId = await createTestUser(pool);
    const userBToken = await createTestSession(pool, userBId);

    const res = await fetch(
      `${appUrl()}/api/stats/summary?siteId=${siteAId}`,
      { headers: authHeader(userBToken) }
    );

    expect(res.status).toBe(404);
  });

  it("user A data is invisible when querying through user B session", async () => {
    const userAId = await createTestUser(pool);
    const siteAId = await createTestSite(pool, userAId);

    // Ingest some events for user A's site
    await fetch(`${appUrl()}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId: siteAId,
        pathname: "/secret-page",
        sessionId: "sess-isolation",
      }),
    });

    // User B tries to get user A's pages — should be blocked at site ownership check
    const userBId = await createTestUser(pool);
    const userBToken = await createTestSession(pool, userBId);

    const pagesRes = await fetch(
      `${appUrl()}/api/stats/pages?siteId=${siteAId}`,
      { headers: authHeader(userBToken) }
    );

    expect(pagesRes.status).toBe(404);
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

describe("rate limiting", () => {
  it("returns 429 after 120 requests from the same IP within 60s", async () => {
    // Use a unique IP per test run to avoid state from other tests
    const testIp = `10.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;

    // Need a real siteId for the requests to reach the rate limit check
    const userId = await createTestUser(pool);
    const siteId = await createTestSite(pool, userId);

    // Fire 121 requests concurrently from the same IP
    const statuses = await Promise.all(
      Array.from({ length: 121 }, () =>
        fetch(`${appUrl()}/api/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": testIp,
          },
          body: JSON.stringify({ siteId, pathname: "/" }),
        }).then((r) => r.status)
      )
    );

    const blocked = statuses.filter((s) => s === 429);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
  });

  it("Retry-After header is present on 429 response", async () => {
    const testIp = `10.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    const userId = await createTestUser(pool);
    const siteId = await createTestSite(pool, userId);

    const responses = await Promise.all(
      Array.from({ length: 121 }, () =>
        fetch(`${appUrl()}/api/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": testIp,
          },
          body: JSON.stringify({ siteId, pathname: "/" }),
        })
      )
    );

    const blocked = responses.find((r) => r.status === 429);
    expect(blocked).toBeDefined();
    expect(blocked!.headers.get("retry-after")).toBeTruthy();
  });
});

// ── Plan limits ───────────────────────────────────────────────────────────────

describe("plan limits", () => {
  it("free plan silently drops events after 20k events this month → 204", async () => {
    const freeUserId = await createTestUser(pool, "free");
    const freeSiteId = await createTestSite(pool, freeUserId);

    // Batch-insert exactly 20,000 events directly into ClickHouse (synchronous)
    const now = new Date().toISOString().replace("T", " ").replace("Z", "");
    const batch = Array.from({ length: 20_000 }, (_, i) => ({
      timestamp: now,
      site_id: freeSiteId,
      event_type: "pageview",
      session_id: `seed-${i}`,
      visitor_hash: "aabbccddeeff0011",
      pathname: "/seed",
      referrer: "",
      country: "",
      browser: "",
      os: "",
      device: "desktop",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      event_name: "",
      revenue: null,
      currency: "",
      properties: "",
      lcp: null,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
    }));

    await ch.insert({
      table: "analytics.events",
      values: batch,
      format: "JSONEachRow",
      clickhouse_settings: { async_insert: 0, wait_for_async_insert: 1 },
    });

    // Verify the count is actually 20k before testing the limit
    await pollUntil(async () => {
      const result = await ch.query({
        query: `SELECT count() AS n FROM analytics.events WHERE site_id = '${freeSiteId}'`,
        format: "JSONEachRow",
      });
      const rows = await result.json<{ n: string }>();
      return Number(rows[0]?.n) >= 20_000;
    });

    // The 20,001st event must be silently dropped
    const res = await fetch(`${appUrl()}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: freeSiteId, pathname: "/over-limit" }),
    });

    expect(res.status).toBe(204);
  });

  it("pro plan accepts events beyond 20k", async () => {
    const proUserId = await createTestUser(pool, "pro");
    const proSiteId = await createTestSite(pool, proUserId);

    // Insert 20,001 events — pro should not be blocked
    const now = new Date().toISOString().replace("T", " ").replace("Z", "");
    await ch.insert({
      table: "analytics.events",
      values: Array.from({ length: 20_001 }, (_, i) => ({
        timestamp: now,
        site_id: proSiteId,
        event_type: "pageview",
        session_id: `pro-${i}`,
        visitor_hash: "aabbccddeeff0011",
        pathname: "/pro",
        referrer: "",
        country: "",
        browser: "",
        os: "",
        device: "desktop",
        utm_source: "",
        utm_medium: "",
        utm_campaign: "",
        event_name: "",
        revenue: null,
        currency: "",
        properties: "",
        lcp: null,
        cls: null,
        inp: null,
        fcp: null,
        ttfb: null,
      })),
      format: "JSONEachRow",
      clickhouse_settings: { async_insert: 0, wait_for_async_insert: 1 },
    });

    const res = await fetch(`${appUrl()}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: proSiteId, pathname: "/still-allowed" }),
    });

    // Pro users should not get 204 from quota enforcement
    expect(res.status).not.toBe(204);
  });
});

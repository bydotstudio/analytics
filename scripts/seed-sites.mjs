/**
 * Adds demo sites + realistic data for an existing user account.
 * Usage: bun scripts/seed-sites.mjs
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://analytics:localpassword@localhost:5432/analytics";

const USER_EMAIL = "emir@witharc.co";

const pool = new Pool({ connectionString: DATABASE_URL });

const SITES = [
  { name: "Arc",          domain: "witharc.co" },
  { name: "Analytics",    domain: "analytics.witharc.co" },
  { name: "Landing Page", domain: "arc.so" },
];

const PATHNAMES_BY_SITE = {
  "witharc.co":           ["/", "/features", "/pricing", "/docs", "/blog", "/blog/v2-release", "/changelog", "/contact"],
  "analytics.witharc.co": ["/", "/dashboard", "/settings", "/onboarding", "/onboarding/embed", "/onboarding/done"],
  "arc.so":               ["/", "/download", "/releases", "/community", "/blog", "/blog/new-tab", "/careers"],
};

const REFERRERS = ["", "google.com", "twitter.com", "github.com", "news.ycombinator.com", "reddit.com", "producthunt.com", "linear.app", "", "", ""];
const COUNTRIES = ["US", "US", "US", "GB", "DE", "FR", "NL", "CA", "AU", "SE", "JP", "BR", "IN"];
const DEVICES   = ["desktop", "desktop", "desktop", "mobile", "mobile", "tablet"];
const BROWSERS  = ["Chrome", "Chrome", "Safari", "Firefox", "Edge", "Safari"];
const OS_LIST   = ["macOS", "macOS", "Windows", "Linux", "iOS", "Android"];

const PERF_TIERS = [
  { lcp: [800, 1200],  cls: [0, 0.03],  inp: [50, 100],  fcp: [500, 900],   ttfb: [50, 100],  weight: 0.55 },
  { lcp: [2000, 3000], cls: [0.05, 0.12], inp: [150, 300], fcp: [1500, 2200], ttfb: [200, 500], weight: 0.35 },
  { lcp: [4000, 6000], cls: [0.2, 0.35], inp: [500, 800],  fcp: [3000, 4500], ttfb: [800, 1500], weight: 0.10 },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max)); }
function ago(days) { return new Date(Date.now() - days * 86_400_000 * Math.random()).toISOString(); }
function pickTier() {
  let r = Math.random(), c = 0;
  for (const t of PERF_TIERS) { c += t.weight; if (r < c) return t; }
  return PERF_TIERS[0];
}

const client = await pool.connect();

try {
  // Get user ID
  const { rows: userRows } = await client.query(
    `SELECT id FROM "user" WHERE email = $1`,
    [USER_EMAIL]
  );
  if (!userRows[0]) { console.error(`No user found with email ${USER_EMAIL}`); process.exit(1); }
  const userId = userRows[0].id;
  console.log(`Found user: ${userId}`);

  await client.query("BEGIN");

  let totalViews = 0, totalEvents = 0, totalPerf = 0;

  for (const site of SITES) {
    const siteId = randomUUID();
    const pathnames = PATHNAMES_BY_SITE[site.domain];

    // Insert site (skip if domain already exists)
    const { rows: inserted } = await client.query(
      `INSERT INTO sites (id, user_id, name, domain)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [siteId, userId, site.name, site.domain]
    );
    const actualSiteId = inserted[0].id;

    const sessions = [];
    const sessionCount = randInt(80, 150);

    // Page views
    for (let s = 0; s < sessionCount; s++) {
      const sessionId = randomUUID();
      const country  = pick(COUNTRIES);
      const device   = pick(DEVICES);
      const browser  = pick(BROWSERS);
      const os       = pick(OS_LIST);
      const referrer = pick(REFERRERS);
      const daysAgo  = Math.random() * 30;
      const pages    = [];
      const viewCount = randInt(1, 7);

      for (let v = 0; v < viewCount; v++) {
        const pathname = pick(pathnames);
        await client.query(
          `INSERT INTO page_views (site_id, session_id, pathname, referrer, country, device_type, browser, os, timestamp)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [actualSiteId, sessionId, pathname, v === 0 ? referrer : "", country, device, browser, os, ago(daysAgo)]
        );
        pages.push(pathname);
        totalViews++;
      }
      sessions.push({ sessionId, daysAgo, pages });
    }

    // Custom events + revenue (~30% of sessions)
    const events = [
      { name: "signup",         revenue: null },
      { name: "upgrade",        revenue: () => pick([5, 12, 25, 49]) },
      { name: "purchase",       revenue: () => pick([9.99, 19.99, 49.99]) },
      { name: "trial_started",  revenue: null },
      { name: "invite_sent",    revenue: null },
    ];
    for (const s of sessions) {
      if (Math.random() > 0.3) continue;
      const ev = pick(events);
      const rev = ev.revenue ? ev.revenue() : null;
      await client.query(
        `INSERT INTO custom_events (site_id, session_id, name, revenue, currency, pathname, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [actualSiteId, s.sessionId, ev.name, rev, rev ? "USD" : null, pick(s.pages), ago(s.daysAgo)]
      );
      totalEvents++;
    }

    // Performance metrics (~65% of sessions)
    for (const s of sessions) {
      if (Math.random() > 0.65) continue;
      const t = pickTier();
      await client.query(
        `INSERT INTO performance_metrics (site_id, session_id, pathname, lcp, cls, inp, fcp, ttfb, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [actualSiteId, s.sessionId, pick(s.pages), rand(...t.lcp), rand(...t.cls), rand(...t.inp), rand(...t.fcp), rand(...t.ttfb), ago(s.daysAgo)]
      );
      totalPerf++;
    }

    // Funnel
    const funnelId = randomUUID();
    await client.query(
      `INSERT INTO funnels (id, site_id, name) VALUES ($1,$2,$3)`,
      [funnelId, actualSiteId, "Main conversion"]
    );
    const funnelSteps = [pathnames[0], pathnames[2] ?? pathnames[1], pathnames[pathnames.length - 1]];
    for (let i = 0; i < funnelSteps.length; i++) {
      await client.query(
        `INSERT INTO funnel_steps (funnel_id, step_order, pathname) VALUES ($1,$2,$3)`,
        [funnelId, i + 1, funnelSteps[i]]
      );
    }

    console.log(`  ✓ ${site.name} (${site.domain}) — ${sessions.length} sessions`);
  }

  await client.query("COMMIT");

  console.log("\n✓ Done");
  console.log(`  Page views:   ${totalViews}`);
  console.log(`  Events:       ${totalEvents}`);
  console.log(`  Perf samples: ${totalPerf}`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Failed:", err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}

/**
 * Seed script for local development.
 *
 * Creates a demo user, a demo site, and realistic data across all tables:
 * page_views, custom_events, identified_sessions, performance_metrics, funnels.
 *
 * Usage:
 *   bun scripts/seed.mjs
 *   # or: DATABASE_URL=postgres://... bun scripts/seed.mjs
 *
 * Safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING.
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://analytics:localpassword@localhost:5432/analytics";

const pool = new Pool({ connectionString: DATABASE_URL });

// ── Config ────────────────────────────────────────────────────

const DEMO_USER = {
  id: "seed-user-01",
  name: "Demo User",
  email: "demo@example.com",
  // password: "password123" — bcrypt hash (cost 10)
  passwordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
};

const DEMO_SITE = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  name: "My Website",
  domain: "example.com",
};

const PATHNAMES = ["/", "/about", "/pricing", "/blog", "/blog/getting-started", "/blog/analytics-tips", "/docs", "/contact"];
const REFERRERS = ["", "google.com", "twitter.com", "github.com", "news.ycombinator.com", "reddit.com", "dev.to", "", "", ""];
const COUNTRIES = ["US", "GB", "DE", "FR", "NL", "CA", "AU", "SE", "NO", "JP"];
const DEVICES   = ["desktop", "desktop", "desktop", "mobile", "mobile", "tablet"];
const BROWSERS  = ["Chrome", "Chrome", "Firefox", "Safari", "Edge"];
const OS_LIST   = ["Windows", "macOS", "macOS", "Linux", "iOS", "Android"];

// Realistic Web Vitals ranges per "quality" tier
const PERF_TIERS = [
  // Fast pages (A+)
  { lcp: [800, 1200],  cls: [0, 0.03],  inp: [50, 100],   fcp: [500, 900],   ttfb: [50, 100],  weight: 0.5 },
  // OK pages (B/C)
  { lcp: [2000, 3500], cls: [0.05, 0.15], inp: [150, 350], fcp: [1500, 2500], ttfb: [200, 600], weight: 0.35 },
  // Slow pages (D/F)
  { lcp: [4500, 7000], cls: [0.2, 0.4],  inp: [500, 900],  fcp: [3000, 5000], ttfb: [800, 2000], weight: 0.15 },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max));
}

function randomTimestamp(daysAgo) {
  const ms = Date.now() - daysAgo * 86_400_000 * Math.random();
  return new Date(ms).toISOString();
}

function pickTier() {
  const r = Math.random();
  let cumulative = 0;
  for (const tier of PERF_TIERS) {
    cumulative += tier.weight;
    if (r < cumulative) return tier;
  }
  return PERF_TIERS[0];
}

// ── Main ──────────────────────────────────────────────────────

const client = await pool.connect();

try {
  await client.query("BEGIN");

  // 1. User
  await client.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", plan)
     VALUES ($1, $2, $3, TRUE, 'pro')
     ON CONFLICT (id) DO NOTHING`,
    [DEMO_USER.id, DEMO_USER.name, DEMO_USER.email]
  );

  // 2. Account (email/password credential)
  await client.query(
    `INSERT INTO account (id, "accountId", "providerId", "userId", password)
     VALUES ($1, $2, 'credential', $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    ["seed-account-01", DEMO_USER.email, DEMO_USER.id, DEMO_USER.passwordHash]
  );

  // 3. Site
  await client.query(
    `INSERT INTO sites (id, user_id, name, domain)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [DEMO_SITE.id, DEMO_USER.id, DEMO_SITE.name, DEMO_SITE.domain]
  );

  // 4. Page views (last 30 days, ~300 views across ~80 sessions)
  const sessions = [];
  let pageViewCount = 0;

  for (let s = 0; s < 80; s++) {
    const sessionId = randomUUID();
    const country   = pick(COUNTRIES);
    const device    = pick(DEVICES);
    const browser   = pick(BROWSERS);
    const os        = pick(OS_LIST);
    const referrer  = pick(REFERRERS);
    const daysAgo   = Math.random() * 30;
    const viewCount = randInt(1, 6);
    const pages     = [];

    for (let v = 0; v < viewCount; v++) {
      const pathname = pick(PATHNAMES);
      await client.query(
        `INSERT INTO page_views
           (site_id, session_id, pathname, referrer, country, device_type, browser, os, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          DEMO_SITE.id,
          sessionId,
          pathname,
          v === 0 ? referrer : "",
          country,
          device,
          browser,
          os,
          randomTimestamp(daysAgo),
        ]
      );
      pages.push(pathname);
      pageViewCount++;
    }

    sessions.push({ sessionId, country, device, browser, os, daysAgo, pages });
  }

  // 5. Custom events + revenue (on ~30% of sessions)
  let eventCount = 0;
  const revenueEvents = [
    { name: "purchase",  revenue: () => pick([9.99, 19.99, 49.99, 99.99]) },
    { name: "upgrade",   revenue: () => pick([5, 12, 25]) },
    { name: "signup",    revenue: null },
    { name: "add_to_cart", revenue: null },
    { name: "checkout_start", revenue: null },
  ];

  for (const session of sessions) {
    if (Math.random() > 0.35) continue;
    const event = pick(revenueEvents);
    const revenue = event.revenue ? event.revenue() : null;
    await client.query(
      `INSERT INTO custom_events (site_id, session_id, name, revenue, currency, pathname, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        DEMO_SITE.id,
        session.sessionId,
        event.name,
        revenue,
        revenue ? "USD" : null,
        pick(session.pages),
        randomTimestamp(session.daysAgo),
      ]
    );
    eventCount++;
  }

  // 6. Identified sessions (~20% of sessions)
  const DEMO_USERS = [
    { id: "usr_001", name: "Alice Johnson", email: "alice@acme.com", plan: "pro" },
    { id: "usr_002", name: "Bob Smith",     email: "bob@startup.io", plan: "free" },
    { id: "usr_003", name: "Carol White",   email: "carol@example.org", plan: "pro" },
    { id: "usr_004", name: "Dave Brown",    email: "dave@agency.com", plan: "pro" },
    { id: "usr_005", name: "Eve Davis",     email: "eve@corp.co", plan: "free" },
  ];

  let identifiedCount = 0;
  for (const session of sessions) {
    if (Math.random() > 0.2) continue;
    const user = pick(DEMO_USERS);
    await client.query(
      `INSERT INTO identified_sessions (site_id, session_id, external_user_id, traits)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (site_id, session_id) DO NOTHING`,
      [
        DEMO_SITE.id,
        session.sessionId,
        user.id,
        JSON.stringify({ name: user.name, email: user.email, plan: user.plan }),
      ]
    );
    identifiedCount++;
  }

  // 7. Performance metrics (~70% of sessions)
  let perfCount = 0;
  for (const session of sessions) {
    if (Math.random() > 0.7) continue;
    const tier = pickTier();
    await client.query(
      `INSERT INTO performance_metrics (site_id, session_id, pathname, lcp, cls, inp, fcp, ttfb, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        DEMO_SITE.id,
        session.sessionId,
        pick(session.pages),
        rand(...tier.lcp),
        rand(...tier.cls),
        rand(...tier.inp),
        rand(...tier.fcp),
        rand(...tier.ttfb),
        randomTimestamp(session.daysAgo),
      ]
    );
    perfCount++;
  }

  // 8. Funnels (2 demo funnels)
  const FUNNELS = [
    {
      id: "f1111111-1111-1111-1111-111111111111",
      name: "Blog to Pricing",
      steps: [
        { order: 1, pathname: "/blog", label: "Blog" },
        { order: 2, pathname: "/pricing", label: "Pricing" },
        { order: 3, pathname: "/contact", label: "Contact" },
      ],
    },
    {
      id: "f2222222-2222-2222-2222-222222222222",
      name: "Docs Onboarding",
      steps: [
        { order: 1, pathname: "/", label: "Home" },
        { order: 2, pathname: "/docs", label: "Docs" },
        { order: 3, pathname: "/about", label: "About" },
        { order: 4, pathname: "/pricing", label: "Pricing" },
      ],
    },
  ];

  for (const funnel of FUNNELS) {
    await client.query(
      `INSERT INTO funnels (id, site_id, name) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      [funnel.id, DEMO_SITE.id, funnel.name]
    );
    for (const step of funnel.steps) {
      await client.query(
        `INSERT INTO funnel_steps (funnel_id, step_order, pathname, label)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [funnel.id, step.order, step.pathname, step.label]
      );
    }
  }

  await client.query("COMMIT");

  console.log("✓ Seed complete");
  console.log(`  Login:        ${DEMO_USER.email}  /  password123`);
  console.log(`  Site ID:      ${DEMO_SITE.id}`);
  console.log(`  Page views:   ${pageViewCount}`);
  console.log(`  Events:       ${eventCount}`);
  console.log(`  Identified:   ${identifiedCount} sessions`);
  console.log(`  Perf samples: ${perfCount}`);
  console.log(`  Funnels:      ${FUNNELS.length}`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Seed failed:", err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}

/**
 * Seed script for local development.
 *
 * Creates a demo user, a demo site, and a batch of realistic page_views
 * so the dashboard has data to show immediately.
 *
 * Usage:
 *   bun scripts/seed.mjs
 *   # or: DATABASE_URL=postgres://... bun scripts/seed.mjs
 *
 * Safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING.
 */

import { Pool } from "pg";
import { createHash, randomUUID } from "crypto";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:localpassword@localhost:5432/analytics";

const pool = new Pool({ connectionString: DATABASE_URL });

// ── Seed config ──────────────────────────────────────────────
const DEMO_USER = {
  id: "seed-user-01",
  name: "Demo User",
  email: "demo@example.com",
  // password: "password123"  — bcrypt hash (cost 10)
  passwordHash:
    "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
};

const DEMO_SITE = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  name: "My Website",
  domain: "example.com",
};

const PATHNAMES = [
  "/",
  "/about",
  "/pricing",
  "/blog",
  "/blog/getting-started",
  "/blog/analytics-tips",
  "/docs",
  "/contact",
];

const REFERRERS = [
  "",
  "https://google.com",
  "https://twitter.com",
  "https://github.com",
  "https://hn.algolia.com",
  "https://reddit.com/r/webdev",
  "https://dev.to",
  "",
  "",
  "",
];

const COUNTRIES = ["US", "GB", "DE", "FR", "NL", "CA", "AU", "SE", "NO", "JP"];
const DEVICES   = ["desktop", "mobile", "tablet"];
const BROWSERS  = ["Chrome", "Firefox", "Safari", "Edge"];
const OS_LIST   = ["Windows", "macOS", "Linux", "iOS", "Android"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTimestamp(daysAgo) {
  const ms = Date.now() - daysAgo * 86_400_000 * Math.random();
  return new Date(ms).toISOString();
}

// ── Main ─────────────────────────────────────────────────────
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
  const accountId = "seed-account-01";
  await client.query(
    `INSERT INTO account (id, "accountId", "providerId", "userId", password)
     VALUES ($1, $2, 'credential', $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [accountId, DEMO_USER.email, DEMO_USER.id, DEMO_USER.passwordHash]
  );

  // 3. Site
  await client.query(
    `INSERT INTO sites (id, user_id, name, domain)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [DEMO_SITE.id, DEMO_USER.id, DEMO_SITE.name, DEMO_SITE.domain]
  );

  // 4. Page views (last 30 days, ~300 views across ~60 sessions)
  const SESSION_COUNT = 60;
  const VIEWS_PER_SESSION = 5;
  let inserted = 0;

  for (let s = 0; s < SESSION_COUNT; s++) {
    const sessionId = randomUUID();
    const country   = pick(COUNTRIES);
    const device    = pick(DEVICES);
    const browser   = pick(BROWSERS);
    const os        = pick(OS_LIST);
    const referrer  = pick(REFERRERS);
    const daysAgo   = Math.random() * 30;

    const viewCount = Math.ceil(Math.random() * VIEWS_PER_SESSION);
    for (let v = 0; v < viewCount; v++) {
      await client.query(
        `INSERT INTO page_views
           (site_id, session_id, pathname, referrer, country, device_type, browser, os, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          DEMO_SITE.id,
          sessionId,
          pick(PATHNAMES),
          v === 0 ? referrer : "",   // only first page in session carries referrer
          country,
          device,
          browser,
          os,
          randomTimestamp(daysAgo),
        ]
      );
      inserted++;
    }
  }

  await client.query("COMMIT");

  console.log("✓ Seed complete");
  console.log(`  User:       ${DEMO_USER.email}  /  password123`);
  console.log(`  Site ID:    ${DEMO_SITE.id}`);
  console.log(`  Site:       ${DEMO_SITE.name} (${DEMO_SITE.domain})`);
  console.log(`  Page views: ${inserted}`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Seed failed:", err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}

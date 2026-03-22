// Seed realistic analytics data into ClickHouse for local development.
// Usage: npx tsx scripts/seed-clickhouse.ts
import { createClient } from "@clickhouse/client";

const ch = createClient({
  url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
  database: process.env.CLICKHOUSE_DB ?? "analytics",
  clickhouse_settings: { async_insert: 0, wait_for_async_insert: 1 },
});

const SITES = [
  { id: "dfdd5933-1f58-4701-b3eb-d4be6b48ccd3", domain: "witharc.co" },
  { id: "3e347656-9a79-4bd2-99a1-645a4228e336", domain: "analytics.witharc.co" },
  { id: "1b865ef1-c8ef-4e59-99c2-93dd2169c633", domain: "arc.so" },
];

const PAGES: Record<string, string[]> = {
  "witharc.co":              ["/", "/pricing", "/features", "/blog", "/about", "/docs", "/changelog"],
  "analytics.witharc.co":    ["/", "/dashboard", "/settings", "/docs/quickstart", "/docs/api"],
  "arc.so":                  ["/", "/download", "/releases", "/company", "/blog", "/jobs"],
};

const REFERRERS = ["twitter.com", "github.com", "producthunt.com", "hackernews.com", "google.com", "linkedin.com", ""];
const COUNTRIES  = ["US", "GB", "DE", "FR", "CA", "AU", "NL", "JP", "BR", "IN", "SG", "SE"];
const BROWSERS   = ["Chrome", "Safari", "Firefox", "Edge", "Arc"];
const OS_LIST    = ["Windows", "macOS", "Linux", "iOS", "Android"];
const DEVICES    = ["desktop", "mobile", "tablet"] as const;
const UTM_SRC    = ["twitter", "newsletter", "producthunt", "google", "github", ""];
const UTM_MED    = ["social", "email", "cpc", "referral", ""];
const UTM_CMP    = ["launch", "beta", "q1-2026", "organic", ""];

const WEIGHTS = { desktop: 0.6, mobile: 0.35, tablet: 0.05 };

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number) { return Math.random() * (max - min) + min; }
function randDevice(): typeof DEVICES[number] {
  const r = Math.random();
  return r < WEIGHTS.desktop ? "desktop" : r < WEIGHTS.desktop + WEIGHTS.mobile ? "mobile" : "tablet";
}

function fmtTs(d: Date) {
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

function randomDate(daysAgo: number): Date {
  const ms = Date.now() - Math.random() * daysAgo * 86400_000;
  return new Date(ms);
}

async function main() {
const events: object[] = [];
let totalPageviews = 0;
let totalCustom = 0;

for (const site of SITES) {
  const pages = PAGES[site.domain] ?? ["/"];

  // ~150 unique visitors over last 30 days, ~4 pageviews each
  const visitorCount = randInt(120, 200);

  for (let v = 0; v < visitorCount; v++) {
    const visitorHash = Math.random().toString(36).slice(2, 18);
    const sessionId   = Math.random().toString(36).slice(2, 18);
    const device      = randDevice();
    const browser     = rand(BROWSERS);
    const os          = rand(OS_LIST);
    const country     = rand(COUNTRIES);
    const referrer    = rand(REFERRERS);
    const utmSrc      = rand(UTM_SRC);
    const utmMed      = utmSrc ? rand(UTM_MED) : "";
    const utmCmp      = utmSrc ? rand(UTM_CMP) : "";

    const pagesVisited = randInt(1, 5);
    const sessionStart = randomDate(30);

    for (let p = 0; p < pagesVisited; p++) {
      const ts = new Date(sessionStart.getTime() + p * randInt(10_000, 120_000));
      events.push({
        timestamp:    fmtTs(ts),
        site_id:      site.id,
        event_type:   "pageview",
        session_id:   sessionId,
        visitor_hash: visitorHash,
        pathname:     rand(pages),
        referrer:     p === 0 ? referrer : "",
        country,
        browser,
        os,
        device,
        utm_source:   p === 0 ? utmSrc : "",
        utm_medium:   p === 0 ? utmMed : "",
        utm_campaign: p === 0 ? utmCmp : "",
        event_name:   "",
        revenue:      null,
        currency:     "",
        properties:   "",
        lcp:          device === "mobile" ? randFloat(1800, 4000) : randFloat(800, 2500),
        cls:          randFloat(0, 0.3),
        inp:          randFloat(50, 400),
        fcp:          device === "mobile" ? randFloat(1200, 3000) : randFloat(600, 1800),
        ttfb:         randFloat(80, 600),
      });
      totalPageviews++;
    }

    // ~20% of visitors trigger a custom event (signup / purchase)
    if (Math.random() < 0.2 && site.domain !== "analytics.witharc.co") {
      const customTs = new Date(sessionStart.getTime() + randInt(30_000, 300_000));
      const isRevenue = Math.random() < 0.4;
      events.push({
        timestamp:    fmtTs(customTs),
        site_id:      site.id,
        event_type:   "custom",
        session_id:   sessionId,
        visitor_hash: visitorHash,
        pathname:     rand(pages),
        referrer:     "",
        country,
        browser,
        os,
        device,
        utm_source:   utmSrc,
        utm_medium:   utmMed,
        utm_campaign: utmCmp,
        event_name:   isRevenue ? "purchase" : "signup",
        revenue:      isRevenue ? Math.round(randFloat(9, 99) * 100) / 100 : null,
        currency:     isRevenue ? "USD" : "",
        properties:   "",
        lcp: null, cls: null, inp: null, fcp: null, ttfb: null,
      });
      totalCustom++;
    }
  }
}

// Insert in batches of 1000
const BATCH = 1000;
for (let i = 0; i < events.length; i += BATCH) {
  await ch.insert({
    table: "analytics.events",
    values: events.slice(i, i + BATCH),
    format: "JSONEachRow",
  });
  process.stdout.write(`\r  Inserting... ${Math.min(i + BATCH, events.length)}/${events.length}`);
}

console.log(`\n✓ Seeded ${totalPageviews} pageviews + ${totalCustom} custom events across ${SITES.length} sites`);
await ch.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

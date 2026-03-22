import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UAParser } from "ua-parser-js";
import { pool } from "@/lib/db";
import { ch } from "@/lib/clickhouse";
import { computeVisitorHash, getClientIp } from "@/lib/visitor";

const BOT_REGEX =
  /bot|crawl|slurp|spider|mediapartners|headless|lighthouse|prerender|wget|curl/i;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const trackSchema = z.object({
  siteId: z.string().uuid(),
  pathname: z.string().max(500),
  referrer: z.string().max(500).optional(),
  sessionId: z.string().max(100).optional(),
  // UTM params passed by tracker.js
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  // Behavioral signals
  type: z.enum(["pageview", "rage_click", "dead_click"]).optional(),
});

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: CORS_HEADERS });
  }

  const {
    siteId,
    sessionId,
    utm_source,
    utm_medium,
    utm_campaign,
    type = "pageview",
  } = parsed.data;
  let { pathname, referrer } = parsed.data;

  // Verify site exists
  const { rows } = await pool.query<{ id: string; domain: string; user_id: string }>(
    "SELECT id, domain, user_id FROM sites WHERE id = $1",
    [siteId]
  );
  const site = rows[0];
  if (!site) return new Response(null, { status: 204, headers: CORS_HEADERS });

  // Bot check
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT_REGEX.test(ua)) return new Response(null, { status: 204, headers: CORS_HEADERS });

  // Parse UA
  const parser = new UAParser(ua);
  const browser = parser.getBrowser().name ?? "";
  const os = parser.getOS().name ?? "";
  const deviceType = (() => {
    const t = parser.getDevice().type;
    if (t === "mobile") return "mobile";
    if (t === "tablet") return "tablet";
    return "desktop";
  })();

  // Country from hosting/proxy headers
  const country =
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-country") ??
    "";

  // Sanitize pathname
  try {
    const url = new URL(pathname, "https://x");
    pathname = url.pathname.slice(0, 500);
  } catch {
    pathname = "/";
  }

  // Sanitize referrer — strip own domain, keep hostname only
  if (referrer) {
    try {
      const ref = new URL(referrer);
      const ownDomain = site.domain.replace(/^https?:\/\//, "").split("/")[0];
      referrer = ref.hostname === ownDomain ? undefined : ref.hostname;
    } catch {
      referrer = undefined;
    }
  }

  // Compute server-side visitor hash (cookieless, no PII stored)
  const ip = getClientIp(req.headers);
  const salt = process.env.VISITOR_HASH_SALT ?? "default-salt";
  const visitorHash = computeVisitorHash(ip, ua, salt);

  // Rate limit: 20k events/month for free plan, 1M for pro.
  // Fast check against Postgres which already has the counters in aggregate.
  const { rows: usageRows } = await pool.query<{ count: string }>(
    `SELECT (
      (SELECT COUNT(*) FROM page_views pv JOIN sites s ON s.id = pv.site_id WHERE s.user_id = $1 AND pv.timestamp >= date_trunc('month', now()))
      +
      (SELECT COUNT(*) FROM custom_events ce JOIN sites s ON s.id = ce.site_id WHERE s.user_id = $1 AND ce.timestamp >= date_trunc('month', now()))
    ) AS count`,
    [site.user_id]
  );
  if (parseInt(usageRows[0].count) >= 20000) {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Write to Postgres (for rate-limit counting & billing — stays synchronous)
  await pool.query(
    `INSERT INTO page_views (site_id, session_id, pathname, referrer, country, device_type, browser, os)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [siteId, sessionId ?? "unknown", pathname, referrer ?? null, country || null, deviceType, browser, os]
  );

  // Write to ClickHouse asynchronously after response is sent
  const eventRow = {
    timestamp: new Date().toISOString().replace("T", " ").replace("Z", ""),
    site_id: siteId,
    event_type: type,
    session_id: sessionId ?? "unknown",
    visitor_hash: visitorHash,
    pathname,
    referrer: referrer ?? "",
    country,
    browser,
    os,
    device: deviceType,
    utm_source: utm_source ?? "",
    utm_medium: utm_medium ?? "",
    utm_campaign: utm_campaign ?? "",
    event_name: "",
    revenue: null,
    currency: "",
    properties: "",
    lcp: null,
    cls: null,
    inp: null,
    fcp: null,
    ttfb: null,
  };

  after(async () => {
    try {
      await ch.insert({
        table: "analytics.events",
        values: [eventRow],
        format: "JSONEachRow",
      });
    } catch {
      // Non-critical — Postgres write already succeeded
    }
  });

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}

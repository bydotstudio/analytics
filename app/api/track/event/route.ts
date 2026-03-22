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

const schema = z.object({
  siteId: z.string().uuid(),
  sessionId: z.string().max(100).optional(),
  name: z.string().min(1).max(100),
  pathname: z.string().max(500).optional(),
  revenue: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: CORS_HEADERS });
  }

  const {
    siteId,
    sessionId,
    name,
    revenue,
    currency,
    properties,
    utm_source,
    utm_medium,
    utm_campaign,
  } = parsed.data;
  let { pathname } = parsed.data;

  // Verify site exists
  const { rows } = await pool.query<{ user_id: string }>(
    "SELECT user_id FROM sites WHERE id = $1",
    [siteId]
  );
  const site = rows[0];
  if (!site) return new Response(null, { status: 204, headers: CORS_HEADERS });

  // Bot check
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT_REGEX.test(ua)) return new Response(null, { status: 204, headers: CORS_HEADERS });

  // Sanitize pathname
  if (pathname) {
    try {
      pathname = new URL(pathname, "https://x").pathname.slice(0, 500);
    } catch {
      pathname = undefined;
    }
  }

  // Usage limit
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

  // Write to Postgres for rate-limit counting
  await pool.query(
    `INSERT INTO custom_events (site_id, session_id, name, revenue, currency, properties, pathname)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      siteId,
      sessionId ?? "unknown",
      name,
      revenue ?? null,
      currency ?? null,
      properties ? JSON.stringify(properties) : null,
      pathname ?? null,
    ]
  );

  // Compute visitor hash for ClickHouse row
  const ip = getClientIp(req.headers);
  const salt = process.env.VISITOR_HASH_SALT ?? "default-salt";
  const visitorHash = computeVisitorHash(ip, ua, salt);

  const parser = new UAParser(ua);
  const country =
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-country") ??
    "";

  after(async () => {
    try {
      await ch.insert({
        table: "analytics.events",
        values: [
          {
            timestamp: new Date().toISOString().replace("T", " ").replace("Z", ""),
            site_id: siteId,
            event_type: "custom",
            session_id: sessionId ?? "unknown",
            visitor_hash: visitorHash,
            pathname: pathname ?? "",
            referrer: "",
            country,
            browser: parser.getBrowser().name ?? "",
            os: parser.getOS().name ?? "",
            device: (() => {
              const t = parser.getDevice().type;
              if (t === "mobile") return "mobile";
              if (t === "tablet") return "tablet";
              return "desktop";
            })(),
            utm_source: utm_source ?? "",
            utm_medium: utm_medium ?? "",
            utm_campaign: utm_campaign ?? "",
            event_name: name,
            revenue: revenue ?? null,
            currency: currency ?? "",
            properties: properties ? JSON.stringify(properties) : "",
            lcp: null,
            cls: null,
            inp: null,
            fcp: null,
            ttfb: null,
          },
        ],
        format: "JSONEachRow",
      });
    } catch {
      // Non-critical
    }
  });

  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

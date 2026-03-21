import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UAParser } from "ua-parser-js";
import { pool } from "@/lib/db";

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

  const { siteId, sessionId } = parsed.data;
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
  const browser = parser.getBrowser().name ?? null;
  const os = parser.getOS().name ?? null;
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
    null;

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

  // Event limit: 20k events per month across all user's sites
  const { rows: usageRows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM page_views pv
     JOIN sites s ON s.id = pv.site_id
     WHERE s.user_id = $1 AND pv.timestamp >= date_trunc('month', now())`,
    [site.user_id]
  );
  if (parseInt(usageRows[0].count) >= 20000) {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  await pool.query(
    `INSERT INTO page_views (site_id, session_id, pathname, referrer, country, device_type, browser, os)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [siteId, sessionId ?? "unknown", pathname, referrer ?? null, country, deviceType, browser, os]
  );

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}

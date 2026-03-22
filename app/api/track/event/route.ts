import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

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

  const { siteId, sessionId, name, revenue, currency, properties } = parsed.data;
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

  // Usage limit: 20k events/month (page_views + custom_events combined)
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

  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { ch } from "@/lib/clickhouse";
import { computeVisitorHash, getClientIp } from "@/lib/visitor";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const metric = z.number().min(0).max(60000).nullable().optional();

const schema = z.object({
  siteId: z.string().uuid(),
  sessionId: z.string().max(100).optional(),
  pathname: z.string().max(500),
  lcp: metric,
  cls: z.number().min(0).max(10).nullable().optional(),
  inp: metric,
  fcp: metric,
  ttfb: metric,
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

  const { siteId, sessionId, lcp, cls, inp, fcp, ttfb } = parsed.data;
  let { pathname } = parsed.data;

  // Verify site exists
  const { rows } = await pool.query("SELECT id FROM sites WHERE id = $1", [siteId]);
  if (!rows[0]) return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    pathname = new URL(pathname, "https://x").pathname.slice(0, 500);
  } catch {
    pathname = "/";
  }

  // Write to Postgres for backwards compat with existing performance queries
  await pool.query(
    `INSERT INTO performance_metrics (site_id, session_id, pathname, lcp, cls, inp, fcp, ttfb)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [siteId, sessionId ?? "unknown", pathname, lcp ?? null, cls ?? null, inp ?? null, fcp ?? null, ttfb ?? null]
  );

  const ua = req.headers.get("user-agent") ?? "";
  const ip = getClientIp(req.headers);
  const salt = process.env.VISITOR_HASH_SALT ?? "default-salt";
  const visitorHash = computeVisitorHash(ip, ua, salt);
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
            event_type: "perf",
            session_id: sessionId ?? "unknown",
            visitor_hash: visitorHash,
            pathname,
            referrer: "",
            country,
            browser: "",
            os: "",
            device: "",
            utm_source: "",
            utm_medium: "",
            utm_campaign: "",
            event_name: "",
            revenue: null,
            currency: "",
            properties: "",
            lcp: lcp ?? null,
            cls: cls ?? null,
            inp: inp ?? null,
            fcp: fcp ?? null,
            ttfb: ttfb ?? null,
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

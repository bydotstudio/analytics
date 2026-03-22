import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

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

  const { siteId, sessionId, pathname, lcp, cls, inp, fcp, ttfb } = parsed.data;

  // Verify site exists
  const { rows } = await pool.query("SELECT id FROM sites WHERE id = $1", [siteId]);
  if (!rows[0]) return new Response(null, { status: 204, headers: CORS_HEADERS });

  let sanitizedPathname = pathname;
  try {
    sanitizedPathname = new URL(pathname, "https://x").pathname.slice(0, 500);
  } catch {
    sanitizedPathname = "/";
  }

  await pool.query(
    `INSERT INTO performance_metrics (site_id, session_id, pathname, lcp, cls, inp, fcp, ttfb)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [siteId, sessionId ?? "unknown", sanitizedPathname, lcp ?? null, cls ?? null, inp ?? null, fcp ?? null, ttfb ?? null]
  );

  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

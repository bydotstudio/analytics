import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);

  const { rows: sites } = await pool.query(
    "SELECT id FROM sites WHERE id = $1 AND user_id = $2",
    [siteId, session.user.id]
  );
  if (!sites[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rows } = await pool.query<{
    session_id: string;
    country: string | null;
    device_type: string | null;
    browser: string | null;
    os: string | null;
    page_count: string;
    started_at: string;
    ended_at: string;
    duration_seconds: string;
    external_user_id: string | null;
    traits: unknown;
  }>(
    `SELECT
      pv.session_id,
      MAX(pv.country) AS country,
      MAX(pv.device_type) AS device_type,
      MAX(pv.browser) AS browser,
      MAX(pv.os) AS os,
      COUNT(*) AS page_count,
      MIN(pv.timestamp) AS started_at,
      MAX(pv.timestamp) AS ended_at,
      EXTRACT(EPOCH FROM (MAX(pv.timestamp) - MIN(pv.timestamp))) AS duration_seconds,
      ids.external_user_id,
      ids.traits
     FROM page_views pv
     LEFT JOIN identified_sessions ids
            ON ids.site_id = pv.site_id AND ids.session_id = pv.session_id
     WHERE pv.site_id = $1
       AND pv.timestamp >= now() - interval '7 days'
     GROUP BY pv.session_id, ids.external_user_id, ids.traits
     ORDER BY started_at DESC
     LIMIT $2`,
    [siteId, limit]
  );

  return NextResponse.json(
    rows.map((r) => ({
      session_id: r.session_id,
      country: r.country,
      device_type: r.device_type,
      browser: r.browser,
      os: r.os,
      page_count: Number(r.page_count),
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_seconds: Number(r.duration_seconds),
      external_user_id: r.external_user_id,
      traits: r.traits,
    }))
  );
}

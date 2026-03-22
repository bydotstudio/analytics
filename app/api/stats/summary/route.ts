import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const { rows: sites } = await pool.query(
    "SELECT id FROM sites WHERE id = $1 AND user_id = $2",
    [siteId, session.user.id]
  );
  if (!sites[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rows } = await pool.query(
    `SELECT
      COUNT(DISTINCT session_id) FILTER (WHERE timestamp >= date_trunc('day', now())) AS today,
      COUNT(DISTINCT session_id) FILTER (WHERE timestamp >= now() - interval '7 days')  AS last_7d,
      COUNT(DISTINCT session_id) FILTER (WHERE timestamp >= now() - interval '30 days') AS last_30d,
      (SELECT country FROM page_views
       WHERE site_id = $1 AND timestamp >= now() - interval '30 days' AND country IS NOT NULL
       GROUP BY country ORDER BY COUNT(*) DESC LIMIT 1) AS top_country,
      (SELECT referrer FROM page_views
       WHERE site_id = $1 AND timestamp >= now() - interval '30 days' AND referrer IS NOT NULL AND referrer != ''
       GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) AS top_referrer
     FROM page_views
     WHERE site_id = $1 AND timestamp >= now() - interval '30 days'`,
    [siteId]
  );
  const row = rows[0] ?? { today: 0, last_7d: 0, last_30d: 0, top_country: null, top_referrer: null };
  return NextResponse.json({
    today: Number(row.today),
    last_7d: Number(row.last_7d),
    last_30d: Number(row.last_30d),
    top_country: row.top_country ?? null,
    top_referrer: row.top_referrer ?? null,
  });
}

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

  const { rows: summary } = await pool.query<{
    total_revenue: string;
    total_conversions: string;
    unique_converters: string;
  }>(
    `SELECT
      COALESCE(SUM(revenue), 0) AS total_revenue,
      COUNT(*) AS total_conversions,
      COUNT(DISTINCT session_id) AS unique_converters
     FROM custom_events
     WHERE site_id = $1
       AND revenue IS NOT NULL
       AND timestamp >= now() - interval '30 days'`,
    [siteId]
  );

  const { rows: topEvents } = await pool.query<{
    name: string;
    count: string;
    revenue: string;
  }>(
    `SELECT name, COUNT(*) AS count, COALESCE(SUM(revenue), 0) AS revenue
     FROM custom_events
     WHERE site_id = $1 AND timestamp >= now() - interval '30 days'
     GROUP BY name
     ORDER BY count DESC
     LIMIT 10`,
    [siteId]
  );

  const { rows: topPages } = await pool.query<{
    label: string;
    conversions: string;
    revenue: string;
  }>(
    `SELECT
      COALESCE(pathname, 'unknown') AS label,
      COUNT(*) AS conversions,
      COALESCE(SUM(revenue), 0) AS revenue
     FROM custom_events
     WHERE site_id = $1
       AND revenue IS NOT NULL
       AND timestamp >= now() - interval '30 days'
     GROUP BY pathname
     ORDER BY revenue DESC
     LIMIT 20`,
    [siteId]
  );

  const s = summary[0] ?? { total_revenue: "0", total_conversions: "0", unique_converters: "0" };

  return NextResponse.json({
    total_revenue: Number(s.total_revenue),
    total_conversions: Number(s.total_conversions),
    unique_converters: Number(s.unique_converters),
    top_events: topEvents.map((r) => ({
      name: r.name,
      count: Number(r.count),
      revenue: Number(r.revenue),
    })),
    top_pages: topPages.map((r) => ({
      label: r.label,
      conversions: Number(r.conversions),
      revenue: Number(r.revenue),
    })),
  });
}

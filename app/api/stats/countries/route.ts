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
    `SELECT COALESCE(country, 'Unknown') AS label, COUNT(DISTINCT session_id) AS visitors
     FROM page_views
     WHERE site_id = $1 AND timestamp >= now() - interval '30 days'
     GROUP BY country ORDER BY visitors DESC LIMIT 20`,
    [siteId]
  );
  return NextResponse.json(rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) })));
}

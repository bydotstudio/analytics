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

  const { rows } = await pool.query<{
    total_sessions: string;
    identified_sessions: string;
  }>(
    `WITH sessions AS (
       SELECT DISTINCT session_id FROM page_views
       WHERE site_id = $1 AND timestamp >= now() - interval '30 days'
     )
     SELECT
       COUNT(*) AS total_sessions,
       COUNT(ids.session_id) AS identified_sessions
     FROM sessions s
     LEFT JOIN identified_sessions ids
            ON ids.site_id = $1 AND ids.session_id = s.session_id`,
    [siteId]
  );

  const row = rows[0] ?? { total_sessions: "0", identified_sessions: "0" };
  const total = Number(row.total_sessions);
  const identified = Number(row.identified_sessions);

  return NextResponse.json({
    total_sessions: total,
    identified_sessions: identified,
    anonymous_sessions: total - identified,
    identification_rate: total > 0 ? Math.round((identified / total) * 1000) / 10 : 0,
  });
}

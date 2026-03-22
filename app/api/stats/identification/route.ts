import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getSessionCount30d } from "@/lib/ch-queries";

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

  const [total, identRows] = await Promise.all([
    getSessionCount30d(siteId),
    pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT session_id) AS count
       FROM identified_sessions
       WHERE site_id = $1`,
      [siteId]
    ),
  ]);

  const identified = Number(identRows.rows[0]?.count ?? 0);

  return NextResponse.json({
    total_sessions: total,
    identified_sessions: identified,
    anonymous_sessions: Math.max(0, total - identified),
    identification_rate: total > 0 ? Math.round((identified / total) * 1000) / 10 : 0,
  });
}

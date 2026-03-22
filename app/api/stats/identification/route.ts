import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, verifySiteOwnership } from "@/lib/db";
import { getSessionCount30d } from "@/lib/ch-queries";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  // SECURITY: siteId verified against session.user.id before ClickHouse call
  if (!(await verifySiteOwnership(siteId, session.user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!siteId || !sessionId) {
    return NextResponse.json({ error: "siteId and sessionId required" }, { status: 400 });
  }

  const { rows: sites } = await pool.query(
    "SELECT id FROM sites WHERE id = $1 AND user_id = $2",
    [siteId, session.user.id]
  );
  if (!sites[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rows } = await pool.query<{
    pathname: string;
    referrer: string | null;
    timestamp: string;
  }>(
    `SELECT pathname, referrer, timestamp
     FROM page_views
     WHERE site_id = $1 AND session_id = $2
     ORDER BY timestamp ASC`,
    [siteId, sessionId]
  );

  return NextResponse.json(rows);
}

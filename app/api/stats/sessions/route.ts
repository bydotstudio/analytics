import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, verifySiteOwnership } from "@/lib/db";
import { getSessionList } from "@/lib/ch-queries";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);

  // SECURITY: siteId verified against session.user.id before ClickHouse call
  if (!(await verifySiteOwnership(siteId, session.user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await getSessionList(siteId, limit);

  // Enrich with identification data from Postgres
  const sessionIds = rows.map((r) => r.session_id);
  let identMap: Record<string, { external_user_id: string; traits: unknown }> = {};
  if (sessionIds.length > 0) {
    const { rows: ids } = await pool.query<{
      session_id: string;
      external_user_id: string;
      traits: unknown;
    }>(
      `SELECT session_id, external_user_id, traits
       FROM identified_sessions
       WHERE site_id = $1 AND session_id = ANY($2::text[])`,
      [siteId, sessionIds]
    );
    identMap = Object.fromEntries(ids.map((r) => [r.session_id, r]));
  }

  return NextResponse.json(
    rows.map((r) => ({
      session_id: r.session_id,
      country: r.country || null,
      device_type: r.device_type || null,
      browser: r.browser || null,
      os: r.os || null,
      page_count: Number(r.page_count),
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_seconds: Number(r.duration_seconds),
      external_user_id: identMap[r.session_id]?.external_user_id ?? null,
      traits: identMap[r.session_id]?.traits ?? null,
    }))
  );
}

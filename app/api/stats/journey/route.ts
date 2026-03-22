import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getJourneySteps } from "@/lib/ch-queries";

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

  return NextResponse.json(await getJourneySteps(siteId, sessionId));
}

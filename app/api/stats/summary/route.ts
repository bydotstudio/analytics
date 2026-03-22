import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifySiteOwnership } from "@/lib/db";
import { getSummaryStats } from "@/lib/ch-queries";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  // SECURITY: siteId verified against session.user.id before ClickHouse call
  if (!(await verifySiteOwnership(siteId, session.user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await getSummaryStats(siteId);
  return NextResponse.json(stats);
}

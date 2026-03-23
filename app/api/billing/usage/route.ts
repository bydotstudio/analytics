import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, getSiteIds } from "@/lib/db";
import { getMonthlyEventCount } from "@/lib/ch-queries";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [sitesResult, siteIds, userResult] = await Promise.all([
    pool.query<{ count: string }>(
      "SELECT COUNT(*) FROM sites WHERE user_id = $1",
      [session.user.id]
    ),
    getSiteIds(session.user.id),
    pool.query<{ plan: string }>(
      `SELECT plan FROM "user" WHERE id = $1`,
      [session.user.id]
    ),
  ]);

  const plan = userResult.rows[0]?.plan ?? "free";
  const events_this_month = await getMonthlyEventCount(siteIds);

  return NextResponse.json({
    plan,
    sites: parseInt(sitesResult.rows[0].count),
    events_this_month,
    limits: {
      sites: plan === "pro" ? null : 5,
      events_per_month: plan === "pro" ? 1_000_000 : 20_000,
    },
  });
}

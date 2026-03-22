import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [sitesResult, eventsResult, userResult] = await Promise.all([
    pool.query<{ count: string }>(
      "SELECT COUNT(*) FROM sites WHERE user_id = $1",
      [session.user.id]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM page_views pv
       JOIN sites s ON s.id = pv.site_id
       WHERE s.user_id = $1 AND pv.timestamp >= date_trunc('month', now())`,
      [session.user.id]
    ),
    pool.query<{ plan: string }>(
      `SELECT plan FROM "user" WHERE id = $1`,
      [session.user.id]
    ),
  ]);

  const plan = userResult.rows[0]?.plan ?? "free";
  return NextResponse.json({
    plan,
    sites: parseInt(sitesResult.rows[0].count),
    events_this_month: parseInt(eventsResult.rows[0].count),
    limits: {
      sites: plan === "pro" ? null : 5,
      events_per_month: plan === "pro" ? 1_000_000 : 20_000,
    },
  });
}

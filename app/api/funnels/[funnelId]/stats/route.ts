import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ funnelId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { funnelId } = await ctx.params;

  // Verify ownership + get funnel info
  const { rows: funnelRows } = await pool.query<{ site_id: string; name: string }>(
    `SELECT f.site_id, f.name FROM funnels f
     JOIN sites s ON s.id = f.site_id
     WHERE f.id = $1 AND s.user_id = $2`,
    [funnelId, session.user.id]
  );
  if (!funnelRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { site_id: siteId } = funnelRows[0];

  // Get steps
  const { rows: steps } = await pool.query<{
    step_order: number;
    pathname: string;
    label: string | null;
  }>(
    "SELECT step_order, pathname, label FROM funnel_steps WHERE funnel_id = $1 ORDER BY step_order",
    [funnelId]
  );

  if (steps.length === 0) return NextResponse.json([]);

  // Count sessions per step
  const stepStats = await Promise.all(
    steps.map(async (step) => {
      const { rows } = await pool.query<{ sessions: string }>(
        `SELECT COUNT(DISTINCT session_id) AS sessions
         FROM page_views
         WHERE site_id = $1
           AND pathname = $2
           AND timestamp >= now() - interval '30 days'`,
        [siteId, step.pathname]
      );
      return {
        step_order: step.step_order,
        label: step.label ?? step.pathname,
        pathname: step.pathname,
        sessions: Number(rows[0]?.sessions ?? 0),
      };
    })
  );

  // Compute drop_off and conversion vs step 1
  const firstSessions = stepStats[0]?.sessions ?? 0;
  return NextResponse.json(
    stepStats.map((s, idx) => ({
      step_order: s.step_order,
      label: s.label,
      pathname: s.pathname,
      sessions: s.sessions,
      drop_off: idx === 0 ? 0 : (stepStats[idx - 1]?.sessions ?? 0) - s.sessions,
      conversion:
        firstSessions > 0
          ? Math.round((s.sessions / firstSessions) * 1000) / 10
          : 0,
    }))
  );
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getSitePerformance } from "@/lib/ch-queries";

type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

function scoreMetric(value: number | null, thresholds: number[]): Grade {
  if (value === null) return "A+";
  const grades: Grade[] = ["A+", "A", "B", "C", "D", "F"];
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return grades[i];
  }
  return "F";
}

function gradeToScore(g: Grade): number {
  return { "A+": 100, A: 90, B: 75, C: 60, D: 45, F: 20 }[g];
}

const LCP_T  = [1200, 2500, 3000, 4000, 6000];
const CLS_T  = [0.05, 0.10, 0.15, 0.25, 0.35];
const INP_T  = [100,  200,  300,  500,  700];

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

  const data = await getSitePerformance(siteId);

  // CWV score (40%): average of LCP, CLS, INP grade scores
  const cwvScore =
    (gradeToScore(scoreMetric(data.avg_lcp, LCP_T)) +
      gradeToScore(scoreMetric(data.avg_cls, CLS_T)) +
      gradeToScore(scoreMetric(data.avg_inp, INP_T))) /
    3;

  // Behavioral scores (20% each): invert rates so 0% bad behavior = 100
  const rageScore = Math.max(0, 100 - data.rage_click_rate * 500);
  const deadScore = Math.max(0, 100 - data.dead_click_rate * 300);
  const bounceScore = Math.max(0, 100 - data.bounce_rate * 100);

  const overall_score = Math.round(
    cwvScore * 0.4 + rageScore * 0.2 + deadScore * 0.2 + bounceScore * 0.2
  );

  return NextResponse.json({
    overall_score,
    avg_lcp: data.avg_lcp,
    avg_cls: data.avg_cls,
    avg_inp: data.avg_inp,
    avg_fcp: data.avg_fcp,
    avg_ttfb: data.avg_ttfb,
    rage_click_rate: data.rage_click_rate,
    dead_click_rate: data.dead_click_rate,
    bounce_rate: data.bounce_rate,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifySiteOwnership } from "@/lib/db";
import { getPerformanceMetrics } from "@/lib/ch-queries";

type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

function scoreMetric(value: number | null, thresholds: number[]): Grade {
  if (value === null) return "A+";
  const grades: Grade[] = ["A+", "A", "B", "C", "D", "F"];
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return grades[i];
  }
  return "F";
}

function overallGrade(grades: Grade[]): Grade {
  const order: Grade[] = ["A+", "A", "B", "C", "D", "F"];
  return grades.reduce((worst, g) => {
    return order.indexOf(g) > order.indexOf(worst) ? g : worst;
  }, "A+" as Grade);
}

const LCP_T  = [1200, 2500, 3000, 4000, 6000];
const CLS_T  = [0.05, 0.10, 0.15, 0.25, 0.35];
const INP_T  = [100,  200,  300,  500,  700];
const FCP_T  = [900,  1800, 2200, 3000, 4500];
const TTFB_T = [100,  200,  500,  800,  1500];

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  // SECURITY: siteId verified against session.user.id before ClickHouse call
  if (!(await verifySiteOwnership(siteId, session.user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await getPerformanceMetrics(siteId);

  return NextResponse.json(
    rows.map((r) => {
      const grades = [
        scoreMetric(r.avg_lcp, LCP_T),
        scoreMetric(r.avg_cls, CLS_T),
        scoreMetric(r.avg_inp, INP_T),
        scoreMetric(r.avg_fcp, FCP_T),
        scoreMetric(r.avg_ttfb, TTFB_T),
      ];
      return {
        pathname: r.pathname,
        samples: Number(r.samples),
        avg_lcp: r.avg_lcp,
        avg_cls: r.avg_cls,
        avg_inp: r.avg_inp,
        avg_fcp: r.avg_fcp,
        avg_ttfb: r.avg_ttfb,
        score: overallGrade(grades),
      };
    })
  );
}

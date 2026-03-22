"use client";

import { useSitePerformance } from "@/hooks/usePerformance";
import { Skeleton } from "@/components/ui/skeleton";
import type { Grade } from "@/types/analytics";

function gradeColor(grade: Grade) {
  if (grade === "A+" || grade === "A") return "text-emerald-400";
  if (grade === "B" || grade === "C") return "text-amber-400";
  return "text-red-400";
}

function gradeBorder(grade: Grade) {
  if (grade === "A+" || grade === "A") return "border-emerald-500/20";
  if (grade === "B" || grade === "C") return "border-amber-500/20";
  return "border-red-500/20";
}

export default function ExperienceScoreCard({ siteId }: { siteId: string }) {
  const { data, isLoading } = useSitePerformance(siteId);

  return (
    <div className="rounded-[24px] bg-white/[0.04] p-10">
      <p className="mb-4 text-xl text-white">Experience Score</p>
      {isLoading ? (
        <Skeleton className="h-16 w-20" />
      ) : !data?.overall_score || data.avg_lcp === null ? (
        <div>
          <p className="text-4xl font-bold text-white/20">—</p>
          <p className="mt-1 text-xs text-white/30">No performance data yet. The tracker collects Web Vitals automatically.</p>
        </div>
      ) : (
        <div>
          <p className={`text-5xl font-bold tabular-nums ${gradeColor(data.overall_score)}`}>
            {data.overall_score}
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {[
              { label: "LCP", value: data.avg_lcp ? `${(data.avg_lcp / 1000).toFixed(1)}s` : "—" },
              { label: "CLS", value: data.avg_cls?.toFixed(3) ?? "—" },
              { label: "INP", value: data.avg_inp ? `${Math.round(data.avg_inp)}ms` : "—" },
              { label: "FCP", value: data.avg_fcp ? `${(data.avg_fcp / 1000).toFixed(1)}s` : "—" },
              { label: "TTFB", value: data.avg_ttfb ? `${Math.round(data.avg_ttfb)}ms` : "—" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-xs font-medium text-white/40">{m.label}</p>
                <p className="text-xs tabular-nums text-white/60">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

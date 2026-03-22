"use client";

import { useSitePerformance } from "@/hooks/usePerformance";
import { Skeleton } from "@/components/ui/skeleton";
import type { Grade } from "@/types/analytics";

function gradeColor(grade: Grade) {
  if (grade === "A+" || grade === "A") return "text-emerald-600 dark:text-emerald-400";
  if (grade === "B" || grade === "C") return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function gradeBg(grade: Grade) {
  if (grade === "A+" || grade === "A") return "bg-emerald-50 dark:bg-emerald-950/30";
  if (grade === "B" || grade === "C") return "bg-amber-50 dark:bg-amber-950/30";
  return "bg-red-50 dark:bg-red-950/30";
}

export default function ExperienceScoreCard({ siteId }: { siteId: string }) {
  const { data, isLoading } = useSitePerformance(siteId);

  return (
    <div className={`rounded-xl border p-5 ${data ? gradeBg(data.overall_score) : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Experience Score</p>
      {isLoading ? (
        <Skeleton className="h-16 w-20" />
      ) : !data?.overall_score || data.avg_lcp === null ? (
        <div>
          <p className="text-4xl font-bold text-zinc-300 dark:text-zinc-700">—</p>
          <p className="mt-1 text-xs text-zinc-400">No performance data yet. The tracker collects Web Vitals automatically.</p>
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
                <p className="text-xs font-medium text-zinc-500">{m.label}</p>
                <p className="text-xs tabular-nums text-zinc-700 dark:text-zinc-300">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

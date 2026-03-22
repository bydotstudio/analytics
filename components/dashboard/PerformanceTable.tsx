"use client";

import { usePerformanceByPage } from "@/hooks/usePerformance";
import { Skeleton } from "@/components/ui/skeleton";
import type { Grade } from "@/types/analytics";

function GradeBadge({ grade }: { grade: Grade }) {
  const cls =
    grade === "A+" || grade === "A"
      ? "bg-emerald-500/15 text-emerald-400"
      : grade === "B" || grade === "C"
      ? "bg-amber-500/15 text-amber-400"
      : "bg-red-500/15 text-red-400";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`}>
      {grade}
    </span>
  );
}

export default function PerformanceTable({ siteId }: { siteId: string }) {
  const { data, isLoading } = usePerformanceByPage(siteId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
    );
  }

  if (!data?.length) {
    return <p className="text-sm text-white/30">No performance data yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-[24px] bg-white/[0.04]">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="px-4 py-3 text-left font-medium text-white/40">Page</th>
            <th className="px-4 py-3 text-right font-medium text-white/40">Score</th>
            <th className="px-4 py-3 text-right font-medium text-white/40">LCP</th>
            <th className="px-4 py-3 text-right font-medium text-white/40">CLS</th>
            <th className="px-4 py-3 text-right font-medium text-white/40">INP</th>
            <th className="px-4 py-3 text-right font-medium text-white/40">FCP</th>
            <th className="px-4 py-3 text-right font-medium text-white/40">TTFB</th>
            <th className="px-4 py-3 text-right font-medium text-white/40">Samples</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.pathname}
              className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.02]"
            >
              <td className="max-w-[200px] truncate px-4 py-2.5 text-white/60">{row.pathname}</td>
              <td className="px-4 py-2.5 text-right"><GradeBadge grade={row.score} /></td>
              <td className="px-4 py-2.5 text-right tabular-nums text-white/50">{row.avg_lcp ? `${(row.avg_lcp / 1000).toFixed(1)}s` : "—"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-white/50">{row.avg_cls?.toFixed(3) ?? "—"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-white/50">{row.avg_inp ? `${Math.round(row.avg_inp)}ms` : "—"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-white/50">{row.avg_fcp ? `${(row.avg_fcp / 1000).toFixed(1)}s` : "—"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-white/50">{row.avg_ttfb ? `${Math.round(row.avg_ttfb)}ms` : "—"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-white/25">{row.samples.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

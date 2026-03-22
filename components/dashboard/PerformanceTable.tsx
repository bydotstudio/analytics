"use client";

import { usePerformanceByPage } from "@/hooks/usePerformance";
import { Skeleton } from "@/components/ui/skeleton";
import type { Grade } from "@/types/analytics";

function GradeBadge({ grade }: { grade: Grade }) {
  const cls =
    grade === "A+" || grade === "A"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
      : grade === "B" || grade === "C"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
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
    return <p className="text-sm text-zinc-400">No performance data yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="px-4 py-3 text-left font-semibold text-zinc-500">Page</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-500">Score</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-500">LCP</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-500">CLS</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-500">INP</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-500">FCP</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-500">TTFB</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-500">Samples</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.pathname}
              className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50"
            >
              <td className="max-w-[200px] truncate px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {row.pathname}
              </td>
              <td className="px-4 py-2.5 text-right">
                <GradeBadge grade={row.score} />
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                {row.avg_lcp ? `${(row.avg_lcp / 1000).toFixed(1)}s` : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                {row.avg_cls?.toFixed(3) ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                {row.avg_inp ? `${Math.round(row.avg_inp)}ms` : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                {row.avg_fcp ? `${(row.avg_fcp / 1000).toFixed(1)}s` : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                {row.avg_ttfb ? `${Math.round(row.avg_ttfb)}ms` : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-zinc-400">
                {row.samples.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { use } from "react";
import ExperienceScoreCard from "@/components/dashboard/ExperienceScoreCard";
import PerformanceTable from "@/components/dashboard/PerformanceTable";

const metrics = [
  { name: "LCP", full: "Largest Contentful Paint", unit: "time", good: "< 1.2s", ok: "< 2.5s" },
  { name: "CLS", full: "Cumulative Layout Shift", unit: "score", good: "< 0.05", ok: "< 0.1" },
  { name: "INP", full: "Interaction to Next Paint", unit: "time", good: "< 100ms", ok: "< 200ms" },
  { name: "FCP", full: "First Contentful Paint", unit: "time", good: "< 900ms", ok: "< 1.8s" },
  { name: "TTFB", full: "Time to First Byte", unit: "time", good: "< 100ms", ok: "< 200ms" },
];

export default function PerformancePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);

  return (
    <div className="space-y-6">
      <ExperienceScoreCard siteId={siteId} />
      <PerformanceTable siteId={siteId} />
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Metric reference</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {metrics.map((m) => (
            <div key={m.name}>
              <p className="text-xs font-semibold text-zinc-500">{m.name}</p>
              <p className="text-xs text-zinc-400">{m.full}</p>
              <p className="mt-1 text-xs">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">A+ {m.good}</span>
              </p>
              <p className="text-xs text-zinc-400">A {m.ok}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

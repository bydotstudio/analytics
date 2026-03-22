"use client";

import { use } from "react";
import ExperienceScoreCard from "@/components/dashboard/ExperienceScoreCard";
import PerformanceTable from "@/components/dashboard/PerformanceTable";

const metrics = [
  { name: "LCP", full: "Largest Contentful Paint", good: "< 1.2s", ok: "< 2.5s" },
  { name: "CLS", full: "Cumulative Layout Shift", good: "< 0.05", ok: "< 0.1" },
  { name: "INP", full: "Interaction to Next Paint", good: "< 100ms", ok: "< 200ms" },
  { name: "FCP", full: "First Contentful Paint", good: "< 900ms", ok: "< 1.8s" },
  { name: "TTFB", full: "Time to First Byte", good: "< 100ms", ok: "< 200ms" },
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
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white/70">Metric reference</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {metrics.map((m) => (
            <div key={m.name}>
              <p className="text-xs font-semibold text-white/50">{m.name}</p>
              <p className="text-xs text-white/30">{m.full}</p>
              <p className="mt-1 text-xs font-medium text-emerald-400">A+ {m.good}</p>
              <p className="text-xs text-white/30">A {m.ok}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

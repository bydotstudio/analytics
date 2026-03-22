"use client";

import { useFunnelStats } from "@/hooks/useFunnels";
import { Skeleton } from "@/components/ui/skeleton";

export default function FunnelChart({ funnelId }: { funnelId: string }) {
  const { data: steps, isLoading } = useFunnelStats(funnelId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
      </div>
    );
  }

  if (!steps?.length) {
    return <p className="text-sm text-zinc-400">No data yet.</p>;
  }

  const maxSessions = steps[0]?.sessions ?? 1;

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={step.step_order}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {step.label}
            </span>
            <div className="flex items-center gap-4 tabular-nums text-zinc-500">
              <span>{step.sessions.toLocaleString()} visitors</span>
              <span className="w-12 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                {step.conversion}%
              </span>
            </div>
          </div>
          <div className="relative h-10 overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-800">
            <div
              className="absolute inset-y-0 left-0 rounded-lg bg-blue-100 dark:bg-blue-900/40 transition-all duration-500"
              style={{ width: `${maxSessions > 0 ? (step.sessions / maxSessions) * 100 : 0}%` }}
            />
            <span className="relative flex h-full items-center px-3 text-sm text-zinc-600 dark:text-zinc-400">
              {step.pathname}
            </span>
          </div>
          {i < steps.length - 1 && step.drop_off > 0 && (
            <p className="mt-1 pl-2 text-xs text-red-400">
              ↓ {step.drop_off.toLocaleString()} dropped off
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

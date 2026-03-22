"use client";

import { useIdentificationStats } from "@/hooks/useJourneys";
import { Skeleton } from "@/components/ui/skeleton";

export default function IdentificationCard({ siteId }: { siteId: string }) {
  const { data, isLoading } = useIdentificationStats(siteId);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">User Identification</h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : !data || data.total_sessions === 0 ? (
        <p className="text-sm text-zinc-400">No sessions yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {data.identification_rate}%
            </span>
            <span className="mb-1 text-sm text-zinc-500">identified</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${data.identification_rate}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400">
            {data.identified_sessions.toLocaleString()} identified · {data.anonymous_sessions.toLocaleString()} anonymous
          </p>
        </div>
      )}
    </div>
  );
}

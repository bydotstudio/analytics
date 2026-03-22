"use client";

import { useIdentificationStats } from "@/hooks/useJourneys";
import { Skeleton } from "@/components/ui/skeleton";

export default function IdentificationCard({ siteId }: { siteId: string }) {
  const { data, isLoading } = useIdentificationStats(siteId);

  return (
    <div className="rounded-[24px] bg-white/[0.04] p-10">
      <h3 className="mb-6 text-xl text-white">User Identification</h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : !data || data.total_sessions === 0 ? (
        <p className="text-sm text-white/30">No sessions yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold tabular-nums text-white">
              {data.identification_rate}%
            </span>
            <span className="mb-1 text-sm text-white/40">identified</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${data.identification_rate}%` }}
            />
          </div>
          <p className="text-xs text-white/30">
            {data.identified_sessions.toLocaleString()} identified · {data.anonymous_sessions.toLocaleString()} anonymous
          </p>
        </div>
      )}
    </div>
  );
}

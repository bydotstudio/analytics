"use client";

import { useSummaryStats } from "@/hooks/useStats";
import { useActiveVisitors } from "@/hooks/useActiveVisitors";
import StatCard from "./StatCard";

export default function SimpleView({ siteId, fillHeight }: { siteId: string; fillHeight?: boolean }) {
  const { data, isLoading } = useSummaryStats(siteId);
  const { data: activeData } = useActiveVisitors(siteId);
  const active = activeData?.active ?? 0;

  return (
    <div className={fillHeight ? "flex flex-1 flex-col" : ""}>
      <div className={`grid grid-cols-2 grid-rows-3 ${fillHeight ? "flex-1 gap-8" : "min-h-[780px] gap-8"}`}>
        <StatCard label="Today" value={data?.today ?? 0} loading={isLoading} />
        <StatCard label="Active now" value={active} live />
        <StatCard label="This week" value={data?.last_7d ?? 0} loading={isLoading} />
        <StatCard label="This month" value={data?.last_30d ?? 0} loading={isLoading} />
        <StatCard
          label="Top country"
          value={data?.top_country ?? "—"}
          flagCode={data?.top_country ?? undefined}
          loading={isLoading}
        />
        <StatCard
          label="Top referrer"
          value={data?.top_referrer ?? "—"}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

"use client";

import { motion } from "motion/react";
import { useSummaryStats } from "@/hooks/useStats";
import { useActiveVisitors } from "@/hooks/useActiveVisitors";
import StatCard from "./StatCard";
import PrivacyBadge from "./PrivacyBadge";

export default function SimpleView({ siteId }: { siteId: string }) {
  const { data, isLoading, isFetching } = useSummaryStats(siteId);
  const { data: activeData } = useActiveVisitors(siteId);
  const transitioning = isFetching && !isLoading;
  const active = activeData?.active ?? 0;

  return (
    <div className="space-y-3">
      <motion.div
        animate={{ opacity: transitioning ? 0.45 : 1 }}
        transition={{ duration: 0.15 }}
        className="grid grid-cols-2 gap-8"
      >
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
      </motion.div>
      <PrivacyBadge />
    </div>
  );
}

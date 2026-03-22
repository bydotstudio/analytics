"use client";

import { motion } from "motion/react";
import { useSummaryStats } from "@/hooks/useStats";
import StatCard from "./StatCard";
import PrivacyBadge from "./PrivacyBadge";

export default function SimpleView({ siteId }: { siteId: string }) {
  const { data, isLoading, isFetching } = useSummaryStats(siteId);
  const transitioning = isFetching && !isLoading;

  return (
    <div className="space-y-3">
      <motion.div
        animate={{ opacity: transitioning ? 0.45 : 1 }}
        transition={{ duration: 0.15 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <StatCard label="Today" value={data?.today ?? 0} loading={isLoading} />
        <StatCard label="Last 7 days" value={data?.last_7d ?? 0} loading={isLoading} />
        <StatCard label="Last 30 days" value={data?.last_30d ?? 0} loading={isLoading} />
      </motion.div>
      <PrivacyBadge />
    </div>
  );
}

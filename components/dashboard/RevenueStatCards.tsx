"use client";

import { motion } from "motion/react";
import { useRevenueStats } from "@/hooks/useRevenue";
import StatCard from "./StatCard";

export default function RevenueStatCards({ siteId }: { siteId: string }) {
  const { data, isLoading, isFetching } = useRevenueStats(siteId);
  const transitioning = isFetching && !isLoading;

  const revenue = data?.total_revenue ?? 0;
  const formattedRevenue =
    revenue === 0 ? "€0" : `€${revenue >= 1000 ? (revenue / 1000).toFixed(1) + "k" : revenue.toFixed(2)}`;

  return (
    <motion.div
      animate={{ opacity: transitioning ? 0.45 : 1 }}
      transition={{ duration: 0.15 }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
    >
      <StatCard label="Revenue (30d)" value={formattedRevenue} loading={isLoading} />
      <StatCard label="Conversions (30d)" value={data?.total_conversions ?? 0} loading={isLoading} />
      <StatCard label="Unique converters" value={data?.unique_converters ?? 0} loading={isLoading} />
    </motion.div>
  );
}

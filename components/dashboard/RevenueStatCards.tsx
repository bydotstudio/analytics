"use client";

import { useRevenueStats } from "@/hooks/useRevenue";
import StatCard from "./StatCard";

export default function RevenueStatCards({ siteId }: { siteId: string }) {
  const { data, isLoading } = useRevenueStats(siteId);

  const revenue = data?.total_revenue ?? 0;
  const formattedRevenue =
    revenue === 0 ? "€0" : `€${revenue >= 1000 ? (revenue / 1000).toFixed(1) + "k" : revenue.toFixed(2)}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Revenue (30d)" value={formattedRevenue} loading={isLoading} />
      <StatCard label="Conversions (30d)" value={data?.total_conversions ?? 0} loading={isLoading} />
      <StatCard label="Unique converters" value={data?.unique_converters ?? 0} loading={isLoading} />
    </div>
  );
}

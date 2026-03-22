"use client";

import { useQuery } from "@tanstack/react-query";
import type { RevenueStats } from "@/types/analytics";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function useRevenueStats(siteId: string) {
  return useQuery<RevenueStats>({
    queryKey: ["stats", "revenue", siteId],
    queryFn: () => fetchJSON(`/api/stats/revenue?siteId=${siteId}`),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

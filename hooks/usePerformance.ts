"use client";

import { useQuery } from "@tanstack/react-query";
import type { PerformanceMetric, SitePerformance } from "@/types/analytics";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function usePerformanceByPage(siteId: string) {
  return useQuery<PerformanceMetric[]>({
    queryKey: ["stats", "performance", siteId],
    queryFn: () => fetchJSON(`/api/stats/performance?siteId=${siteId}`),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useSitePerformance(siteId: string) {
  return useQuery<SitePerformance>({
    queryKey: ["stats", "performance", "site", siteId],
    queryFn: () => fetchJSON(`/api/stats/performance/site?siteId=${siteId}`),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}

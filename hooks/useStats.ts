"use client";

import { useQuery } from "@tanstack/react-query";
import type { SummaryStats, BreakdownRow } from "@/types/analytics";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function useSummaryStats(siteId: string) {
  return useQuery<SummaryStats>({
    queryKey: ["stats", "summary", siteId],
    queryFn: () => fetchJSON(`/api/stats/summary?siteId=${siteId}`),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useTopPages(siteId: string) {
  return useQuery<BreakdownRow[]>({
    queryKey: ["stats", "pages", siteId],
    queryFn: () => fetchJSON(`/api/stats/pages?siteId=${siteId}`),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useTopReferrers(siteId: string) {
  return useQuery<BreakdownRow[]>({
    queryKey: ["stats", "referrers", siteId],
    queryFn: () => fetchJSON(`/api/stats/referrers?siteId=${siteId}`),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useDeviceBreakdown(siteId: string) {
  return useQuery<BreakdownRow[]>({
    queryKey: ["stats", "devices", siteId],
    queryFn: () => fetchJSON(`/api/stats/devices?siteId=${siteId}`),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useCountryBreakdown(siteId: string) {
  return useQuery<BreakdownRow[]>({
    queryKey: ["stats", "countries", siteId],
    queryFn: () => fetchJSON(`/api/stats/countries?siteId=${siteId}`),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  });
}

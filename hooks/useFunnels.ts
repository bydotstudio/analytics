"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Funnel, FunnelStepStat } from "@/types/analytics";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function useFunnelList(siteId: string) {
  return useQuery<Funnel[]>({
    queryKey: ["funnels", siteId],
    queryFn: () => fetchJSON(`/api/funnels?siteId=${siteId}`),
    placeholderData: (prev) => prev,
  });
}

export function useFunnelStats(funnelId: string) {
  return useQuery<FunnelStepStat[]>({
    queryKey: ["funnels", "stats", funnelId],
    queryFn: () => fetchJSON(`/api/funnels/${funnelId}/stats`),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateFunnel(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; steps: { pathname: string; label?: string }[] }) => {
      const res = await fetch("/api/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, ...data }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Funnel>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funnels", siteId] }),
  });
}

export function useDeleteFunnel(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (funnelId: string) => {
      const res = await fetch(`/api/funnels/${funnelId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funnels", siteId] }),
  });
}

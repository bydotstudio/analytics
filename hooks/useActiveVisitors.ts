"use client";

import { useQuery } from "@tanstack/react-query";

export function useActiveVisitors(siteId: string) {
  return useQuery<{ active: number }>({
    queryKey: ["stats", "active", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/stats/active?siteId=${siteId}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
}

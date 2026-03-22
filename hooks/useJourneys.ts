"use client";

import { useQuery } from "@tanstack/react-query";
import type { Session, JourneyStep, IdentificationStats } from "@/types/analytics";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function useSessionList(siteId: string) {
  return useQuery<Session[]>({
    queryKey: ["stats", "sessions", siteId],
    queryFn: () => fetchJSON(`/api/stats/sessions?siteId=${siteId}`),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useSessionJourney(siteId: string, sessionId: string | null) {
  return useQuery<JourneyStep[]>({
    queryKey: ["stats", "journey", siteId, sessionId],
    queryFn: () => fetchJSON(`/api/stats/journey?siteId=${siteId}&sessionId=${sessionId}`),
    enabled: !!sessionId,
  });
}

export function useIdentificationStats(siteId: string) {
  return useQuery<IdentificationStats>({
    queryKey: ["stats", "identification", siteId],
    queryFn: () => fetchJSON(`/api/stats/identification?siteId=${siteId}`),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

"use client";

import { useState, useEffect, useRef } from "react";
import type { RealtimeEvent } from "@/types/analytics";

export function useRealtimeFeed(siteId: string) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      const es = new EventSource(`/api/realtime/stream?siteId=${siteId}`);
      esRef.current = es;

      es.addEventListener("open", () => setConnected(true));

      es.addEventListener("pageview", (e) => {
        try {
          const event = JSON.parse(e.data) as RealtimeEvent;
          setEvents((prev) => [event, ...prev].slice(0, 50));
        } catch {}
      });

      es.addEventListener("error", () => {
        setConnected(false);
        es.close();
        // Reconnect after 3s
        setTimeout(connect, 3000);
      });
    }

    connect();

    return () => {
      esRef.current?.close();
    };
  }, [siteId]);

  return { events, connected };
}

"use client";

import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useSessionList } from "@/hooks/useJourneys";
import type { Session } from "@/types/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import SessionJourneyModal from "./SessionJourneyModal";

function countryToFlag(code: string | null) {
  if (!code || code.length !== 2) return "🌐";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

function DeviceIcon({ type }: { type: string | null }) {
  const cls = "h-3.5 w-3.5 text-zinc-400";
  if (type === "mobile") return <Smartphone className={cls} />;
  if (type === "tablet") return <Tablet className={cls} />;
  return <Monitor className={cls} />;
}

function formatDuration(s: number) {
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m`;
}

export default function SessionList({ siteId }: { siteId: string }) {
  const { data: sessions, isLoading } = useSessionList(siteId);
  const [selected, setSelected] = useState<Session | null>(null);

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Recent Sessions (7d)</h3>
        </div>

        {isLoading ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : !sessions?.length ? (
          <p className="p-5 text-sm text-zinc-400">No sessions in the last 7 days.</p>
        ) : (
          <ul>
            {sessions.map((s) => (
              <li key={s.session_id}>
                <button
                  onClick={() => setSelected(s)}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <span className="text-base">{countryToFlag(s.country)}</span>
                  <DeviceIcon type={s.device_type} />
                  <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {s.external_user_id ?? <span className="text-zinc-400">Anonymous</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-zinc-400">
                    {s.page_count}p · {formatDuration(s.duration_seconds)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <SessionJourneyModal
          siteId={siteId}
          session={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

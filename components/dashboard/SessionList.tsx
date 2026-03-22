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
  const cls = "h-3.5 w-3.5 text-white/30";
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
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900">
        <div className="border-b border-white/[0.06] px-5 py-3">
          <h3 className="text-sm font-semibold text-white/70">Recent Sessions (7d)</h3>
        </div>

        {isLoading ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : !sessions?.length ? (
          <p className="p-5 text-sm text-white/30">No sessions in the last 7 days.</p>
        ) : (
          <ul>
            {sessions.map((s) => (
              <li key={s.session_id}>
                <button
                  onClick={() => setSelected(s)}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span className="text-base">{countryToFlag(s.country)}</span>
                  <DeviceIcon type={s.device_type} />
                  <span className="flex-1 truncate text-sm text-white/60">
                    {s.external_user_id ?? <span className="text-white/25">Anonymous</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-white/30">
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

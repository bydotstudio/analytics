"use client";

import { useSessionJourney } from "@/hooks/useJourneys";
import type { Session } from "@/types/analytics";
import { Skeleton } from "@/components/ui/skeleton";

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function relativeMs(base: string, ts: string) {
  const diff = new Date(ts).getTime() - new Date(base).getTime();
  if (diff < 1000) return "+0s";
  if (diff < 60000) return `+${Math.floor(diff / 1000)}s`;
  return `+${Math.floor(diff / 60000)}m`;
}

interface Props {
  siteId: string;
  session: Session;
  onClose: () => void;
}

export default function SessionJourneyModal({ siteId, session, onClose }: Props) {
  const { data: steps, isLoading } = useSessionJourney(siteId, session.session_id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-[24px] bg-white/[0.04] p-10 shadow-2xl backdrop-blur-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-semibold text-white">
              {session.external_user_id ?? <span className="text-white/30">Anonymous</span>}
            </p>
            <p className="mt-0.5 text-xs text-white/30">
              {session.country ?? "Unknown"} · {session.device_type ?? "unknown"} · {session.browser ?? "unknown"} · {session.page_count} pages · {formatDuration(session.duration_seconds)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : !steps?.length ? (
          <p className="text-sm text-white/30">No pages recorded.</p>
        ) : (
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/30">
                  {relativeMs(steps[0].timestamp, step.timestamp)}
                </span>
                <span className="flex-1 truncate rounded-md bg-white/[0.05] px-2 py-1 text-white/70">
                  {step.pathname}
                </span>
                {step.referrer && (
                  <span className="shrink-0 text-xs text-white/30">← {step.referrer}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRealtimeFeed } from "@/hooks/useRealtimeFeed";

function countryToFlag(code: string | null) {
  if (!code || code.length !== 2) return "🌐";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function LiveFeed({ siteId }: { siteId: string }) {
  const { events, connected } = useRealtimeFeed(siteId);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white/70">Live feed</h3>
        <span className="flex items-center gap-1.5 text-xs text-white/30">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-white/20"}`} />
          {connected ? "Connected" : "Reconnecting…"}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-white/30">Waiting for visitors…</p>
      ) : (
        <ul className="space-y-1 font-mono text-xs">
          {events.map((e, i) => (
            <li key={`${e.timestamp}-${i}`} className="flex items-center gap-3">
              <span>{countryToFlag(e.country)}</span>
              <span className="flex-1 truncate text-white/60">{e.pathname}</span>
              <span className="shrink-0 text-white/30">{relativeTime(e.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

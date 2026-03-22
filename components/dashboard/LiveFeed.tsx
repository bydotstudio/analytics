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
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Live feed</h3>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span
            className={[
              "inline-block h-1.5 w-1.5 rounded-full",
              connected ? "bg-emerald-500" : "bg-zinc-400",
            ].join(" ")}
          />
          {connected ? "Connected" : "Reconnecting…"}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-zinc-400">Waiting for visitors…</p>
      ) : (
        <ul className="space-y-1 font-mono text-xs">
          {events.map((e, i) => (
            <li
              key={`${e.timestamp}-${i}`}
              className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"
            >
              <span>{countryToFlag(e.country)}</span>
              <span className="flex-1 truncate text-zinc-800 dark:text-zinc-200">{e.pathname}</span>
              <span className="shrink-0 text-zinc-400">{relativeTime(e.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

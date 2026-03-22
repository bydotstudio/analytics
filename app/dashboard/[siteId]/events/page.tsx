"use client";

import { use } from "react";
import { useRevenueStats } from "@/hooks/useRevenue";
import RevenueStatCards from "@/components/dashboard/RevenueStatCards";
import { Skeleton } from "@/components/ui/skeleton";

function EventsTable({ siteId }: { siteId: string }) {
  const { data, isLoading } = useRevenueStats(siteId);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Top Events</h3>
        {isLoading ? (
          <div className="space-y-2">
            {[90, 72, 58].map((w, i) => <Skeleton key={i} className="h-7" style={{ width: `${w}%` }} />)}
          </div>
        ) : !data?.top_events.length ? (
          <p className="text-sm text-zinc-400">No events yet. Use <code className="font-mono text-xs">analytics.track()</code> to record events.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.top_events.map((e) => (
              <li key={e.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-zinc-700 dark:text-zinc-300">{e.name}</span>
                <div className="flex shrink-0 gap-4 tabular-nums text-zinc-500">
                  <span>{e.count.toLocaleString()} events</span>
                  {e.revenue > 0 && <span className="text-emerald-600 dark:text-emerald-400">€{e.revenue.toFixed(2)}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Top Converting Pages</h3>
        {isLoading ? (
          <div className="space-y-2">
            {[90, 72, 58].map((w, i) => <Skeleton key={i} className="h-7" style={{ width: `${w}%` }} />)}
          </div>
        ) : !data?.top_pages.length ? (
          <p className="text-sm text-zinc-400">No revenue events yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.top_pages.map((p) => (
              <li key={p.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-zinc-700 dark:text-zinc-300">{p.label || "(unknown)"}</span>
                <div className="flex shrink-0 gap-4 tabular-nums text-zinc-500">
                  <span>{p.conversions.toLocaleString()}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">€{p.revenue.toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function EventsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);

  return (
    <div className="space-y-6">
      <RevenueStatCards siteId={siteId} />
      <EventsTable siteId={siteId} />
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">Track custom events</p>
        <p className="mb-3 text-zinc-500">Call from anywhere on your site after the tracker is loaded:</p>
        <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{`// Simple event
analytics.track('signup')

// With revenue
analytics.track('purchase', { revenue: 49.99, currency: 'USD' })

// With metadata
analytics.track('upgrade', { revenue: 12, plan: 'pro' })`}</pre>
      </div>
    </div>
  );
}

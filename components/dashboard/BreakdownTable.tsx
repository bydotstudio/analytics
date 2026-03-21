import type { BreakdownRow } from "@/types/analytics";
import { Skeleton } from "@/components/ui/skeleton";

interface BreakdownTableProps {
  title: string;
  rows: BreakdownRow[];
  loading?: boolean;
}

export default function BreakdownTable({ title, rows, loading }: BreakdownTableProps) {
  const max = rows[0]?.visitors ?? 1;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
      {loading ? (
        <div className="space-y-2">
          {[90, 72, 58, 44, 32].map((w, i) => (
            <Skeleton key={i} className="h-7" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-400">No data yet</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center gap-3">
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-md bg-blue-100 dark:bg-blue-900/40"
                  style={{ width: `${(row.visitors / max) * 100}%` }}
                />
                <span className="relative block truncate px-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                  {row.label || "(direct)"}
                </span>
              </div>
              <span className="w-12 shrink-0 text-right text-sm tabular-nums text-zinc-500">
                {row.visitors.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

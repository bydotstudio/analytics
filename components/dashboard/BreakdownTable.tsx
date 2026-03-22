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
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white/70">{title}</h3>
      {loading ? (
        <div className="space-y-2">
          {[90, 72, 58, 44, 32].map((w, i) => (
            <Skeleton key={i} className="h-7" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/30">No data yet</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center gap-3">
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
                <div
                  className="absolute inset-y-0 left-0 rounded-md bg-blue-500/20 transition-all duration-500"
                  style={{ width: `${(row.visitors / max) * 100}%` }}
                />
                <span className="relative block truncate px-2 text-sm leading-7 text-white/70">
                  {row.label || "(direct)"}
                </span>
              </div>
              <span className="w-12 shrink-0 text-right text-sm tabular-nums text-white/40">
                {row.visitors.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

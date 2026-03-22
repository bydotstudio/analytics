import { AnimatePresence, motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: number | string;
  loading?: boolean;
  /** Show pulsing live-dot next to label (for "Active now") */
  live?: boolean;
  /** ISO 3166-1 alpha-2 country code — renders flag emoji before value */
  flagCode?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.codePointAt(0)! + 0x1f1a5))
    .join("");
}

export default function StatCard({ label, value, loading, live, flagCode }: StatCardProps) {
  const displayed = typeof value === "number" ? value.toLocaleString() : String(value);

  return (
    <div className="relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-[24px] bg-white/[0.04] p-10">
      {/* Label */}
      <div className="flex items-center gap-3">
        <p className="text-xl text-white">{label}</p>
        {live && (
          <span className="relative flex size-3 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-3">
        {loading ? (
          <Skeleton className="h-14 w-36" />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={displayed}
              initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
              transition={{ duration: 0.35, ease }}
              className="flex items-baseline gap-3"
            >
              {flagCode && (
                <span className="text-[56px] leading-none">{countryFlag(flagCode)}</span>
              )}
              <p className="text-[64px] font-semibold leading-none tracking-[-0.03em] text-white tabular-nums">
                {displayed}
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

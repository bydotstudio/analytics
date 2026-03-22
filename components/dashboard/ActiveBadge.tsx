"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActiveVisitors } from "@/hooks/useActiveVisitors";

export default function ActiveBadge({ siteId }: { siteId: string }) {
  const { data } = useActiveVisitors(siteId);
  const count = data?.active ?? 0;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium tabular-nums text-emerald-400">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="tabular-nums"
        >
          {count}
        </motion.span>
      </AnimatePresence>{" "}
      active now
    </span>
  );
}

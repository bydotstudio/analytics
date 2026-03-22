"use client";

import type { ViewMode } from "@/types/analytics";
import { cn } from "@/lib/cn";

interface ModeToggleProps {
  mode: ViewMode;
  onToggle: (mode: ViewMode) => void;
}

export default function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  return (
    <div className="flex items-center rounded-full bg-white/[0.06] p-[3px]">
      {(["simple", "advanced"] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onToggle(m)}
          className={cn(
            "h-10 rounded-full px-6 text-sm font-medium capitalize transition-all duration-150 motion-safe:active:scale-[0.97]",
            mode === m
              ? "bg-white/10 text-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              : "text-white/70 hover:text-white"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

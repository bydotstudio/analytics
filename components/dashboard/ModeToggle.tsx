"use client";

import type { ViewMode } from "@/types/analytics";
import { cn } from "@/lib/cn";

interface ModeToggleProps {
  mode: ViewMode;
  onToggle: (mode: ViewMode) => void;
}

export default function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
      {(["simple", "advanced"] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onToggle(m)}
          className={cn(
            "rounded capitalize px-4 py-1.5 text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-150 motion-safe:active:scale-[0.97]",
            mode === m
              ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-zinc-700 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { ViewMode } from "@/types/analytics";

const STORAGE_KEY = "analytics-view-mode";

export function useSiteMode() {
  const [mode, setMode] = useState<ViewMode>("simple");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "advanced" || stored === "simple") setMode(stored);
  }, []);

  function toggle(next: ViewMode) {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return { mode, toggle };
}

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ViewMode } from "@/types/analytics";

interface DashboardModeContextValue {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

const DashboardModeContext = createContext<DashboardModeContextValue>({
  mode: "simple",
  setMode: () => {},
});

export function DashboardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("simple");

  useEffect(() => {
    const stored = localStorage.getItem("analytics-view-mode");
    if (stored === "advanced" || stored === "simple") setModeState(stored);
  }, []);

  function setMode(next: ViewMode) {
    setModeState(next);
    localStorage.setItem("analytics-view-mode", next);
  }

  return (
    <DashboardModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  return useContext(DashboardModeContext);
}

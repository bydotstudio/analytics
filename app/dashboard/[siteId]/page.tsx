"use client";

import { Suspense, lazy } from "react";
import { useSiteMode } from "@/hooks/useSiteMode";
import ModeToggle from "@/components/dashboard/ModeToggle";
import SimpleView from "@/components/dashboard/SimpleView";
import ActiveBadge from "@/components/dashboard/ActiveBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { use } from "react";

const AdvancedView = lazy(() => import("@/components/dashboard/AdvancedView"));

export default function SiteDashboard({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const { mode, toggle } = useSiteMode();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ActiveBadge siteId={siteId} />
        <ModeToggle mode={mode} onToggle={toggle} />
      </div>

      <SimpleView siteId={siteId} />

      {mode === "advanced" && (
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          }
        >
          <AdvancedView siteId={siteId} />
        </Suspense>
      )}
    </div>
  );
}

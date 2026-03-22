"use client";

import { Suspense, lazy } from "react";
import { useDashboardMode } from "@/contexts/dashboard-mode";
import SimpleView from "@/components/dashboard/SimpleView";
import { Skeleton } from "@/components/ui/skeleton";
import { use } from "react";

const AdvancedView = lazy(() => import("@/components/dashboard/AdvancedView"));

export default function SiteDashboard({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const { mode } = useDashboardMode();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <SimpleView siteId={siteId} fillHeight={mode === "simple"} />

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

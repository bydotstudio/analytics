"use client";

import { use } from "react";
import SessionList from "@/components/dashboard/SessionList";
import IdentificationCard from "@/components/dashboard/IdentificationCard";

export default function JourneysPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SessionList siteId={siteId} />
        </div>
        <div>
          <IdentificationCard siteId={siteId} />
          <p className="mt-3 text-xs text-zinc-400">
            Use <code className="font-mono">analytics.identify(userId, traits)</code> to link sessions to known users.
          </p>
        </div>
      </div>
    </div>
  );
}

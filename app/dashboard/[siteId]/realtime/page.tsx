"use client";

import { use } from "react";
import ActiveBadge from "@/components/dashboard/ActiveBadge";
import LiveFeed from "@/components/dashboard/LiveFeed";

export default function RealtimePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);

  return (
    <div className="space-y-6">
      <div>
        <ActiveBadge siteId={siteId} />
      </div>
      <LiveFeed siteId={siteId} />
    </div>
  );
}

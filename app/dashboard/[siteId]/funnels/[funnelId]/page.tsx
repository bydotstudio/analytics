"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import FunnelChart from "@/components/dashboard/FunnelChart";
import { useFunnelStats } from "@/hooks/useFunnels";

function FunnelHeader({
  funnelId,
  siteId,
}: {
  funnelId: string;
  siteId: string;
}) {
  const { data } = useFunnelStats(funnelId);
  const lastStep = data?.[data.length - 1];

  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/dashboard/${siteId}/funnels`}
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        <ChevronLeft className="h-4 w-4" />
        Funnels
      </Link>
      {lastStep && (
        <div className="text-right">
          <p className="text-xs text-zinc-400">Overall conversion</p>
          <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {lastStep.conversion}%
          </p>
        </div>
      )}
    </div>
  );
}

export default function FunnelDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; funnelId: string }>;
}) {
  const { siteId, funnelId } = use(params);

  return (
    <div className="space-y-6">
      <FunnelHeader funnelId={funnelId} siteId={siteId} />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-zinc-800 dark:bg-zinc-900">
        <FunnelChart funnelId={funnelId} />
      </div>
    </div>
  );
}

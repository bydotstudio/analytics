"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useFunnelList, useDeleteFunnel } from "@/hooks/useFunnels";
import FunnelBuilderModal from "@/components/dashboard/FunnelBuilderModal";
import { Skeleton } from "@/components/ui/skeleton";

function FunnelList({ siteId }: { siteId: string }) {
  const { data: funnels, isLoading } = useFunnelList(siteId);
  const { mutate: deleteFunnel } = useDeleteFunnel(siteId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!funnels?.length) {
    return (
      <p className="text-sm text-zinc-400">
        No funnels yet. Create one to track how visitors move through your site.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {funnels.map((funnel) => {
        return (
          <div
            key={funnel.id}
            className="group relative rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <Link
                  href={`/dashboard/${siteId}/funnels/${funnel.id}`}
                  className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {funnel.name}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {funnel.steps.length} steps
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete "${funnel.name}"?`)) deleteFunnel(funnel.id);
                }}
                className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-100 hover:text-red-500 dark:text-zinc-700 dark:hover:bg-zinc-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {funnel.steps.map((s) => (
                <span
                  key={s.id}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {s.label ?? s.pathname}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FunnelsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Funnels</h2>
        <button
          onClick={() => setShowBuilder(true)}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-zinc-700 motion-safe:active:scale-[0.97] dark:bg-zinc-50 dark:text-zinc-900"
        >
          + New funnel
        </button>
      </div>

      <FunnelList siteId={siteId} />

      {showBuilder && (
        <FunnelBuilderModal siteId={siteId} onClose={() => setShowBuilder(false)} />
      )}
    </div>
  );
}

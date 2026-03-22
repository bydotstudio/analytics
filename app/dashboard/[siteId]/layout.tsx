"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use } from "react";

const tabs = [
  { label: "Overview", segment: "" },
  { label: "Events", segment: "events" },
  { label: "Realtime", segment: "realtime" },
  { label: "Journeys", segment: "journeys" },
  { label: "Performance", segment: "performance" },
  { label: "Integrations", segment: "integrations" },
];

export default function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const href =
            tab.segment === ""
              ? `/dashboard/${siteId}`
              : `/dashboard/${siteId}/${tab.segment}`;
          const isActive =
            tab.segment === ""
              ? pathname === `/dashboard/${siteId}`
              : pathname.startsWith(`/dashboard/${siteId}/${tab.segment}`);

          return (
            <Link
              key={tab.segment}
              href={href}
              className={[
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}

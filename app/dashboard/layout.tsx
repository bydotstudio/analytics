"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Site } from "@/types/analytics";

interface UsageData {
  plan: string;
  sites: number;
  events_this_month: number;
  limits: { sites: number; events_per_month: number };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const currentSiteId = params?.siteId as string | undefined;

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(currentSiteId);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [embedSite, setEmbedSite] = useState<Site | null>(null);

  useEffect(() => {
    if (!showAddSite && !embedSite) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setShowAddSite(false); setEmbedSite(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showAddSite, embedSite]);

  useEffect(() => {
    Promise.all([
      fetch("/api/sites").then((r) => r.json()),
      fetch("/api/billing/usage").then((r) => r.json()),
    ])
      .then(([sitesData, usageData]: [Site[], UsageData]) => {
        if (!Array.isArray(sitesData)) return;
        setSites(sitesData);
        setUsage(usageData);
        const saved = localStorage.getItem("lastSiteId");
        const target = sitesData.find((s) => s.id === (currentSiteId ?? saved)) ?? sitesData[0];
        if (target) setSelectedSiteId(target.id);
        if (!currentSiteId && target) {
          router.replace(`/dashboard/${target.id}`);
        }
      })
      .catch(console.error);
  }, []);

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSiteName, domain: newSiteDomain }),
    });
    setAdding(false);
    if (res.ok) {
      const site: Site = await res.json();
      setSites((s) => [site, ...s]);
      setShowAddSite(false);
      setNewSiteName("");
      setNewSiteDomain("");
      setEmbedSite(site);
      localStorage.setItem("lastSiteId", site.id);
      router.push(`/dashboard/${site.id}`);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 pt-safe-top backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <img src="/logo.svg" alt="Analytics" className="h-4 dark:invert" />
            </Link>
            {sites.length > 0 && (
              <Select
                value={selectedSiteId ?? ""}
                onValueChange={(v) => {
                  localStorage.setItem("lastSiteId", v);
                  setSelectedSiteId(v);
                  router.push(`/dashboard/${v}`);
                }}
              >
                <SelectTrigger className="h-7 w-40 text-sm">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              Settings
            </Link>
            <Button
              size="sm"
              onClick={() => setShowAddSite(true)}
              className="motion-safe:active:scale-[0.97]"
            >
              + Add site
            </Button>
          </div>
        </div>
      </header>

      {usage && usage.plan !== "pro" && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          You&apos;re on the free plan.{" "}
          <button
            onClick={() => authClient.checkout({ slug: "pro" })}
            className="cursor-pointer font-medium underline underline-offset-2"
          >
            Upgrade to Pro
          </button>{" "}
          for €5/month to unlock full tracking.
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      {showAddSite && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="modal-card w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Add a site</h2>
            <form onSubmit={handleAddSite} className="space-y-3">
              <input
                type="text"
                placeholder="Site name"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <input
                type="text"
                placeholder="Domain (e.g. example.com)"
                value={newSiteDomain}
                onChange={(e) => setNewSiteDomain(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition-[background-color,transform,opacity] duration-150 hover:bg-zinc-700 motion-safe:active:scale-[0.97] disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  {adding ? "Adding…" : "Add site"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSite(false)}
                  className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-600 transition-[background-color,transform] duration-150 hover:bg-zinc-50 motion-safe:active:scale-[0.97] dark:border-zinc-700 dark:text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {embedSite && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="modal-card w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Embed snippet</h2>
            <p className="mb-3 text-sm text-zinc-500">Add this to the <code>&lt;head&gt;</code> of your site:</p>
            <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {`<script src="${appUrl}/tracker.js" data-site-id="${embedSite.id}" defer></script>`}
            </pre>
            <button
              onClick={() => setEmbedSite(null)}
              className="mt-4 w-full rounded-lg border border-zinc-200 py-2 text-sm text-zinc-600 transition-[background-color,transform] duration-150 hover:bg-zinc-50 motion-safe:active:scale-[0.97] dark:border-zinc-700 dark:text-zinc-400"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

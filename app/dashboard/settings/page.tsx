"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { Site } from "@/types/analytics";

interface UsageData {
  plan: string;
  sites: number;
  events_this_month: number;
  limits: { sites: number; events_per_month: number };
}

export default function SettingsPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  useEffect(() => {
    Promise.all([
      fetch("/api/sites").then((r) => r.json()),
      fetch("/api/billing/usage").then((r) => r.json()),
    ]).then(([sitesData, usageData]) => {
      setSites(sitesData);
      setUsage(usageData);
    });
  }, []);

  async function handleDelete(siteId: string, siteName: string) {
    if (!confirm(`Delete "${siteName}"? This will permanently delete all pageview data and cannot be undone.`)) return;
    setDeletingId(siteId);
    const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) setSites((s) => s.filter((site) => site.id !== siteId));
  }

  function copySnippet(site: Site) {
    const snippet = `<script src="${appUrl}/tracker.js" data-site-id="${site.id}" defer></script>`;
    navigator.clipboard.writeText(snippet);
    setCopiedId(site.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-sm font-semibold text-white/60">Settings</h1>

      {/* Billing */}
      <section className="rounded-[24px] bg-white/[0.04] p-10">
        <h2 className="mb-6 text-xl text-white">Billing</h2>
        {usage && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  usage.plan === "pro"
                    ? "bg-blue-500/15 text-blue-400"
                    : "bg-white/[0.06] text-white/40"
                }`}
              >
                {usage.plan === "pro" ? "Pro" : "Free"}
              </span>
              <span className="text-xs tabular-nums text-white/40">
                {usage.sites}/{usage.limits.sites} sites &middot;{" "}
                {usage.events_this_month.toLocaleString()}/
                {usage.limits.events_per_month.toLocaleString()} events this month
              </span>
            </div>

            {usage.plan !== "pro" && (
              <div className="rounded-lg bg-white/[0.03] p-4">
                <p className="mb-3 text-xs text-white/40">
                  Upgrade to Pro for €5/month — up to 5 sites and 20,000 events/month.
                </p>
                <button
                  onClick={() => authClient.checkout({ slug: "pro" })}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-[background-color,transform] hover:bg-zinc-100 motion-safe:active:scale-[0.97]"
                >
                  Upgrade to Pro — €5/mo
                </button>
              </div>
            )}

            {usage.plan === "pro" && (
              <button
                onClick={() => authClient.customer.portal()}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white motion-safe:active:scale-[0.97]"
              >
                Manage billing
              </button>
            )}
          </div>
        )}
      </section>

      {/* Sites */}
      <section className="rounded-[24px] bg-white/[0.04] p-10">
        <h2 className="mb-6 text-xl text-white">Sites</h2>
        {sites.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-white/30">No sites added yet.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-[background-color,transform] hover:bg-zinc-100 motion-safe:active:scale-[0.97]"
            >
              Add your first site
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <div key={site.id} className="rounded-lg border border-white/[0.06] p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{site.name}</p>
                    <p className="text-xs text-white/40">{site.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/${site.id}`)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white motion-safe:active:scale-[0.97]"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(site.id, site.name)}
                      disabled={deletingId === site.id}
                      className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400/70 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 motion-safe:active:scale-[0.97]"
                    >
                      {deletingId === site.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-lg bg-white/[0.05] px-3 py-2 text-xs text-white/50">
                    {`<script src="${appUrl}/tracker.js" data-site-id="${site.id}" defer></script>`}
                  </code>
                  <button
                    onClick={() => copySnippet(site)}
                    className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-white/40 transition-colors hover:border-white/20 hover:text-white/70 motion-safe:active:scale-[0.97]"
                  >
                    {copiedId === site.id ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Account */}
      <section className="rounded-[24px] bg-white/[0.04] p-10">
        <h2 className="mb-6 text-xl text-white">Account</h2>
        <button
          onClick={async () => {
            await authClient.signOut();
            router.push("/sign-in");
          }}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white motion-safe:active:scale-[0.97]"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}

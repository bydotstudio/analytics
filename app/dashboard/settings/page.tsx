"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  async function handleDelete(siteId: string) {
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Billing */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Billing</h2>
        {usage && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={usage.plan === "pro" ? "default" : "secondary"}>
                {usage.plan === "pro" ? "Pro" : "Free"}
              </Badge>
              <span className="text-sm tabular-nums text-muted-foreground">
                {usage.sites}/{usage.limits.sites} sites &middot;{" "}
                {usage.events_this_month.toLocaleString()}/{usage.limits.events_per_month.toLocaleString()} events this month
              </span>
            </div>

            {usage.plan !== "pro" && (
              <div className="rounded-lg bg-muted p-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  Upgrade to Pro for €5/month — up to 5 sites and 20,000 events/month.
                </p>
                <Button
                  onClick={() => authClient.checkout({ slug: "pro" })}
                  className="motion-safe:active:scale-[0.97]"
                >
                  Upgrade to Pro — €5/mo
                </Button>
              </div>
            )}

            {usage.plan === "pro" && (
              <Button
                variant="outline"
                onClick={() => authClient.customer.portal()}
                className="motion-safe:active:scale-[0.97]"
              >
                Manage billing
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Sites */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Sites</h2>
        {sites.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">No sites added yet.</p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="motion-safe:active:scale-[0.97]"
            >
              Add your first site
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sites.map((site) => (
              <div key={site.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{site.name}</p>
                    <p className="text-sm text-muted-foreground">{site.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/${site.id}`)}
                      className="motion-safe:active:scale-[0.97]"
                    >
                      View
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === site.id}
                          className="motion-safe:active:scale-[0.97]"
                        >
                          {deletingId === site.id ? "Deleting…" : "Delete"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {site.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the site and all its pageview data. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="motion-safe:active:scale-[0.97]">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDelete(site.id)}
                            className="motion-safe:active:scale-[0.97]"
                          >
                            Delete site
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {`<script src="${appUrl}/tracker.js" data-site-id="${site.id}" defer></script>`}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copySnippet(site)}
                    className="shrink-0 motion-safe:active:scale-[0.97]"
                  >
                    {copiedId === site.id ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {/* Account */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Account</h2>
        <Button
          variant="outline"
          onClick={async () => {
            await authClient.signOut();
            router.push("/sign-in");
          }}
          className="motion-safe:active:scale-[0.97]"
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}

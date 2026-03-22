"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Globe, ChevronDown, Settings, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { DashboardModeProvider, useDashboardMode } from "@/contexts/dashboard-mode";
import ModeToggle from "@/components/dashboard/ModeToggle";
import type { Site, ViewMode } from "@/types/analytics";

interface UsageData {
  plan: string;
  sites: number;
  events_this_month: number;
  limits: { sites: number; events_per_month: number };
}

// ── Site selector pill ────────────────────────────────────────────────────────

function SiteSelector({
  sites,
  selectedSiteId,
  onSelect,
}: {
  sites: Site[];
  selectedSiteId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = sites.find((s) => s.id === selectedSiteId);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (sites.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-[46px] items-center rounded-full bg-white/[0.06] p-[3px] transition-colors duration-150 hover:bg-white/[0.1]"
      >
        <div className="flex h-full items-center gap-2 rounded-full px-4">
          <Globe size={14} className="text-white/70 shrink-0" />
          <span className="text-sm font-medium text-white whitespace-nowrap">
            {selected?.domain ?? selected?.name ?? "Select site"}
          </span>
          <ChevronDown
            size={14}
            className={`text-white/70 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-800 py-1 shadow-2xl">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => {
                onSelect(site.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors duration-100 ${
                site.id === selectedSiteId
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Globe size={13} className="shrink-0 opacity-60" />
              {site.domain || site.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── User avatar with dropdown ─────────────────────────────────────────────────

function UserAvatar({ isPro }: { isPro: boolean }) {
  const [user, setUser] = useState<{ name?: string; email?: string; image?: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res?.data?.user) setUser(res.data.user);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "·";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative size-[46px] block transition-opacity duration-150 hover:opacity-80"
      >
        <div className="size-[46px] overflow-hidden rounded-full bg-zinc-700 flex items-center justify-center">
          {user?.image ? (
            <img src={user.image} alt={user.name ?? ""} className="size-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-white">{initial}</span>
          )}
        </div>
        {isPro && (
          <div className="absolute -left-1 bottom-0.5 flex items-center justify-center rounded-full bg-white px-1 py-0.5">
            <span className="font-mono text-[8px] font-bold leading-none text-black">PRO</span>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-zinc-800 shadow-2xl">
          <div className="border-b border-white/[0.06] px-4 py-3">
            {user?.name && (
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
            )}
            <p className="text-xs text-white/50 truncate mt-0.5">{user?.email ?? "—"}</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors duration-100 hover:bg-white/5 hover:text-white"
            >
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors duration-100 hover:bg-white/5 hover:text-red-300"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Header (needs context) ────────────────────────────────────────────────────

function DashboardHeader({
  sites,
  selectedSiteId,
  onSelectSite,
  onAddSite,
  isPro,
}: {
  sites: Site[];
  selectedSiteId: string | undefined;
  onSelectSite: (id: string) => void;
  onAddSite: () => void;
  isPro: boolean;
}) {
  const { mode, setMode } = useDashboardMode();
  const router = useRouter();

  function handleToggle(next: ViewMode) {
    setMode(next);
    if (next === "simple" && selectedSiteId) {
      router.push(`/dashboard/${selectedSiteId}`);
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[#0f0f0f] flex items-center justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 lg:px-12 lg:py-6 xl:px-16 xl:py-8">
      {/* Left */}
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="shrink-0">
          <img src="/logo.svg" alt="Analytics" className="h-5 invert" />
        </Link>
        <div className="flex items-center gap-3">
          <ModeToggle mode={mode} onToggle={handleToggle} />
          <SiteSelector
            sites={sites}
            selectedSiteId={selectedSiteId}
            onSelect={onSelectSite}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard/settings"
          className="text-white/60 transition-colors duration-150 hover:text-white"
        >
          <Settings size={20} />
        </Link>
        <div className="flex items-center gap-4">
          <button
            onClick={onAddSite}
            className="flex items-center gap-2 rounded-full bg-white px-[18px] py-3 text-sm font-medium text-black transition-[background-color,transform] duration-150 hover:bg-zinc-100 motion-safe:active:scale-[0.97]"
          >
            <Plus size={14} />
            Add site
          </button>
          <UserAvatar isPro={isPro} />
        </div>
      </div>
    </header>
  );
}

// ── Root dashboard layout ─────────────────────────────────────────────────────

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
      if (e.key === "Escape") {
        setShowAddSite(false);
        setEmbedSite(null);
      }
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
        const target =
          sitesData.find((s) => s.id === (currentSiteId ?? saved)) ?? sitesData[0];
        if (target) setSelectedSiteId(target.id);
        if (!currentSiteId && target) {
          router.replace(`/dashboard/${target.id}`);
        }
      })
      .catch(console.error);
  }, []);

  function handleSelectSite(id: string) {
    localStorage.setItem("lastSiteId", id);
    setSelectedSiteId(id);
    router.push(`/dashboard/${id}`);
  }

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
  const isPro = usage?.plan === "pro";

  return (
    <DashboardModeProvider>
      <div className="flex min-h-dvh flex-col bg-[#0f0f0f]">
        <DashboardHeader
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={handleSelectSite}
          onAddSite={() => setShowAddSite(true)}
          isPro={isPro}
        />

        {!isPro && usage && (
          <div className="border-b border-amber-900/50 bg-amber-950/30 px-4 py-2 text-center text-sm text-amber-400">
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

        <main className="flex w-full flex-1 flex-col px-4 pt-6 pb-16 sm:px-6 md:px-8 lg:px-12 xl:px-16">{children}</main>

        {showAddSite && (
          <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="modal-card w-full max-w-md rounded-[24px] bg-white/[0.04] p-10 shadow-2xl backdrop-blur-sm">
              <h2 className="mb-6 text-xl text-white">Add a site</h2>
              <form onSubmit={handleAddSite} className="space-y-3">
                <input
                  type="text"
                  placeholder="Site name"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:bg-white/[0.07]"
                />
                <input
                  type="text"
                  placeholder="Domain (e.g. example.com)"
                  value={newSiteDomain}
                  onChange={(e) => setNewSiteDomain(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:bg-white/[0.07]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 rounded-lg bg-white py-2 text-sm font-medium text-black transition-[background-color,transform,opacity] duration-150 hover:bg-zinc-100 motion-safe:active:scale-[0.97] disabled:opacity-50"
                  >
                    {adding ? "Adding…" : "Add site"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSite(false)}
                    className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/60 transition-[background-color,transform] duration-150 hover:bg-white/5 motion-safe:active:scale-[0.97]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {embedSite && (
          <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="modal-card w-full max-w-lg rounded-[24px] bg-white/[0.04] p-10 shadow-2xl backdrop-blur-sm">
              <h2 className="mb-2 text-xl text-white">Embed snippet</h2>
              <p className="mb-3 text-sm text-white/50">
                Add this to the <code className="text-white/70">&lt;head&gt;</code> of your site:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-white/5 p-3 text-xs text-white/80">
                {`<script src="${appUrl}/tracker.js" data-site-id="${embedSite.id}" defer></script>`}
              </pre>
              <button
                onClick={() => setEmbedSite(null)}
                className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm text-white/60 transition-[background-color,transform] duration-150 hover:bg-white/5 motion-safe:active:scale-[0.97]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardModeProvider>
  );
}

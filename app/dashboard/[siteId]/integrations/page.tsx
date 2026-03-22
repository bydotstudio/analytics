"use client";

import { use, useState, useEffect } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SecretInput({ label, placeholder, onSave, saving }: {
  label: string;
  placeholder: string;
  onSave: (val: string) => Promise<void>;
  saving: boolean;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/40">{label}</label>
      <div className="flex gap-2">
        <input
          type="password"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-white placeholder:text-white/20 outline-none focus:border-white/20"
        />
        <button
          disabled={!val.trim() || saving}
          onClick={() => onSave(val.trim()).then(() => setVal(""))}
          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition-[background-color,opacity] hover:bg-zinc-100 disabled:opacity-30"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({ title, badge, connected, webhookUrl, secretLabel, secretPlaceholder, onSave, saving, steps }: {
  title: string;
  badge: string;
  connected: boolean;
  webhookUrl: string;
  secretLabel: string;
  secretPlaceholder: string;
  onSave: (val: string) => Promise<void>;
  saving: boolean;
  steps: string[];
}) {
  return (
    <div className="rounded-[24px] bg-white/[0.04] p-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xl text-white">{title}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${connected ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-white/40"}`}>
          {badge}
        </span>
      </div>

      <div className="mb-4 space-y-1.5">
        <p className="text-xs font-medium text-white/40">Webhook URL</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg bg-white/[0.05] px-3 py-2 text-xs text-white/60">
            {webhookUrl}
          </code>
          <CopyButton text={webhookUrl} />
        </div>
      </div>

      <SecretInput label={secretLabel} placeholder={secretPlaceholder} onSave={onSave} saving={saving} />

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <p className="mb-2 text-xs font-medium text-white/40">Setup steps</p>
        <ol className="space-y-1">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-xs text-white/30">
              <span className="shrink-0 font-semibold text-white/40">{i + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: step }} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function IntegrationsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ls: boolean; stripe: boolean; polar: boolean } | null>(null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => {
    fetch(`/api/sites/${siteId}/integrations`)
      .then((r) => r.json())
      .then((d) => setStatus({ ls: d.ls_configured, stripe: d.stripe_configured, polar: d.polar_configured }))
      .catch(() => {});
  }, [siteId]);

  async function save(field: "ls_webhook_secret" | "stripe_webhook_secret" | "polar_webhook_secret", value: string) {
    setSaving(true);
    await fetch(`/api/sites/${siteId}/integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const d = await fetch(`/api/sites/${siteId}/integrations`).then((r) => r.json());
    setStatus({ ls: d.ls_configured, stripe: d.stripe_configured, polar: d.polar_configured });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-white/60">Revenue Integrations</h2>
        <p className="mt-1 text-xs text-white/30">Connect your payment provider to automatically track revenue events.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IntegrationCard
          title="Polar" badge={status?.polar ? "✓ Connected" : "Not connected"} connected={status?.polar ?? false}
          webhookUrl={`${appUrl}/api/webhooks/polar/${siteId}`}
          secretLabel="Webhook secret" secretPlaceholder="Paste your webhook secret…"
          onSave={(val) => save("polar_webhook_secret", val)} saving={saving}
          steps={[
            'Go to <strong>Polar → Settings → Webhooks</strong>',
            'Click <strong>Add endpoint</strong> and paste the URL above',
            'Enable events: <code class="font-mono">order.created</code>, <code class="font-mono">subscription.created</code>',
            'Copy the <strong>webhook secret</strong> and paste it above',
          ]}
        />
        <IntegrationCard
          title="Lemon Squeezy" badge={status?.ls ? "✓ Connected" : "Not connected"} connected={status?.ls ?? false}
          webhookUrl={`${appUrl}/api/webhooks/lemonsqueezy/${siteId}`}
          secretLabel="Signing secret" secretPlaceholder="Paste your webhook signing secret…"
          onSave={(val) => save("ls_webhook_secret", val)} saving={saving}
          steps={[
            'Go to <strong>Lemon Squeezy → Settings → Webhooks</strong>',
            'Click <strong>Add webhook</strong> and paste the URL above',
            'Enable events: <code class="font-mono">order_created</code>, <code class="font-mono">subscription_created</code>, <code class="font-mono">subscription_payment_success</code>',
            'Copy the <strong>Signing secret</strong> and paste it above',
          ]}
        />
        <IntegrationCard
          title="Stripe" badge={status?.stripe ? "✓ Connected" : "Not connected"} connected={status?.stripe ?? false}
          webhookUrl={`${appUrl}/api/webhooks/stripe/${siteId}`}
          secretLabel="Webhook signing secret (whsec_…)" secretPlaceholder="whsec_…"
          onSave={(val) => save("stripe_webhook_secret", val)} saving={saving}
          steps={[
            'Go to <strong>Stripe Dashboard → Developers → Webhooks</strong>',
            'Click <strong>Add endpoint</strong> and paste the URL above',
            'Select events: <code class="font-mono">checkout.session.completed</code>, <code class="font-mono">invoice.paid</code>',
            'Copy the <strong>Signing secret</strong> (starts with <code class="font-mono">whsec_</code>) and paste it above',
          ]}
        />
      </div>

      <div className="rounded-[24px] bg-white/[0.04] p-10">
        <p className="mb-2 text-xl text-white">Or track manually from your frontend</p>
        <p className="mb-3 text-xs text-white/40">Call after any successful payment — works with any provider:</p>
        <pre className="overflow-x-auto rounded-lg bg-white/[0.05] p-3 text-xs text-white/60">{`// After payment succeeds
analytics.track('purchase', { revenue: 49.99, currency: 'USD' })

// After subscription starts
analytics.track('subscription_started', { revenue: 9.99, currency: 'USD' })`}</pre>
      </div>
    </div>
  );
}

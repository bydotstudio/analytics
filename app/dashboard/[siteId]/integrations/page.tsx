"use client";

import { use, useState, useEffect } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
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
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      <div className="flex gap-2">
        <input
          type="password"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <button
          disabled={!val.trim() || saving}
          onClick={() => onSave(val.trim()).then(() => setVal(""))}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-[background-color,opacity] hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({ title, badge, webhookUrl, secretLabel, secretPlaceholder, onSave, saving, docsUrl, steps }: {
  title: string;
  badge: string;
  webhookUrl: string;
  secretLabel: string;
  secretPlaceholder: string;
  onSave: (val: string) => Promise<void>;
  saving: boolean;
  docsUrl: string;
  steps: string[];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">{badge}</span>
        </div>
      </div>

      <div className="mb-4 space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Webhook URL</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {webhookUrl}
          </code>
          <CopyButton text={webhookUrl} />
        </div>
      </div>

      <SecretInput
        label={secretLabel}
        placeholder={secretPlaceholder}
        onSave={onSave}
        saving={saving}
      />

      <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <p className="mb-2 text-xs font-medium text-zinc-500">Setup steps</p>
        <ol className="space-y-1">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-xs text-zinc-400">
              <span className="shrink-0 font-semibold text-zinc-500">{i + 1}.</span>
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

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
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Revenue Integrations</h2>
        <p className="mt-1 text-xs text-zinc-400">Connect your payment provider to automatically track revenue events.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IntegrationCard
          title="Polar"
          badge={status?.polar ? "✓ Connected" : "Not connected"}
          webhookUrl={`${appUrl}/api/webhooks/polar/${siteId}`}
          secretLabel="Webhook secret"
          secretPlaceholder="Paste your webhook secret…"
          onSave={(val) => save("polar_webhook_secret", val)}
          saving={saving}
          docsUrl="https://docs.polar.sh/api-and-sdk/webhooks"
          steps={[
            'Go to <strong>Polar → Settings → Webhooks</strong>',
            'Click <strong>Add endpoint</strong> and paste the URL above',
            'Enable events: <code class="font-mono">order.created</code>, <code class="font-mono">subscription.created</code>',
            'Copy the <strong>webhook secret</strong> and paste it above',
          ]}
        />
        <IntegrationCard
          title="Lemon Squeezy"
          badge={status?.ls ? "✓ Connected" : "Not connected"}
          webhookUrl={`${appUrl}/api/webhooks/lemonsqueezy/${siteId}`}
          secretLabel="Signing secret"
          secretPlaceholder="Paste your webhook signing secret…"
          onSave={(val) => save("ls_webhook_secret", val)}
          saving={saving}
          docsUrl="https://docs.lemonsqueezy.com/help/webhooks"
          steps={[
            'Go to <strong>Lemon Squeezy → Settings → Webhooks</strong>',
            'Click <strong>Add webhook</strong> and paste the URL above',
            'Enable events: <code class="font-mono">order_created</code>, <code class="font-mono">subscription_created</code>, <code class="font-mono">subscription_payment_success</code>',
            'Copy the <strong>Signing secret</strong> and paste it above',
          ]}
        />

        <IntegrationCard
          title="Stripe"
          badge={status?.stripe ? "✓ Connected" : "Not connected"}
          webhookUrl={`${appUrl}/api/webhooks/stripe/${siteId}`}
          secretLabel="Webhook signing secret (whsec_…)"
          secretPlaceholder="whsec_…"
          onSave={(val) => save("stripe_webhook_secret", val)}
          saving={saving}
          docsUrl="https://stripe.com/docs/webhooks"
          steps={[
            'Go to <strong>Stripe Dashboard → Developers → Webhooks</strong>',
            'Click <strong>Add endpoint</strong> and paste the URL above',
            'Select events: <code class="font-mono">checkout.session.completed</code>, <code class="font-mono">invoice.paid</code>',
            'Copy the <strong>Signing secret</strong> (starts with <code class="font-mono">whsec_</code>) and paste it above',
          ]}
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Or track manually from your frontend</p>
        <p className="mb-3 text-xs text-zinc-400">Call after any successful payment — works with any provider:</p>
        <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{`// After payment succeeds
analytics.track('purchase', { revenue: 49.99, currency: 'USD' })

// After subscription starts
analytics.track('subscription_started', { revenue: 9.99, currency: 'USD' })`}</pre>
      </div>
    </div>
  );
}

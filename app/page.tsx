import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-dvh bg-white dark:bg-zinc-950 font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <img src="/logo.svg" alt="Analytics" className="h-5 dark:invert" />
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-[background-color,transform] duration-150 hover:text-zinc-900 motion-safe:active:scale-[0.97] dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-zinc-700 motion-safe:active:scale-[0.97] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          No cookie banner required
        </div>
        <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-6xl">
          Simple analytics,
          <br />
          <span className="text-zinc-400">for $5/month</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
          Lightweight, privacy-friendly website analytics. One script tag and
          you&apos;re done. No cookies, no GDPR headaches.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-xl bg-zinc-900 px-6 py-3 text-base font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] transition-[background-color,transform] duration-150 hover:bg-zinc-700 motion-safe:active:scale-[0.97] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start tracking — $5/mo
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl border border-zinc-200 px-6 py-3 text-base font-medium text-zinc-600 transition-[background-color,border-color,transform] duration-150 hover:border-zinc-300 hover:bg-zinc-50 motion-safe:active:scale-[0.97] dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Privacy features */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "No cookie banner",
              body: "We use localStorage, not cookies. Your visitors never see a consent dialog — no friction, no compliance headaches.",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              ),
            },
            {
              title: "GDPR & CCPA friendly",
              body: "No personal data is collected. No fingerprinting, no cross-site tracking. Compliant by design, not by configuration.",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-2.132-.558-4.135-1.536-5.872" />
              ),
            },
            {
              title: "Under 1 KB",
              body: "The tracker script is 565 bytes. Zero render-blocking, zero impact on your Core Web Vitals or page speed score.",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              ),
            },
          ].map(({ title, body, icon }) => (
            <div key={title} className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mb-3 inline-flex size-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-50">
                <svg className="size-4 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  {icon}
                </svg>
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Up and running in 60 seconds
          </h2>
          <div className="grid gap-10 sm:grid-cols-3">
            <div className="step-item text-center">
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-zinc-900 text-base font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                1
              </div>
              <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Create an account</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Sign up and add your website to the dashboard.
              </p>
            </div>
            <div className="step-item text-center">
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-zinc-900 text-base font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                2
              </div>
              <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Add one script tag</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Paste a single{" "}
                <code className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">
                  &lt;script&gt;
                </code>{" "}
                tag into your site&apos;s{" "}
                <code className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">
                  &lt;head&gt;
                </code>
                .
              </p>
            </div>
            <div className="step-item text-center">
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-zinc-900 text-base font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                3
              </div>
              <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">See your stats</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Pageviews, countries, browsers, and referrers — all live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          One plan, no surprises
        </h2>
        <div className="mx-auto max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
          <div className="mb-6">
            <span className="font-variant-numeric: tabular-nums text-4xl font-bold text-zinc-900 dark:text-zinc-50">$5</span>
            <span className="text-zinc-400">/month</span>
          </div>
          <ul className="mb-8 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            {[
              "Up to 10 websites",
              "1,000,000 events/month",
              "Pageviews, referrers, countries",
              "Device & browser breakdown",
              "Real-time active visitors",
              "SPA navigation tracking",
              "No cookies, GDPR friendly",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <svg className="size-4 shrink-0 text-zinc-900 dark:text-zinc-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="block w-full rounded-xl bg-zinc-900 py-3 text-center text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-zinc-700 motion-safe:active:scale-[0.97] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-100 dark:border-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 px-4 py-8">
          <img src="/logo.svg" alt="Analytics" className="h-4 opacity-30 dark:invert" />
        </div>
      </footer>
    </div>
  );
}

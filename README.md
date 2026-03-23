# Analytics

Lightweight, privacy-friendly website analytics. No cookies, no GDPR headaches, no bloat — just a single script tag and clean stats.

Open source and self-hostable.

---

## Features

- **No cookie banner** — cookieless session identity via daily-rotating SHA-256 hash of `(IP + UA + salt)`. Nothing stored on the visitor's device.
- **GDPR & CCPA friendly** — no IP addresses stored, no cross-site tracking, no fingerprinting, no consent banner required.
- **Under 1 KB** — the tracker script is ~565 bytes. Zero render-blocking, zero impact on Core Web Vitals.
- **Real-time** — live active visitor count, pageviews, referrers, countries, and device breakdown via SSE.
- **SPA support** — tracks client-side navigation automatically via `history.pushState` monkey-patch.
- **Custom events & revenue** — `analytics.track('purchase', { revenue: 49.99, currency: 'USD' })` with a full revenue dashboard.
- **User identification** — `analytics.identify(userId, traits)` links sessions to known users.
- **Performance insights** — Core Web Vitals (LCP, CLS, INP, FCP, TTFB) scored A+–F per page.
- **Experience score** — rage click and dead click detection combined with CWV into a single letter grade.
- **UTM attribution** — first-touch and last-touch campaign attribution dashboard.
- **Visitor journeys** — per-session step-by-step navigation history.
- **Revenue webhooks** — auto-insert purchase events from Polar, Lemon Squeezy, and Stripe with no manual instrumentation.

---

## Pricing

One plan, no surprises.

| Plan | Price | Sites | Events |
|------|-------|-------|--------|
| Pro  | $5/mo | 10    | 1M/month |

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI | React + Tailwind CSS v4 |
| Auth | Better Auth |
| Billing | Polar + `@polar-sh/better-auth` adapter |
| Event store | ClickHouse (MergeTree) |
| Metadata / Billing DB | PostgreSQL |
| Data fetching | TanStack Query v5 |
| Deployment | Docker Compose + Caddy |

---

## Self-hosting

### Prerequisites

- Docker & Docker Compose
- A [Polar](https://polar.sh) account for billing (optional)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/bydotstudio/analytics
   cd analytics
   ```

2. Copy the environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Start all services:
   ```bash
   docker compose up -d
   ```

4. Apply schemas:
   ```bash
   docker compose exec db psql -U postgres -d analytics -f /schema.sql
   docker compose exec clickhouse clickhouse-client --query "$(cat clickhouse/schema.sql)"
   ```

5. (Optional) Seed demo data:
   ```bash
   node scripts/seed.mjs
   ```

### Environment variables

| Variable | Description |
|---|---|
| `BETTER_AUTH_SECRET` | 32+ char random string for auth sessions |
| `NEXT_PUBLIC_APP_URL` | Public URL of your deployment |
| `DATABASE_URL` | PostgreSQL connection string |
| `CLICKHOUSE_URL` | ClickHouse HTTP endpoint (e.g. `http://localhost:8123`) |
| `CLICKHOUSE_DB` | ClickHouse database name (default: `analytics`) |
| `CLICKHOUSE_USER` | ClickHouse username |
| `CLICKHOUSE_PASSWORD` | ClickHouse password |
| `DAILY_SALT_SECRET` | Secret mixed into cookieless session hash |
| `POLAR_ACCESS_TOKEN` | Polar API token (billing) |
| `POLAR_PRODUCT_ID` | Polar product ID for the $5/mo plan |
| `POLAR_WEBHOOK_SECRET` | Polar webhook signing secret |

---

## Embed

After adding a site in the dashboard, paste this into your site's `<head>`:

```html
<script src="https://your-domain.com/tracker.js" data-site-id="YOUR_SITE_ID" defer></script>
```

### JavaScript API

```js
// Track a custom event
analytics.track('purchase', { revenue: 49.99, currency: 'USD' })
analytics.track('signup')

// Identify a user (call after login/signup)
analytics.identify('user-123', { name: 'Alice', plan: 'pro' })
```

---

## License

MIT

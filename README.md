# Analytics

Lightweight, privacy-friendly website analytics. No cookies, no GDPR headaches, no bloat — just a single script tag and clean stats.

Open source and self-hostable.

---

## Features

- **No cookie banner** — uses localStorage, not cookies. Visitors never see a consent dialog.
- **GDPR & CCPA friendly** — no personal data collected, no fingerprinting, no cross-site tracking.
- **Under 1 KB** — the tracker script is ~565 bytes. Zero render-blocking, zero impact on Core Web Vitals.
- **Real-time** — live active visitor count, pageviews, referrers, countries, and device breakdown.
- **SPA support** — tracks client-side navigation automatically.

---

## Pricing

One plan, no surprises.

| Plan | Price | Sites | Requests |
|------|-------|-------|----------|
| Pro  | $5/mo | 5     | 1M/month |

---

## Stack

- **Framework** — Next.js (App Router)
- **Auth** — Better Auth
- **Database** — PostgreSQL
- **Billing** — Polar
- **Deployment** — Docker + Caddy

---

## Self-hosting

### Prerequisites

- Docker & Docker Compose
- A PostgreSQL database
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

3. Run the database schema:
   ```bash
   psql $DATABASE_URL < schema.sql
   ```

4. Start the app:
   ```bash
   docker compose up -d
   ```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random secret for auth sessions |
| `NEXT_PUBLIC_APP_URL` | Public URL of your deployment |
| `POLAR_ACCESS_TOKEN` | Polar API token (billing) |
| `POLAR_WEBHOOK_SECRET` | Polar webhook signing secret |

---

## Embed

After adding a site in the dashboard, paste this into your site's `<head>`:

```html
<script src="https://your-domain.com/tracker.js" data-site-id="YOUR_SITE_ID" defer></script>
```

That's it.

---

## License

MIT

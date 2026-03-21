# Product Requirements Document — Analytics

## What It Is

A lightweight, self-hosted website analytics SaaS built by Dot Studio. One script tag on any website starts tracking pageviews, referrers, countries, devices, and browsers — with no cookies, no GDPR consent banners, and no third-party data sharing.

Priced at **€5/month** per account (5 sites, 20,000 events/month).

---

## Problem

Most analytics tools are either too heavy (Google Analytics, Mixpanel), too expensive for small sites, or require significant GDPR compliance work. Founders and indie developers need something that just works: paste a script tag, see your numbers, done.

---

## Target User

- Indie hackers and solo founders
- Small agencies managing a handful of client sites
- Developers who want self-hosted, privacy-respecting analytics without running their own Plausible/Umami instance

---

## Core Features

### Tracking
- Pageview tracking via a ~565-byte embed script (`/tracker.js`)
- Uses `navigator.sendBeacon` (fire-and-forget, survives page unload) with `fetch` fallback
- SPA navigation tracking via `history.pushState` monkey-patch
- Session identity via `localStorage` UUID (no cookies)
- Bot/crawler filtering server-side via regex
- UA parsing: browser, OS, device type (mobile/tablet/desktop)
- Country detection from proxy/CDN headers (Cloudflare `CF-IPCountry`, Vercel `x-vercel-ip-country`)

### Dashboard
- Per-site analytics view with Simple and Advanced modes
- Simple: today / last 7d / last 30d pageview summary
- Advanced: top pages, referrers, countries, devices, browsers
- Live "active visitors" badge (5-minute rolling window)
- Site selector dropdown for switching between tracked sites

### Authentication
- Email + password sign-up and sign-in
- Session-based auth, no OAuth providers

### Billing
- One plan: €5/month
- Checkout, customer portal, and webhook handling via the Polar + Better Auth integration
- Automatic Polar customer creation on sign-up
- Subscription state synced to the `plan` column in the DB via webhooks
- Upgrade prompt shown on dashboard when on free plan

### Usage Limits (enforced server-side)
- Max 5 sites per account — enforced on site creation
- Max 20,000 events/month across all sites — enforced on every tracking request (silent 204 drop if over)
- Usage stats available via `GET /api/billing/usage`

### Settings
- List all sites with embed snippet and copy button
- Delete a site (cascades to all its pageview data)
- Upgrade to Pro / Manage billing via Polar customer portal

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Auth | Better Auth v1.5 |
| Billing | Polar + `@polar-sh/better-auth` adapter |
| Database | PostgreSQL (self-hosted via Docker, or Supabase) |
| DB client | `pg` (node-postgres) |
| Data fetching | TanStack Query v5 |
| UA parsing | `ua-parser-js` v2 |
| Validation | Zod v4 |
| Deployment | Docker Compose + Caddy (Hetzner CX33) |

---

## Data Model

```
user
  id, name, email, email_verified
  plan (free | pro)
  polar_subscription_id
  created_at, updated_at

sites
  id (UUID), user_id, name, domain, created_at

page_views
  id (BIGSERIAL), site_id, session_id
  pathname, referrer, country, device_type, browser, os
  timestamp
```

---

## API Surface

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/track` | Receive pageview events (public, CORS open) |
| `GET` | `/api/sites` | List user's sites |
| `POST` | `/api/sites` | Create a site (limit: 5) |
| `DELETE` | `/api/sites/[siteId]` | Delete a site |
| `GET` | `/api/stats/summary` | Today / 7d / 30d counts |
| `GET` | `/api/stats/active` | Active visitors (last 5 min) |
| `GET` | `/api/stats/pages` | Top pages breakdown |
| `GET` | `/api/stats/referrers` | Top referrers breakdown |
| `GET` | `/api/stats/countries` | Country breakdown |
| `GET` | `/api/stats/devices` | Device/browser breakdown |
| `GET` | `/api/billing/usage` | Current plan + usage counts |
| `*` | `/api/auth/polar/*` | Polar checkout, portal, webhooks (via Better Auth adapter) |
| `*` | `/api/auth/[...all]` | Better Auth session endpoints |

---

## Key Decisions

**sendBeacon over fetch** — Survives page unload without the `keepalive` hack. Falls back to fetch for old browsers.

**No cookies** — Session ID lives in `localStorage`. No consent banner needed in most jurisdictions.

**Silent 204 on limit** — When a site exceeds 20k events/month, the tracking endpoint returns 204 with no error. The embed script doesn't retry, the user's site is unaffected, and data simply stops being recorded.

**Polar + Better Auth adapter** — Rather than building custom checkout/webhook routes, the `@polar-sh/better-auth` plugin integrates billing directly into the auth layer. Webhook handler lives at `/api/auth/polar/webhooks`. Polar customer `externalId` = Better Auth `user.id`.

**Self-hosted Postgres** — No managed DB dependency in production. Schema is a single `schema.sql` file; migrations are manual SQL `ALTER TABLE` statements.

---

## Environment Variables

```
BETTER_AUTH_SECRET        # 32+ char random string
NEXT_PUBLIC_APP_URL       # Public URL of the app
DATABASE_URL              # postgres connection string
POLAR_ACCESS_TOKEN        # Polar API token
POLAR_PRODUCT_ID          # Polar product ID for the €5/mo plan
POLAR_WEBHOOK_SECRET      # Signing secret for webhook verification
```

---

## Deployment

- **Runtime**: Docker Compose (`app` + `db` services)
- **Reverse proxy**: Caddy (automatic HTTPS)
- **Target host**: Hetzner CX33 (4 vCPU, 8GB RAM)
- **Local dev webhooks**: `polar listen http://localhost:3000/` (Polar CLI tunnel)

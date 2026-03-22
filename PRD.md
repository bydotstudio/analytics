# Product Requirements Document — Analytics

## What It Is

A lightweight, self-hosted website analytics SaaS built by Dot Studio. One script tag on any website starts tracking pageviews, referrers, countries, devices, browsers, custom events, revenue, and performance — with no cookies, no GDPR consent banners, and no third-party data sharing.

Priced at **€5/month** per account (5 sites, 20,000 events/month).

---

## Problem

Most analytics tools are either too heavy (Google Analytics, Mixpanel), too expensive for small sites, or require significant GDPR compliance work. Founders and indie developers need something that just works: paste a script tag, see your numbers, track revenue, done.

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

### Custom Events & Revenue Attribution
- `analytics.track(name, props)` — call after any payment, signup, button click, etc.
- Optional `revenue` and `currency` fields for revenue attribution
- Example: `analytics.track('purchase', { revenue: 49.99, currency: 'USD' })`
- Revenue dashboard: total revenue, conversion count, top events, top converting pages

### User Identification
- `analytics.identify(userId, traits)` — link a session to a known user
- Example: `analytics.identify('user-123', { name: 'Alice', plan: 'pro' })`
- Upserts to `identified_sessions` (conflict on site_id + session_id)
- Identification rate card shows identified vs anonymous session ratio

### Performance Insights (A+ Experience Score)
- Async perf tracker (`tracker-perf.js`) loads after `requestIdleCallback` — never blocks the page
- Collects Core Web Vitals: LCP, CLS, INP, FCP, TTFB via `web-vitals` ESM (CDN)
- Server-side grade computation — thresholds:

| Metric | A+     | A      | B      | C      | D      | F     |
|--------|--------|--------|--------|--------|--------|-------|
| LCP    | ≤1200ms | ≤2500ms | ≤3000ms | ≤4000ms | ≤6000ms | >6000ms |
| CLS    | ≤0.05  | ≤0.10  | ≤0.15  | ≤0.25  | ≤0.35  | >0.35 |
| INP    | ≤100ms | ≤200ms | ≤300ms | ≤500ms | ≤700ms | >700ms |
| FCP    | ≤900ms | ≤1800ms | ≤2200ms | ≤3000ms | ≤4500ms | >4500ms |
| TTFB   | ≤100ms | ≤200ms | ≤500ms | ≤800ms | ≤1500ms | >1500ms |

- Overall page grade = worst of five metrics
- Dashboard: large letter grade per page, colored badge per metric cell

### Realtime Analytics
- SSE stream at `GET /api/realtime/stream?siteId=X`
- Postgres polling every 2s, pushes new pageviews as `event: pageview` SSE frames
- Heartbeat every ~16s to keep connection alive
- Dashboard: live scrolling feed with flag emoji + pathname + "Xs ago"

### Visitor Journeys
- Session list: flag, device icon, page count, duration, identity label
- Click session → modal with ordered steps, timestamps relative to session start
- Sessions from last 7 days, LEFT JOIN with `identified_sessions` for identity info

### Funnel Analysis
- Create named funnels with ordered steps (pathname per step)
- Per-step drop-off % and overall conversion rate
- Horizontal bar chart proportional to step 1 session count
- Stored in `funnels` + `funnel_steps` tables

### Revenue Webhook Integrations
Auto-insert `custom_events` on payment — no manual instrumentation needed:

**Polar** (Standard Webhooks spec)
- Webhook: `POST /api/webhooks/polar/[siteId]`
- Signature: `HMAC-SHA256(webhook-id.webhook-timestamp.body)` → base64
- Events: `order.created` → `purchase`, `subscription.created/active` → `subscription_started`, `subscription.updated` → `subscription_renewed`

**Lemon Squeezy**
- Webhook: `POST /api/webhooks/lemonsqueezy/[siteId]`
- Signature: `HMAC-SHA256(body)` → hex, `X-Signature` header
- Events: `order_created` → `purchase`, `subscription_created` → `subscription_started`, `subscription_payment_success` → `subscription_renewed`

**Stripe**
- Webhook: `POST /api/webhooks/stripe/[siteId]`
- Signature: `HMAC-SHA256(timestamp.body)` → hex, `Stripe-Signature` header, `v1=` prefix, 5-min tolerance
- Events: `checkout.session.completed` → `purchase`, `invoice.paid` → `subscription_renewed`

Integration settings UI at `/dashboard/[siteId]/integrations`:
- Webhook URL per provider (copy button)
- Write-only secret input (never returned to client, only boolean `configured` flag exposed)
- Step-by-step setup instructions per provider

### GDPR Compliance
- No cookies set anywhere
- No IP addresses stored
- No cross-site tracking
- No consent banner required
- Privacy badge shown on dashboard: "No cookies · No IP · GDPR compliant · No consent banner required"

### Dashboard
- Per-site analytics view with Simple and Advanced modes
- Simple: today / last 7d / last 30d pageview summary + privacy badge
- Advanced: top pages, referrers, countries, devices, browsers + identification card
- Live "active visitors" badge (5-minute rolling window)
- Site selector dropdown for switching between tracked sites
- Per-site tab navigation: Overview | Events | Realtime | Journeys | Performance | Funnels | Integrations

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
- Max 20,000 events/month (pageviews + custom_events combined) — enforced on every tracking request (silent 204 drop if over)
- Usage stats available via `GET /api/billing/usage`

### Settings
- List all sites with embed snippet and copy button
- Delete a site (cascades to all its pageview data)
- Upgrade to Pro / Manage billing via Polar customer portal

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Auth | Better Auth v1.5 |
| Billing | Polar + `@polar-sh/better-auth` adapter |
| Database | PostgreSQL (self-hosted via Docker) |
| DB client | `pg` (node-postgres) |
| Data fetching | TanStack Query v5 |
| UA parsing | `ua-parser-js` v2 |
| Validation | Zod v4 |
| Web Vitals | `web-vitals` ESM (unpkg CDN, async) |
| Deployment | Docker Compose + Caddy |

---

## Data Model

```
user
  id, name, email, emailVerified
  plan (free | pro)
  polarCustomerId, polarSubscriptionId
  createdAt, updatedAt

sites
  id (UUID), user_id, name, domain, created_at
  ls_webhook_secret, stripe_webhook_secret, polar_webhook_secret

page_views
  id (BIGSERIAL), site_id, session_id
  pathname, referrer, country, device_type, browser, os
  timestamp

custom_events
  id (BIGSERIAL), site_id, session_id
  name, revenue NUMERIC(12,2), currency CHAR(3)
  properties JSONB, pathname, timestamp

identified_sessions
  id (BIGSERIAL), site_id, session_id
  external_user_id, traits JSONB, identified_at
  UNIQUE(site_id, session_id)

performance_metrics
  id (BIGSERIAL), site_id, session_id, pathname
  lcp, cls, inp, fcp, ttfb (REAL)
  timestamp

funnels
  id (UUID), site_id, name, created_at

funnel_steps
  id (BIGSERIAL), funnel_id, step_order (SMALLINT), pathname, label
```

---

## Tracker API

Embed snippet (add to `<head>`):
```html
<script
  data-site-id="YOUR_SITE_ID"
  src="https://your-domain.com/tracker.js"
  defer
></script>
```

JavaScript API (available as `window.analytics`):
```js
// Track a custom event
analytics.track('purchase', { revenue: 49.99, currency: 'USD' })
analytics.track('signup')
analytics.track('button_click', { label: 'hero-cta' })

// Identify a user (call after login/signup)
analytics.identify('user-123', { name: 'Alice', plan: 'pro' })
```

---

## API Surface

### Public (no auth, CORS open)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/track` | Pageview (core tracker) |
| `POST` | `/api/track/event` | Custom event + optional revenue |
| `POST` | `/api/track/identify` | User identification |
| `POST` | `/api/track/perf` | Core Web Vitals |
| `POST` | `/api/webhooks/polar/[siteId]` | Polar revenue webhook |
| `POST` | `/api/webhooks/lemonsqueezy/[siteId]` | Lemon Squeezy revenue webhook |
| `POST` | `/api/webhooks/stripe/[siteId]` | Stripe revenue webhook |

### Auth-protected
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sites` | List user's sites |
| `POST` | `/api/sites` | Create a site (limit: 5) |
| `DELETE` | `/api/sites/[siteId]` | Delete a site |
| `GET/PATCH` | `/api/sites/[siteId]/integrations` | Integration webhook secrets |
| `GET` | `/api/stats/summary` | Today / 7d / 30d counts |
| `GET` | `/api/stats/active` | Active visitors (last 5 min) |
| `GET` | `/api/stats/pages` | Top pages |
| `GET` | `/api/stats/referrers` | Top referrers |
| `GET` | `/api/stats/countries` | Country breakdown |
| `GET` | `/api/stats/devices` | Device/browser breakdown |
| `GET` | `/api/stats/revenue` | Revenue stats + top events + top pages |
| `GET` | `/api/stats/sessions` | Session list with identity info |
| `GET` | `/api/stats/journey` | Ordered pageviews for a session |
| `GET` | `/api/stats/identification` | Identified vs anonymous ratio |
| `GET` | `/api/stats/performance` | Per-page Core Web Vitals + grades |
| `GET` | `/api/stats/performance/site` | Site-wide averages + overall grade |
| `GET` | `/api/realtime/stream` | SSE stream of live pageviews |
| `GET/POST` | `/api/funnels` | List / create funnels |
| `DELETE` | `/api/funnels/[funnelId]` | Delete a funnel |
| `GET` | `/api/funnels/[funnelId]/stats` | Per-step drop-off data |
| `GET` | `/api/billing/usage` | Current plan + usage counts |
| `*` | `/api/auth/polar/*` | Polar checkout, portal, webhooks |
| `*` | `/api/auth/[...all]` | Better Auth session endpoints |

---

## Key Decisions

**sendBeacon over fetch** — Survives page unload without the `keepalive` hack. Falls back to fetch for old browsers.

**No cookies** — Session ID lives in `localStorage`. No consent banner needed in most jurisdictions.

**Silent 204 on limit** — When a site exceeds 20k events/month, the tracking endpoint returns 204 with no error. The embed script doesn't retry, the user's site is unaffected, and data simply stops being recorded.

**Polar + Better Auth adapter** — Billing integrated directly into the auth layer. Webhook handler at `/api/auth/polar/webhooks`. Polar customer `externalId` = Better Auth `user.id`.

**Self-hosted Postgres only** — No managed DB dependency. Schema is `schema.sql` at project root; migrations are manual `ALTER TABLE` statements.

**SSE via Postgres polling** — Realtime uses 2-second Postgres polling (not LISTEN/NOTIFY) to avoid connection pinning with `pg.Pool`. Clean abort via `request.signal`.

**Server-side performance grading** — Grade thresholds computed in the route handler, not the client, so they can change without frontend deploys.

**Webhook secrets write-only** — Integration secrets are stored per-site in DB. The GET endpoint returns only boolean `configured` flags — never the actual secret values.

---

## Environment Variables

```
BETTER_AUTH_SECRET        # 32+ char random string
NEXT_PUBLIC_APP_URL       # Public URL of the app
DATABASE_URL              # postgres connection string
POLAR_ACCESS_TOKEN        # Polar API token
POLAR_PRODUCT_ID          # Polar product ID for the €5/mo plan
POLAR_WEBHOOK_SECRET      # Signing secret for Better Auth Polar webhook
```

---

## Deployment

- **Runtime**: Docker Compose (`app` + `db` services)
- **Reverse proxy**: Caddy (automatic HTTPS)
- **Target host**: Hetzner CX33 (4 vCPU, 8GB RAM)
- **Schema**: Run `schema.sql` against the Postgres container on first deploy and after migrations
- **Local dev webhooks**: `polar listen http://localhost:3000/` (Polar CLI tunnel)

### Setup
```bash
# 1. Start database
docker compose up -d

# 2. Apply schema
docker compose exec db psql -U postgres -d analytics -f /schema.sql
# or: psql $DATABASE_URL < schema.sql

# 3. Install dependencies
npm install

# 4. Seed demo data (optional)
node scripts/seed.mjs

# 5. Start dev server
npm run dev
```

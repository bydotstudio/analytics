# Product Requirements Document — Analytics

## What It Is

A lightweight, self-hosted website analytics SaaS built by Dot Studio. One script tag on any website starts tracking pageviews, referrers, countries, devices, browsers, custom events, revenue, and performance — with no cookies, no GDPR consent banners, and no third-party data sharing.

Priced at **$5/month** per account (10 sites, 1,000,000 events/month).

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
- **Cookieless session identity**: daily-rotating SHA-256 hash of `(IP + UA + salt)` — no cookies, no `localStorage` UUID
- **GDPR-first by design**: no IP addresses stored, no cross-site tracking, no consent banner required
- Bot/crawler filtering server-side via regex
- UA parsing: browser, OS, device type (mobile/tablet/desktop)
- Country detection: CDN headers first (`CF-IPCountry`, `x-vercel-ip-country`, `x-country`), falling back to MaxMind GeoLite2 MMDB for self-hosted accuracy

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

### Experience Score (Behavioral Signals)
- **Rage clicks**: detected when 3+ rapid clicks land within a 10px radius within 600ms — signals user frustration
- **Dead clicks**: detected when a click produces no DOM mutation or navigation within 1s — signals broken/confusing UI
- Both signals sent via the existing `/api/track/event` endpoint with a reserved `__rage_click` / `__dead_click` event name
- Dashboard: Experience Score card combining CWV grade + behavioral signal rate into a single letter grade per page

### Performance Insights (Core Web Vitals Scoring)
- Async perf tracker (`tracker-perf.js`) loads after `requestIdleCallback` — never blocks the page
- Collects Core Web Vitals: LCP, CLS, INP, FCP, TTFB via `web-vitals` ESM (CDN)
- Server-side grade computation — thresholds:

| Metric | A+      | A       | B       | C       | D       | F      |
|--------|---------|---------|---------|---------|---------|--------|
| LCP    | ≤1200ms | ≤2500ms | ≤3000ms | ≤4000ms | ≤6000ms | >6000ms |
| CLS    | ≤0.05   | ≤0.10   | ≤0.15   | ≤0.25   | ≤0.35   | >0.35  |
| INP    | ≤100ms  | ≤200ms  | ≤300ms  | ≤500ms  | ≤700ms  | >700ms |
| FCP    | ≤900ms  | ≤1800ms | ≤2200ms | ≤3000ms | ≤4500ms | >4500ms |
| TTFB   | ≤100ms  | ≤200ms  | ≤500ms  | ≤800ms  | ≤1500ms | >1500ms |

- Overall page grade = worst of five metrics
- Dashboard: large letter grade per page, colored badge per metric cell

### UTM Attribution
- Tracker automatically captures `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` from the landing page URL
- Stored alongside each pageview event in ClickHouse
- Attribution dashboard: top campaigns by sessions, conversions, and revenue; first-touch vs last-touch toggle

### Realtime Analytics
- SSE stream at `GET /api/realtime/stream?siteId=X`
- ClickHouse polling every 2s, pushes new pageviews as `event: pageview` SSE frames
- Heartbeat every ~16s to keep connection alive
- Dashboard: live scrolling feed with flag emoji + pathname + "Xs ago"

### Visitor Journeys
- Session list: flag, device icon, page count, duration, identity label
- Click session → modal with ordered steps, timestamps relative to session start
- Sessions from last 7 days, LEFT JOIN with `identified_sessions` for identity info

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

### Transactional Emails (Resend)
- **Email verification**: sent on sign-up via Better Auth `sendVerificationEmail` hook
- **Password reset**: sent on request via Better Auth `sendResetPassword` hook
- **Weekly digest**: every verified user receives a summary per site — visitors this week, top 5 pages, top 5 countries, total revenue — triggered via `GET /api/cron/weekly-digest` (cron-secret auth)
- All emails rendered as inline-HTML (dark theme, no external CSS)
- Sender address configurable via `RESEND_FROM`

### GDPR Compliance
- No cookies set anywhere
- No IP addresses stored
- No cross-site tracking
- No consent banner required
- Session identity uses daily-rotating SHA-256 hashes — salted per-day so sessions cannot be linked across days
- Privacy badge shown on dashboard: "No cookies · No IP · GDPR compliant · No consent banner required"

### Dashboard
- Per-site analytics view with Simple and Advanced modes
- Simple: 2×3 grid of large stat cards — today, active now (live), this week, this month, top country (flag emoji), top referrer + privacy badge
- Advanced: top pages, referrers, countries, devices, browsers + identification card
- Live "active visitors" badge (5-minute rolling window)
- Site selector dropdown for switching between tracked sites
- Per-site tab navigation: Overview | Events | Realtime | Journeys | Performance | Integrations

### Authentication
- Email + password sign-up and sign-in via Better Auth
- Email verification required; password reset via Resend
- Session-based auth, no OAuth providers

### Billing
- One plan: **$5/month** (Pro) — includes 10 sites and 1,000,000 events/month
- Checkout, customer portal, and webhook handling via the Polar + Better Auth integration
- Automatic Polar customer creation on sign-up
- Subscription state synced to the `plan` column in the DB via webhooks

### Usage Limits (enforced server-side)
- Max **10 sites** per account — enforced on site creation
- Max **1,000,000 events/month** (pageviews + custom events combined, counted in ClickHouse) — no free tier; all accounts get the same limit
- Usage stats available via `GET /api/billing/usage`

### Security
- **IP-based rate limiting**: in-memory sliding-window, 120 requests per 60-second window per IP; 429 response with `Retry-After` header
- **Site ownership verification**: every stats read calls `verifySiteOwnership` which runs inside a transaction with `set_config('app.current_user_id', ...)` — backed by a Postgres RLS policy on the `sites` table
- **CORS guard**: `proxy.ts` blocks cross-origin requests to all `/api/stats/*` routes (`403 Forbidden` if `Origin` header is present and doesn't match `NEXT_PUBLIC_APP_URL`); direct API calls without `Origin` are unaffected
- **Webhook secrets write-only**: integration secrets are stored per-site in DB; GET endpoint returns only boolean `configured` flags

### Settings
- List all sites with embed snippet and copy button
- Delete a site (cascades to all its event data)
- Upgrade to Pro / Manage billing via Polar customer portal

---

## Design System

Dark-first (`#0f0f0f` page background). All values are always-dark — no `dark:` Tailwind variants.

- **Cards**: `bg-white/[0.04]` (overview stat cards), `bg-zinc-900` (data cards)
- **Card radius**: `rounded-[24px]` (stat cards), `rounded-xl` (data cards)
- **Borders**: `border-white/[0.06]`
- **Pill surfaces** (header toggles, selectors): `bg-white/[0.06]`, `border-radius: 99px`
- **Active pill state**: `bg-white/10`
- **Text hierarchy**: `text-white` / `text-white/70` / `text-white/50` / `text-white/40` / `text-white/30`
- **Stat card label**: `text-xl` (20px), Inter Regular
- **Stat card value**: `text-[64px]`, Inter SemiBold, `tracking-[-0.03em]`
- **Header padding**: `px-4 py-2` → scales to `xl:px-16 xl:py-8` (64px / 32px at 1440px)
- **Primary CTA**: `bg-white text-black rounded-full`
- **Destructive text**: `text-red-400`
- **Live indicator**: pulsing `bg-emerald-500` dot with `opacity-75 animate-ping` halo

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Auth | Better Auth v1.5 |
| Billing | Polar + `@polar-sh/better-auth` adapter |
| Email | Resend |
| Event store | ClickHouse (MergeTree engine, self-hosted via Docker) |
| Metadata / Billing DB | PostgreSQL (self-hosted via Docker) |
| DB client | `@clickhouse/client` (events) + `pg` node-postgres (metadata) |
| Data fetching | TanStack Query v5 |
| UA parsing | `ua-parser-js` v2 |
| Geo IP | MaxMind GeoLite2 (MMDB, mtime-based hot-reload) |
| Validation | Zod v4 |
| Web Vitals | `web-vitals` ESM (unpkg CDN, async) |
| Deployment | Docker Compose + Caddy |
| Testing | k6 (load), vitest + testcontainers (integration + security) |

---

## Data Model

### ClickHouse (Event Store)

All high-volume event writes land in a single `analytics.events` table. The unified schema covers pageviews, custom events, performance metrics, and behavioral signals — discriminated by `event_type`.

```sql
CREATE TABLE analytics.events
(
    timestamp    DateTime64(3, 'UTC'),
    site_id      UUID,
    event_type   LowCardinality(String),   -- 'pageview' | 'custom' | 'perf' | 'rage_click' | 'dead_click'
    session_id   String,
    visitor_hash String,                   -- SHA256(ip|ua|YYYY-MM-DD|salt), daily-rotating, no PII
    pathname     String,
    referrer     String,
    country      LowCardinality(String),
    browser      LowCardinality(String),
    os           LowCardinality(String),
    device       LowCardinality(String),
    utm_source   String,
    utm_medium   String,
    utm_campaign String,
    event_name   String,                   -- custom events only
    revenue      Nullable(Float64),
    currency     LowCardinality(String),
    properties   String,                   -- JSON for custom event props
    lcp          Nullable(Float64),
    cls          Nullable(Float64),
    inp          Nullable(Float64),
    fcp          Nullable(Float64),
    ttfb         Nullable(Float64)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, toDate(timestamp), session_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 10 YEAR;

-- Materialized view: daily unique visitor aggregates (powers fast summary queries)
CREATE MATERIALIZED VIEW analytics.mv_daily_visitors
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (site_id, date)
AS SELECT
    site_id,
    toDate(timestamp)        AS date,
    uniqState(visitor_hash)  AS visitors_state,
    uniqState(session_id)    AS sessions_state,
    countState()             AS pageviews_state
FROM analytics.events
WHERE event_type = 'pageview'
GROUP BY site_id, date;
```

### PostgreSQL (Metadata & Billing)

Low-volume relational data — users, sites, subscriptions, and session identity — stays in Postgres.

```
user
  id, name, email, emailVerified
  plan (pro | null)
  polarCustomerId, polarSubscriptionId
  createdAt, updatedAt

sites
  id (UUID), user_id, name, domain, created_at
  ls_webhook_secret, stripe_webhook_secret, polar_webhook_secret
  ROW LEVEL SECURITY: sites_owner_isolation policy on user_id

session
  id, userId, token, expiresAt, createdAt, updatedAt, ipAddress, userAgent

identified_sessions
  id (BIGSERIAL), site_id, session_id
  external_user_id, traits JSONB, identified_at
  UNIQUE(site_id, session_id)
```

---

## Cookieless Tracking

Session identity is derived server-side — nothing is stored on the visitor's device.

**Daily-rotating SHA-256 hash**
```
visitor_hash = SHA256( ip_address + user_agent + YYYY-MM-DD + VISITOR_HASH_SALT )
```

- `VISITOR_HASH_SALT` is a secret in the environment; rotate it to invalidate all historical linkage
- The hash is truncated to 16 hex chars for storage efficiency
- Because the salt rotates daily, two visits from the same person on different days produce different session IDs — cross-day linkage is impossible by design
- IP is never written to the database; only the hash is stored
- Satisfies GDPR Article 25 (data minimisation) and ePrivacy Directive without requiring a consent banner

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
| `POST` | `/api/track/perf` | Core Web Vitals + behavioral signals |
| `POST` | `/api/webhooks/polar/[siteId]` | Polar revenue webhook |
| `POST` | `/api/webhooks/lemonsqueezy/[siteId]` | Lemon Squeezy revenue webhook |
| `POST` | `/api/webhooks/stripe/[siteId]` | Stripe revenue webhook |

### Auth-protected
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sites` | List user's sites |
| `POST` | `/api/sites` | Create a site (limit: 10) |
| `DELETE` | `/api/sites/[siteId]` | Delete a site |
| `GET/PATCH` | `/api/sites/[siteId]/integrations` | Integration webhook secrets |
| `GET` | `/api/stats/summary` | Today / 7d / 30d counts + top country + top referrer |
| `GET` | `/api/stats/active` | Active visitors (last 5 min) |
| `GET` | `/api/stats/pages` | Top pages |
| `GET` | `/api/stats/referrers` | Top referrers |
| `GET` | `/api/stats/countries` | Country breakdown |
| `GET` | `/api/stats/devices` | Device/browser breakdown |
| `GET` | `/api/stats/revenue` | Revenue stats + top events + top pages |
| `GET` | `/api/stats/sessions` | Session list with identity info |
| `GET` | `/api/stats/journey` | Ordered pageviews for a session |
| `GET` | `/api/stats/identification` | Identified vs anonymous ratio |
| `GET` | `/api/stats/performance` | Per-page CWV + grades + behavioral score |
| `GET` | `/api/stats/performance/site` | Site-wide averages + overall grade |
| `GET` | `/api/stats/utm` | UTM campaign attribution breakdown |
| `GET` | `/api/realtime/stream` | SSE stream of live pageviews |
| `GET` | `/api/billing/usage` | Current plan + usage counts |
| `*` | `/api/auth/polar/*` | Polar checkout, portal, webhooks |
| `*` | `/api/auth/[...all]` | Better Auth session endpoints |

### Cron (bearer-token auth via `CRON_SECRET`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cron/weekly-digest` | Send weekly summary emails to all verified users |
| `GET` | `/api/cron/refresh-geo` | Download latest GeoLite2 MMDB from MaxMind, atomic rename into place |

---

## Key Decisions

**Unified ClickHouse events table** — All event types (pageview, custom, perf, behavioral) land in a single `analytics.events` table discriminated by `event_type`. Simplifies ingestion, enables cross-type queries, and avoids JOIN overhead. A materialized view pre-aggregates daily visitor counts for fast summary queries.

**ClickHouse for events, Postgres for metadata** — All high-cardinality, time-series event data goes to ClickHouse (MergeTree). Low-volume relational data (users, sites, billing, identified sessions) stays in Postgres. This split keeps Postgres lean and ClickHouse queries fast at scale.

**Monthly usage counted in ClickHouse** — `getMonthlyEventCount` queries ClickHouse directly on each ingest request rather than incrementing a Postgres counter. Eliminates counter drift and avoids write amplification on every tracked event.

**Cookieless SHA-256 session identity** — Session ID is derived from `IP + UA + date + VISITOR_HASH_SALT`, hashed server-side. Nothing is written to the browser. The daily rotation means visits cannot be linked across days, satisfying GDPR data-minimisation requirements without a consent banner.

**sendBeacon over fetch** — Survives page unload without the `keepalive` hack. Falls back to fetch for old browsers.

**Silent 204 on limit** — When a site exceeds the monthly event quota, the tracking endpoint returns 204 with no error. The embed script doesn't retry, the user's site is unaffected, and data simply stops being recorded.

**Polar + Better Auth adapter** — Billing integrated directly into the auth layer. Webhook handler at `/api/auth/polar/webhooks`. Polar customer `externalId` = Better Auth `user.id`.

**SSE via ClickHouse polling** — Realtime uses 2-second ClickHouse polling. Clean abort via `request.signal`.

**Server-side performance grading** — Grade thresholds computed in the route handler, not the client, so they can change without frontend deploys.

**In-memory rate limiter** — Sliding-window per-IP counter in a `Map`. Suitable for single-node deployments; no Redis dependency. Eviction timer prevents unbounded memory growth.

**MaxMind GeoLite2 mtime-based hot-reload** — The geo reader is cached with the MMDB file's `mtime`. When `refresh-geo` atomically replaces the file, the next request detects the changed mtime and reloads the reader — zero restart required.

**CORS guard in proxy.ts** — Stats routes check the `Origin` header and reject cross-origin browser requests. Direct server-to-server calls (no `Origin`) pass through unaffected.

**Webhook secrets write-only** — Integration secrets are stored per-site in DB. The GET endpoint returns only boolean `configured` flags — never the actual secret values.

---

## Environment Variables

```
# Auth
BETTER_AUTH_SECRET        # 32+ char random string for session signing

# App
NEXT_PUBLIC_APP_URL       # Public URL (e.g. https://analytics.yourdomain.com)

# Postgres
DATABASE_URL              # Postgres connection string

# ClickHouse
CLICKHOUSE_URL            # HTTP endpoint (e.g. http://localhost:8123)
CLICKHOUSE_DB             # Database name (default: analytics)
CLICKHOUSE_USER           # Username (default: default)
CLICKHOUSE_PASSWORD       # Password

# Tracking
VISITOR_HASH_SALT         # Secret mixed into cookieless session hash (rotate to invalidate)

# Geo IP
MAXMIND_DB_PATH           # Path to GeoLite2-Country.mmdb (default: ./GeoLite2-Country.mmdb)
MAXMIND_LICENSE_KEY       # MaxMind account license key (for refresh-geo cron)

# Email
RESEND_API_KEY            # Resend API key
RESEND_FROM               # Sender address (default: noreply@example.com)

# Cron
CRON_SECRET               # Bearer token required by /api/cron/* endpoints

# Billing (Polar)
POLAR_ACCESS_TOKEN        # Polar API token
POLAR_PRODUCT_ID          # Polar product ID for the $5/mo plan
POLAR_WEBHOOK_SECRET      # Signing secret for Better Auth Polar webhook
```

---

## Deployment

- **Runtime**: Docker Compose (`app` + `db` + `clickhouse` services)
- **Reverse proxy**: Caddy (automatic HTTPS)
- **Target host**: Hetzner Bare Metal **AX162-S** (AMD Ryzen 9 7950X, 128GB RAM, 2×1.92TB NVMe) — sufficient headroom for ClickHouse MergeTree compaction and high-ingest workloads

### Setup
```bash
# 1. Start all services
docker compose up -d

# 2. Apply schemas
docker compose exec db psql -U postgres -d analytics -f /schema.sql
docker compose exec clickhouse clickhouse-client --queries-file /docker-entrypoint-initdb.d/01-schema.sql

# 3. Seed demo data (optional)
bun run scripts/seed-clickhouse.ts

# 4. Configure weekly digest cron (example: crontab or system scheduler)
# 0 8 * * 1  curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/weekly-digest

# 5. Configure geo refresh cron (example: monthly)
# 0 3 1 * *  curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/refresh-geo
```

---

## Testing

Three-layer strategy — no mocks, all tests run against real containers.

### Load (k6)
- `tests/load/ingestion.js` — ramps to 1,000 VUs across `/api/track` and `/api/track/event`
- Thresholds: p99 < 100ms per request type, failure rate < 1%
- `teardown()` verifies ClickHouse event count grew during the run
- Run: `bun run test:load` (requires `brew install k6`)

### Integration (vitest + testcontainers)
- Spins up real `postgres:16-alpine` and `clickhouse/clickhouse-server:24.8` containers
- Spawns `next dev` on port 3999 with `NEXT_DIST_DIR=.next-test` (avoids lock conflict with running dev server)
- Full flow: ingest via HTTP → poll ClickHouse → assert stats API returns exact counts
- Run: `bun run test:integration`

### Security
- **Site isolation**: user B accessing user A's stats → 404
- **Rate limiting**: 121 concurrent requests from same IP → at least one 429 with `Retry-After`
- **Plan limits**: 20k events pre-seeded via direct ClickHouse insert → next request returns 204; pro users unaffected
- Covered by the same vitest integration suite

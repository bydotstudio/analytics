-- Better Auth tables (camelCase columns required by Better Auth)
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plan TEXT NOT NULL DEFAULT 'pro',
  "polarCustomerId" TEXT,
  "polarSubscriptionId" TEXT
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

-- Analytics tables
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ls_webhook_secret      TEXT,
  stripe_webhook_secret  TEXT,
  polar_webhook_secret   TEXT
);
CREATE INDEX IF NOT EXISTS sites_user_id_idx ON sites(user_id);

CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  pathname TEXT NOT NULL,
  referrer TEXT,
  country CHAR(2),
  device_type TEXT,
  browser TEXT,
  os TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pv_site_ts_idx      ON page_views(site_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS pv_site_session_idx ON page_views(site_id, session_id);
CREATE INDEX IF NOT EXISTS pv_pathname_idx     ON page_views(site_id, pathname);
CREATE INDEX IF NOT EXISTS pv_referrer_idx     ON page_views(site_id, referrer);

-- Migration: add billing columns to existing deployments
-- ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'pro';
-- ALTER TABLE "user" ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;
-- ALTER TABLE "user" ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- Custom events (revenue attribution)
CREATE TABLE IF NOT EXISTS custom_events (
  id          BIGSERIAL PRIMARY KEY,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  name        TEXT NOT NULL,
  revenue     NUMERIC(12,2),
  currency    CHAR(3),
  properties  JSONB,
  pathname    TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ce_site_ts_idx      ON custom_events(site_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS ce_site_name_idx    ON custom_events(site_id, name);
CREATE INDEX IF NOT EXISTS ce_site_session_idx ON custom_events(site_id, session_id);

-- User identification
CREATE TABLE IF NOT EXISTS identified_sessions (
  id               BIGSERIAL PRIMARY KEY,
  site_id          UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  session_id       TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  traits           JSONB,
  identified_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, session_id)
);
CREATE INDEX IF NOT EXISTS is_site_session_idx ON identified_sessions(site_id, session_id);
CREATE INDEX IF NOT EXISTS is_site_user_idx    ON identified_sessions(site_id, external_user_id);

-- Core Web Vitals
CREATE TABLE IF NOT EXISTS performance_metrics (
  id          BIGSERIAL PRIMARY KEY,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  pathname    TEXT NOT NULL,
  lcp         REAL,
  cls         REAL,
  inp         REAL,
  fcp         REAL,
  ttfb        REAL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pm_site_ts_idx   ON performance_metrics(site_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS pm_site_path_idx ON performance_metrics(site_id, pathname);

-- Row-Level Security on sites table
-- When app.current_user_id is set (stats routes), enforces per-user isolation.
-- When not set (track routes, webhooks), policy is transparent (user_id = user_id).
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY sites_owner_isolation ON sites
  USING (
    user_id = coalesce(
      nullif(current_setting('app.current_user_id', true), ''),
      user_id
    )
  );

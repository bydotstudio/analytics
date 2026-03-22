-- Enable Row-Level Security on the sites table.
-- Run this against existing databases (schema.sql already includes this for new installs).
--
-- Usage:
--   psql $DATABASE_URL -f scripts/enable-rls.sql

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy idempotently
DROP POLICY IF EXISTS sites_owner_isolation ON sites;

CREATE POLICY sites_owner_isolation ON sites
  USING (
    user_id = coalesce(
      nullif(current_setting('app.current_user_id', true), ''),
      user_id
    )
  );

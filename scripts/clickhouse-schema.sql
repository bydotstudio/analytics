-- ClickHouse schema for analytics events
-- Run via: docker compose exec clickhouse clickhouse-client --queries-file /docker-entrypoint-initdb.d/01-schema.sql

CREATE DATABASE IF NOT EXISTS analytics;

-- Raw events table — stores all event types (pageview, custom, perf)
CREATE TABLE IF NOT EXISTS analytics.events
(
    timestamp    DateTime64(3, 'UTC'),
    site_id      UUID,
    event_type   LowCardinality(String),   -- 'pageview' | 'custom' | 'perf' | 'rage_click' | 'dead_click'
    session_id   String,
    visitor_hash String,                    -- SHA256(ip|ua|YYYY-MM-DD|salt) — rotates daily, no PII
    pathname     String,
    referrer     String,
    country      LowCardinality(String),
    browser      LowCardinality(String),
    os           LowCardinality(String),
    device       LowCardinality(String),
    utm_source   String,
    utm_medium   String,
    utm_campaign String,
    event_name   String,                    -- custom events only
    revenue      Nullable(Float64),
    currency     LowCardinality(String),
    properties   String,                    -- JSON string for custom event props
    lcp          Nullable(Float64),
    cls          Nullable(Float64),
    inp          Nullable(Float64),
    fcp          Nullable(Float64),
    ttfb         Nullable(Float64)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, toDate(timestamp), session_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 10 YEAR
SETTINGS index_granularity = 8192;

-- Materialized view: daily unique visitor counts (powers summary stats)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_daily_visitors
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (site_id, date)
AS
SELECT
    site_id,
    toDate(timestamp) AS date,
    uniqState(visitor_hash) AS visitors_state,
    uniqState(session_id)   AS sessions_state,
    countState()             AS pageviews_state
FROM analytics.events
WHERE event_type = 'pageview'
GROUP BY site_id, date;

import { ch } from "./clickhouse";
import type { SummaryStats, BreakdownRow } from "../types/analytics";

// ---------------------------------------------------------------------------
// Summary stats (visitor counts)
// ---------------------------------------------------------------------------

export async function getSummaryStats(siteId: string): Promise<SummaryStats> {
  const result = await ch.query({
    query: `
      SELECT
        uniqIf(visitor_hash, toDate(timestamp) = today())                       AS today,
        uniqIf(visitor_hash, timestamp >= now() - INTERVAL 7 DAY)               AS last_7d,
        uniqIf(visitor_hash, timestamp >= now() - INTERVAL 30 DAY)              AS last_30d,
        (
          SELECT country FROM analytics.events
          WHERE site_id = {siteId:UUID}
            AND event_type = 'pageview'
            AND timestamp >= now() - INTERVAL 30 DAY
            AND country != ''
          GROUP BY country ORDER BY count() DESC LIMIT 1
        ) AS top_country,
        (
          SELECT referrer FROM analytics.events
          WHERE site_id = {siteId:UUID}
            AND event_type = 'pageview'
            AND timestamp >= now() - INTERVAL 30 DAY
            AND referrer != ''
          GROUP BY referrer ORDER BY count() DESC LIMIT 1
        ) AS top_referrer
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp >= now() - INTERVAL 30 DAY
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    today: string;
    last_7d: string;
    last_30d: string;
    top_country: string;
    top_referrer: string;
  }>();
  const r = rows[0] ?? { today: "0", last_7d: "0", last_30d: "0", top_country: "", top_referrer: "" };
  return {
    today: Number(r.today),
    last_7d: Number(r.last_7d),
    last_30d: Number(r.last_30d),
    top_country: r.top_country || null,
    top_referrer: r.top_referrer || null,
  };
}

// ---------------------------------------------------------------------------
// Active visitors (last 5 minutes)
// ---------------------------------------------------------------------------

export async function getActiveVisitors(siteId: string): Promise<number> {
  const result = await ch.query({
    query: `
      SELECT uniq(session_id) AS active
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp >= now() - INTERVAL 5 MINUTE
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ active: string }>();
  return Number(rows[0]?.active ?? 0);
}

// ---------------------------------------------------------------------------
// Breakdown queries (pages, referrers, devices, countries)
// ---------------------------------------------------------------------------

export async function getTopPages(siteId: string): Promise<BreakdownRow[]> {
  const result = await ch.query({
    query: `
      SELECT pathname AS label, uniq(visitor_hash) AS visitors
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY pathname
      ORDER BY visitors DESC
      LIMIT 20
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ label: string; visitors: string }>();
  return rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) }));
}

export async function getTopReferrers(siteId: string): Promise<BreakdownRow[]> {
  const result = await ch.query({
    query: `
      SELECT coalesce(nullIf(referrer, ''), '(direct)') AS label, uniq(visitor_hash) AS visitors
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY referrer
      ORDER BY visitors DESC
      LIMIT 20
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ label: string; visitors: string }>();
  return rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) }));
}

export async function getDeviceBreakdown(siteId: string): Promise<BreakdownRow[]> {
  const result = await ch.query({
    query: `
      SELECT coalesce(nullIf(device, ''), 'unknown') AS label, uniq(visitor_hash) AS visitors
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY device
      ORDER BY visitors DESC
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ label: string; visitors: string }>();
  return rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) }));
}

export async function getCountryBreakdown(siteId: string): Promise<BreakdownRow[]> {
  const result = await ch.query({
    query: `
      SELECT coalesce(nullIf(country, ''), 'Unknown') AS label, uniq(visitor_hash) AS visitors
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY country
      ORDER BY visitors DESC
      LIMIT 20
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ label: string; visitors: string }>();
  return rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) }));
}

// ---------------------------------------------------------------------------
// Revenue stats
// ---------------------------------------------------------------------------

export async function getRevenueStats(siteId: string) {
  const summaryResult = await ch.query({
    query: `
      SELECT
        sum(revenue)         AS total_revenue,
        count()              AS total_conversions,
        uniq(visitor_hash)   AS unique_converters
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'custom'
        AND revenue IS NOT NULL
        AND timestamp >= now() - INTERVAL 30 DAY
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const summaryRows = await summaryResult.json<{
    total_revenue: string;
    total_conversions: string;
    unique_converters: string;
  }>();

  const eventsResult = await ch.query({
    query: `
      SELECT
        event_name AS name,
        count()         AS count,
        sum(revenue)    AS revenue
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'custom'
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT 10
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const topEvents = await eventsResult.json<{ name: string; count: string; revenue: string }>();

  const pagesResult = await ch.query({
    query: `
      SELECT
        coalesce(nullIf(pathname, ''), 'unknown') AS label,
        count()      AS conversions,
        sum(revenue) AS revenue
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'custom'
        AND revenue IS NOT NULL
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY pathname
      ORDER BY revenue DESC
      LIMIT 20
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const topPages = await pagesResult.json<{ label: string; conversions: string; revenue: string }>();

  const s = summaryRows[0] ?? { total_revenue: "0", total_conversions: "0", unique_converters: "0" };
  return {
    total_revenue: Number(s.total_revenue),
    total_conversions: Number(s.total_conversions),
    unique_converters: Number(s.unique_converters),
    top_events: topEvents.map((r) => ({
      name: r.name,
      count: Number(r.count),
      revenue: Number(r.revenue),
    })),
    top_pages: topPages.map((r) => ({
      label: r.label,
      conversions: Number(r.conversions),
      revenue: Number(r.revenue),
    })),
  };
}

// ---------------------------------------------------------------------------
// Performance metrics
// ---------------------------------------------------------------------------

export async function getPerformanceMetrics(siteId: string) {
  const result = await ch.query({
    query: `
      SELECT
        pathname,
        count()         AS samples,
        avg(lcp)        AS avg_lcp,
        avg(cls)        AS avg_cls,
        avg(inp)        AS avg_inp,
        avg(fcp)        AS avg_fcp,
        avg(ttfb)       AS avg_ttfb
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'perf'
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY pathname
      ORDER BY samples DESC
      LIMIT 20
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  return result.json<{
    pathname: string;
    samples: string;
    avg_lcp: number | null;
    avg_cls: number | null;
    avg_inp: number | null;
    avg_fcp: number | null;
    avg_ttfb: number | null;
  }>();
}

export async function getSitePerformance(siteId: string) {
  const perfResult = await ch.query({
    query: `
      SELECT
        avg(lcp)  AS avg_lcp,
        avg(cls)  AS avg_cls,
        avg(inp)  AS avg_inp,
        avg(fcp)  AS avg_fcp,
        avg(ttfb) AS avg_ttfb
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'perf'
        AND timestamp >= now() - INTERVAL 30 DAY
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });

  const behaviorResult = await ch.query({
    query: `
      SELECT
        uniq(session_id)                                                            AS total_sessions,
        countIf(event_type = 'rage_click')                                          AS rage_clicks,
        countIf(event_type = 'dead_click')                                          AS dead_clicks,
        countIf(event_type = 'pageview' AND session_id IN (
          SELECT session_id FROM analytics.events
          WHERE site_id = {siteId:UUID}
            AND event_type = 'pageview'
            AND timestamp >= now() - INTERVAL 30 DAY
          GROUP BY session_id
          HAVING count() = 1
            AND dateDiff('second', min(timestamp), max(timestamp)) < 10
        ))                                                                          AS bounces
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND timestamp >= now() - INTERVAL 30 DAY
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });

  const [perfRows, behaviorRows] = await Promise.all([
    perfResult.json<{
      avg_lcp: number | null;
      avg_cls: number | null;
      avg_inp: number | null;
      avg_fcp: number | null;
      avg_ttfb: number | null;
    }>(),
    behaviorResult.json<{
      total_sessions: string;
      rage_clicks: string;
      dead_clicks: string;
      bounces: string;
    }>(),
  ]);

  const perf = perfRows[0] ?? { avg_lcp: null, avg_cls: null, avg_inp: null, avg_fcp: null, avg_ttfb: null };
  const behavior = behaviorRows[0] ?? { total_sessions: "0", rage_clicks: "0", dead_clicks: "0", bounces: "0" };
  const totalSessions = Math.max(Number(behavior.total_sessions), 1);

  return {
    avg_lcp: perf.avg_lcp,
    avg_cls: perf.avg_cls,
    avg_inp: perf.avg_inp,
    avg_fcp: perf.avg_fcp,
    avg_ttfb: perf.avg_ttfb,
    rage_click_rate: Number(behavior.rage_clicks) / totalSessions,
    dead_click_rate: Number(behavior.dead_clicks) / totalSessions,
    bounce_rate: Number(behavior.bounces) / totalSessions,
  };
}

// ---------------------------------------------------------------------------
// Sessions list
// ---------------------------------------------------------------------------

export async function getSessionList(siteId: string, limit: number) {
  const result = await ch.query({
    query: `
      SELECT
        session_id,
        any(country)    AS country,
        any(device)     AS device_type,
        any(browser)    AS browser,
        any(os)         AS os,
        count()         AS page_count,
        min(timestamp)  AS started_at,
        max(timestamp)  AS ended_at,
        dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp >= now() - INTERVAL 7 DAY
      GROUP BY session_id
      ORDER BY started_at DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { siteId, limit },
    format: "JSONEachRow",
  });
  return result.json<{
    session_id: string;
    country: string;
    device_type: string;
    browser: string;
    os: string;
    page_count: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
  }>();
}

// ---------------------------------------------------------------------------
// Journey steps for a session
// ---------------------------------------------------------------------------

export async function getJourneySteps(siteId: string, sessionId: string) {
  const result = await ch.query({
    query: `
      SELECT pathname, referrer, timestamp
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND session_id = {sessionId:String}
        AND event_type = 'pageview'
      ORDER BY timestamp ASC
    `,
    query_params: { siteId, sessionId },
    format: "JSONEachRow",
  });
  return result.json<{ pathname: string; referrer: string; timestamp: string }>();
}

// ---------------------------------------------------------------------------
// Identification stats (joins with Postgres identified_sessions via app layer)
// ---------------------------------------------------------------------------

export async function getSessionCount30d(siteId: string): Promise<number> {
  const result = await ch.query({
    query: `
      SELECT uniq(session_id) AS total
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp >= now() - INTERVAL 30 DAY
    `,
    query_params: { siteId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ total: string }>();
  return Number(rows[0]?.total ?? 0);
}

// ---------------------------------------------------------------------------
// Recent events for SSE realtime feed
// ---------------------------------------------------------------------------

export async function getRecentEvents(siteId: string, since: string) {
  const result = await ch.query({
    query: `
      SELECT pathname, country, timestamp
      FROM analytics.events
      WHERE site_id = {siteId:UUID}
        AND event_type = 'pageview'
        AND timestamp > {since:DateTime64(3)}
      ORDER BY timestamp ASC
      LIMIT 20
    `,
    query_params: { siteId, since },
    format: "JSONEachRow",
  });
  return result.json<{ pathname: string; country: string; timestamp: string }>();
}

// ---------------------------------------------------------------------------
// Event count for rate limiting (pageviews + custom events this month)
// ---------------------------------------------------------------------------

export async function getMonthlyEventCount(siteIds: string[]): Promise<number> {
  if (siteIds.length === 0) return 0;
  const result = await ch.query({
    query: `
      SELECT count() AS total
      FROM analytics.events
      WHERE site_id IN ({siteIds:Array(UUID)})
        AND event_type IN ('pageview', 'custom')
        AND toStartOfMonth(timestamp) = toStartOfMonth(now())
    `,
    query_params: { siteIds },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ total: string }>();
  return Number(rows[0]?.total ?? 0);
}

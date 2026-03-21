import { pool } from "./db";
import type { SummaryStats, BreakdownRow } from "../types/analytics";

export async function getSummaryStats(siteId: string): Promise<SummaryStats> {
  const { rows } = await pool.query(
    `SELECT
      COUNT(DISTINCT session_id) FILTER (WHERE timestamp >= date_trunc('day', now())) AS today,
      COUNT(DISTINCT session_id) FILTER (WHERE timestamp >= now() - interval '7 days')  AS last_7d,
      COUNT(DISTINCT session_id) FILTER (WHERE timestamp >= now() - interval '30 days') AS last_30d
     FROM page_views
     WHERE site_id = $1 AND timestamp >= now() - interval '30 days'`,
    [siteId]
  );
  const r = rows[0];
  return { today: Number(r.today), last_7d: Number(r.last_7d), last_30d: Number(r.last_30d) };
}

export async function getActiveVisitors(siteId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT session_id) AS active FROM page_views
     WHERE site_id = $1 AND timestamp >= now() - interval '5 minutes'`,
    [siteId]
  );
  return Number(rows[0]?.active ?? 0);
}

export async function getTopPages(siteId: string): Promise<BreakdownRow[]> {
  const { rows } = await pool.query(
    `SELECT pathname AS label, COUNT(DISTINCT session_id) AS visitors
     FROM page_views WHERE site_id = $1 AND timestamp >= now() - interval '30 days'
     GROUP BY pathname ORDER BY visitors DESC LIMIT 20`,
    [siteId]
  );
  return rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) }));
}

export async function getTopReferrers(siteId: string): Promise<BreakdownRow[]> {
  const { rows } = await pool.query(
    `SELECT COALESCE(referrer, '') AS label, COUNT(DISTINCT session_id) AS visitors
     FROM page_views WHERE site_id = $1 AND timestamp >= now() - interval '30 days'
     GROUP BY referrer ORDER BY visitors DESC LIMIT 20`,
    [siteId]
  );
  return rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) }));
}

export async function getDeviceBreakdown(siteId: string): Promise<BreakdownRow[]> {
  const { rows } = await pool.query(
    `SELECT COALESCE(device_type, 'unknown') AS label, COUNT(DISTINCT session_id) AS visitors
     FROM page_views WHERE site_id = $1 AND timestamp >= now() - interval '30 days'
     GROUP BY device_type ORDER BY visitors DESC`,
    [siteId]
  );
  return rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) }));
}

export async function getCountryBreakdown(siteId: string): Promise<BreakdownRow[]> {
  const { rows } = await pool.query(
    `SELECT COALESCE(country, 'Unknown') AS label, COUNT(DISTINCT session_id) AS visitors
     FROM page_views WHERE site_id = $1 AND timestamp >= now() - interval '30 days'
     GROUP BY country ORDER BY visitors DESC LIMIT 20`,
    [siteId]
  );
  return rows.map((r) => ({ label: r.label, visitors: Number(r.visitors) }));
}

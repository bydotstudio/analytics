export interface Site {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  created_at: string;
}

export interface SummaryStats {
  today: number;
  last_7d: number;
  last_30d: number;
  top_country: string | null;
  top_referrer: string | null;
}

export interface ActiveVisitors {
  active: number;
}

export interface BreakdownRow {
  label: string;
  visitors: number;
}

export type ViewMode = "simple" | "advanced";

export interface RevenueStats {
  total_revenue: number;
  total_conversions: number;
  unique_converters: number;
  top_events: { name: string; count: number; revenue: number }[];
  top_pages: { label: string; conversions: number; revenue: number }[];
}

export interface Session {
  session_id: string;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  page_count: number;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  external_user_id: string | null;
  traits: Record<string, unknown> | null;
}

export interface JourneyStep {
  pathname: string;
  referrer: string | null;
  timestamp: string;
}

export interface IdentificationStats {
  total_sessions: number;
  identified_sessions: number;
  anonymous_sessions: number;
  identification_rate: number;
}

export type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface PerformanceMetric {
  pathname: string;
  samples: number;
  avg_lcp: number | null;
  avg_cls: number | null;
  avg_inp: number | null;
  avg_fcp: number | null;
  avg_ttfb: number | null;
  score: Grade;
}

export interface SitePerformance {
  overall_score: Grade;
  avg_lcp: number | null;
  avg_cls: number | null;
  avg_inp: number | null;
  avg_fcp: number | null;
  avg_ttfb: number | null;
}

export interface RealtimeEvent {
  pathname: string;
  country: string | null;
  timestamp: string;
}

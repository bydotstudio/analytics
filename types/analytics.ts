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
}

export interface ActiveVisitors {
  active: number;
}

export interface BreakdownRow {
  label: string;
  visitors: number;
}

export type ViewMode = "simple" | "advanced";

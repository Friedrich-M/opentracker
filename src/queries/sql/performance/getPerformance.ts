// Shared types for the performance chart, stats and metrics queries.

export interface PerformanceParameters {
  startDate: Date;
  endDate: Date;
  unit: string;
  timezone: string;
  metric: string;
}

export interface PerformanceResult {
  chart: { t: string; p50: number; p75: number; p95: number }[];
  summary: {
    lcp: { p50: number; p75: number; p95: number };
    inp: { p50: number; p75: number; p95: number };
    cls: { p50: number; p75: number; p95: number };
    fcp: { p50: number; p75: number; p95: number };
    ttfb: { p50: number; p75: number; p95: number };
    count: number;
  };
}

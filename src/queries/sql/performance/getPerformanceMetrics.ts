import { SESSION_COLUMNS } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';
import type { PerformanceParameters } from './getPerformance';

export interface PerformanceMetricsData {
  name: string;
  p50: number;
  p75: number;
  p95: number;
  count: number;
}

export async function getPerformanceMetrics(
  ...args: [
    websiteId: string,
    parameters: PerformanceParameters,
    filters: QueryFilters,
    column: string,
    limit?: number,
  ]
) {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  parameters: PerformanceParameters,
  filters: QueryFilters,
  column: string,
  limit?: number,
): Promise<PerformanceMetricsData[]> {
  const { startDate, endDate, metric = 'lcp' } = parameters;
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, joinSessionQuery, cohortQuery, queryParams } = parseFilters(
    { ...filters, websiteId },
    { joinSession: SESSION_COLUMNS.includes(column) },
  );

  return rawQuery(
    `
    select
      ${column} as "name",
      percentile_cont(0.5) within group (order by ${metric}) as p50,
      percentile_cont(0.75) within group (order by ${metric}) as p75,
      percentile_cont(0.95) within group (order by ${metric}) as p95,
      count(*) as count
    from website_event
    ${cohortQuery}
    ${joinSessionQuery}
    where website_event.website_id = {{websiteId::uuid}}
      and website_event.event_type = 5
      and website_event.created_at between {{startDate}} and {{endDate}}
      ${filterQuery}
    group by ${column}
    order by p75 desc
    ${limit ? `limit ${limit}` : ''}
    `,
    { ...queryParams, startDate, endDate },
  );
}

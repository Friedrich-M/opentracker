import { EVENT_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { PropertyFilter, QueryFilters, TimeSeriesValue } from '@/lib/types';

const FUNCTION_NAME = 'getSessionDataNumericSeries';

export async function getSessionDataNumericSeries(
  ...args: [
    websiteId: string,
    propertyName: string,
    metric: 'sum' | 'avg' | 'count',
    filters: QueryFilters,
    propertyFilters?: PropertyFilter[],
  ]
): Promise<TimeSeriesValue[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  propertyName: string,
  metric: 'sum' | 'avg' | 'count',
  filters: QueryFilters,
  propertyFilters: PropertyFilter[] = [],
) {
  const { timezone = 'utc', unit = 'day' } = filters;
  const { rawQuery, getDateSQL, parseFilters, getPropertyFilterQuery } = prisma;
  const { filterQuery, cohortQuery, joinSessionQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    timezone,
  });
  const { sql: pfSQL, params: pfParams } = getPropertyFilterQuery(
    propertyFilters,
    'session',
    timezone,
  );
  const aggSql =
    metric === 'avg'
      ? 'avg(cast(session_data.number_value as decimal))'
      : metric === 'count'
        ? 'count(distinct session_data.session_id)'
        : 'sum(cast(session_data.number_value as decimal))';

  return rawQuery(
    `
    with filtered_sessions as (
      select distinct website_event.session_id, website_event.website_id
      from website_event
      ${cohortQuery}
      ${joinSessionQuery}
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type != ${EVENT_TYPE.performance}
        ${filterQuery}
        ${pfSQL}
    )
    select
      ${getDateSQL('session_data.created_at', unit, timezone)} t,
      ${aggSql} y
    from session_data
    join filtered_sessions
      on filtered_sessions.session_id = session_data.session_id
        and filtered_sessions.website_id = session_data.website_id
    where session_data.website_id = {{websiteId::uuid}}
      and session_data.data_key = {{propertyName}}
      and session_data.data_type = 2
    group by 1
    order by 1
    `,
    { ...queryParams, propertyName, ...pfParams },
    FUNCTION_NAME,
  );
}

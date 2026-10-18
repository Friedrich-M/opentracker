import { EVENT_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { EventDataNumericStats, PropertyFilter, QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getSessionDataNumericStats';

export async function getSessionDataNumericStats(
  ...args: [
    websiteId: string,
    propertyName: string,
    filters: QueryFilters,
    propertyFilters?: PropertyFilter[],
  ]
): Promise<EventDataNumericStats> {
  return relationalQuery(...args).then(results => results?.[0]);
}

async function relationalQuery(
  websiteId: string,
  propertyName: string,
  filters: QueryFilters,
  propertyFilters: PropertyFilter[] = [],
) {
  const { timezone = 'utc' } = filters;
  const { rawQuery, parseFilters, getPropertyFilterQuery } = prisma;
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
      coalesce(sum(cast(session_data.number_value as decimal)), 0) as "total",
      coalesce(avg(cast(session_data.number_value as decimal)), 0) as "average",
      coalesce(percentile_cont(0.5) within group (order by session_data.number_value), 0) as "median",
      coalesce(max(session_data.number_value), 0) as "max",
      coalesce(min(session_data.number_value), 0) as "min"
    from session_data
    join filtered_sessions
      on filtered_sessions.session_id = session_data.session_id
        and filtered_sessions.website_id = session_data.website_id
    where session_data.website_id = {{websiteId::uuid}}
      and session_data.data_key = {{propertyName}}
      and session_data.data_type = 2
    `,
    { ...queryParams, propertyName, ...pfParams },
    FUNCTION_NAME,
  );
}

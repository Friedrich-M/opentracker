import { DATA_TYPE, EVENT_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { EventDataSeriesPoint, PropertyFilter, QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getSessionDataPropertySeries';

export async function getSessionDataPropertySeries(
  ...args: [
    websiteId: string,
    propertyName: string,
    filters: QueryFilters,
    propertyFilters?: PropertyFilter[],
  ]
): Promise<EventDataSeriesPoint[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  propertyName: string,
  filters: QueryFilters,
  propertyFilters: PropertyFilter[] = [],
): Promise<EventDataSeriesPoint[]> {
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

  return rawQuery(
    `
    select
      session_data.string_value as x,
      ${getDateSQL('session_data.created_at', unit, timezone)} t,
      count(distinct session_data.session_id) y
    from website_event
    ${cohortQuery}
    ${joinSessionQuery}
    join session_data
      on session_data.session_id = website_event.session_id
        and session_data.website_id = website_event.website_id
    where website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type != ${EVENT_TYPE.performance}
      and session_data.data_key = {{propertyName}}
      and session_data.data_type in (${DATA_TYPE.string}, ${DATA_TYPE.boolean})
      ${filterQuery}
      ${pfSQL}
    group by 1, 2
    order by 2
    `,
    { ...queryParams, propertyName, ...pfParams },
    FUNCTION_NAME,
  );
}

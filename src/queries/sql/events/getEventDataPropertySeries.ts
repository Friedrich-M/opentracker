import { DATA_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { EventDataSeriesPoint, EventPropertyFilter, QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getEventDataPropertySeries';

export async function getEventDataPropertySeries(
  ...args: [
    websiteId: string,
    eventName: string,
    propertyName: string,
    filters: QueryFilters,
    eventFilters?: EventPropertyFilter[],
  ]
): Promise<EventDataSeriesPoint[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  eventName: string,
  propertyName: string,
  filters: QueryFilters,
  eventFilters: EventPropertyFilter[] = [],
): Promise<EventDataSeriesPoint[]> {
  const { timezone = 'utc', unit = 'day' } = filters;
  const { rawQuery, getDateSQL, parseFilters, getPropertyFilterQuery } = prisma;
  const { filterQuery, cohortQuery, joinSessionQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    timezone,
  });
  const { sql: pfSQL, params: pfParams } = getPropertyFilterQuery(eventFilters, 'event', timezone);

  return rawQuery(
    `
    select
      event_data.string_value as x,
      ${getDateSQL('event_data.created_at', unit, timezone)} t,
      count(*) y
    from event_data
    join website_event on website_event.event_id = event_data.website_event_id
      and website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type = 2
      and website_event.event_name = {{eventName}}
    ${cohortQuery}
    ${joinSessionQuery}
    where event_data.website_id = {{websiteId::uuid}}
      and event_data.created_at between {{startDate}} and {{endDate}}
      and event_data.data_key = {{propertyName}}
      and event_data.data_type in (${DATA_TYPE.string}, ${DATA_TYPE.boolean})
      ${filterQuery}
      ${pfSQL}
    group by 1, 2
    order by 2
    `,
    { ...queryParams, eventName, propertyName, ...pfParams },
    FUNCTION_NAME,
  );
}

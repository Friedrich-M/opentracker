import { DATA_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { EventDataDateSeriesPoint, EventPropertyFilter, QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getEventDataDateSeries';

export async function getEventDataDateSeries(
  ...args: [
    websiteId: string,
    eventName: string,
    propertyName: string,
    filters: QueryFilters,
    eventFilters?: EventPropertyFilter[],
  ]
): Promise<EventDataDateSeriesPoint[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  eventName: string,
  propertyName: string,
  filters: QueryFilters,
  eventFilters: EventPropertyFilter[] = [],
): Promise<EventDataDateSeriesPoint[]> {
  const { timezone = 'utc' } = filters;
  const { rawQuery, parseFilters, getDateStringSQL, getPropertyFilterQuery } = prisma;
  const { filterQuery, cohortQuery, joinSessionQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    timezone,
  });
  const { sql: pfSQL, params: pfParams } = getPropertyFilterQuery(eventFilters, 'event', timezone);

  return rawQuery(
    `
    select
      ${getDateStringSQL('event_data.date_value', 'second', timezone)} as t,
      count(*) as y
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
      and event_data.data_type = ${DATA_TYPE.date}
      ${filterQuery}
      ${pfSQL}
    group by 1
    order by 1
    `,
    { ...queryParams, eventName, propertyName, ...pfParams },
    FUNCTION_NAME,
  );
}

import prisma from '@/lib/prisma';
import type { EventPropertyFilter, QueryFilters, TimeSeriesValue } from '@/lib/types';

const FUNCTION_NAME = 'getEventDataNumericSeries';

export async function getEventDataNumericSeries(
  ...args: [
    websiteId: string,
    eventName: string,
    propertyName: string,
    metric: 'sum' | 'avg' | 'count',
    filters: QueryFilters,
    eventFilters?: EventPropertyFilter[],
  ]
): Promise<TimeSeriesValue[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  eventName: string,
  propertyName: string,
  metric: 'sum' | 'avg' | 'count',
  filters: QueryFilters,
  eventFilters: EventPropertyFilter[] = [],
) {
  const { timezone = 'utc', unit = 'day' } = filters;
  const { rawQuery, getDateSQL, parseFilters, getPropertyFilterQuery } = prisma;
  const { filterQuery, cohortQuery, joinSessionQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    timezone,
  });
  const { sql: pfSQL, params: pfParams } = getPropertyFilterQuery(eventFilters, 'event', timezone);
  const aggSql =
    metric === 'avg'
      ? 'avg(cast(event_data.number_value as decimal))'
      : metric === 'count'
        ? 'count(*)'
        : 'sum(cast(event_data.number_value as decimal))';

  return rawQuery(
    `
    select
      ${getDateSQL('event_data.created_at', unit, timezone)} t,
      ${aggSql} y
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
      and event_data.data_type = 2
      ${filterQuery}
      ${pfSQL}
    group by 1
    order by 1
    `,
    { ...queryParams, eventName, propertyName, ...pfParams },
    FUNCTION_NAME,
  );
}

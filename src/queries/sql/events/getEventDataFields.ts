import prisma from '@/lib/prisma';
import type { PropertyMetric, QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getEventDataFields';

export async function getEventDataFields(
  ...args: [websiteId: string, eventName: string | undefined, filters: QueryFilters]
): Promise<PropertyMetric[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  eventName: string | undefined,
  filters: QueryFilters,
) {
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, cohortQuery, joinSessionQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
  });
  const eventNameFilter = eventName ? 'and website_event.event_name = {{eventName}}' : '';

  return rawQuery(
    `
    select
      data_key as "propertyName",
      data_type as "dataType",
      count(*) as "total"
    from event_data
    join website_event on website_event.event_id = event_data.website_event_id
      and website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      ${eventNameFilter}
    ${cohortQuery}
    ${joinSessionQuery}
    where event_data.website_id = {{websiteId::uuid}}
      and event_data.created_at between {{startDate}} and {{endDate}}
    ${filterQuery}
    group by data_key, data_type
    order by "total" desc, "propertyName" asc
    `,
    { ...queryParams, eventName },
    FUNCTION_NAME,
  );
}

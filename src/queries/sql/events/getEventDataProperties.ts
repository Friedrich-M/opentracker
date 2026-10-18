import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

interface EventDataProperty {
  eventName: string;
  propertyName: string;
  dataType: number;
  total: number;
}

const FUNCTION_NAME = 'getEventDataProperties';

export async function getEventDataProperties(
  ...args: [websiteId: string, filters: QueryFilters & { propertyName?: string }]
): Promise<EventDataProperty[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  filters: QueryFilters & { propertyName?: string },
) {
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, cohortQuery, joinSessionQuery, queryParams } = parseFilters(
    { ...filters, websiteId },
    {
      columns: { propertyName: 'data_key' },
    },
  );

  return rawQuery(
    `
    select
      website_event.event_name as "eventName",
      event_data.data_key as "propertyName",
      event_data.data_type as "dataType",
      count(*) as "total"
    from event_data 
    join website_event on website_event.event_id = event_data.website_event_id
      and website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
    ${cohortQuery}
    ${joinSessionQuery}
    where event_data.website_id = {{websiteId::uuid}}
      and event_data.created_at between {{startDate}} and {{endDate}}
    ${filterQuery}
    group by website_event.event_name, event_data.data_key, event_data.data_type
    order by 4 desc
    limit 500
    `,
    queryParams,
    FUNCTION_NAME,
  );
}

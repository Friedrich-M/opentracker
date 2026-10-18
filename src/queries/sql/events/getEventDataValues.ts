import { DATA_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getEventDataValues';

interface WebsiteEventData {
  value: string;
  total: number;
}

export async function getEventDataValues(
  ...args: [
    websiteId: string,
    eventName: string | undefined,
    filters: QueryFilters & { propertyName?: string; dataType?: number },
  ]
): Promise<WebsiteEventData[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  eventName: string | undefined,
  filters: QueryFilters & { propertyName?: string; dataType?: number },
) {
  const { rawQuery, parseFilters, getDateSQL } = prisma;
  const { dataType } = filters;
  const { filterQuery, joinSessionQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
  });
  const eventNameFilter = eventName ? 'and website_event.event_name = {{eventName}}' : '';

  if (dataType === DATA_TYPE.array) {
    return rawQuery(
      `
      select
        array_item.value as "value",
        count(*) as "total"
      from event_data
      join website_event on website_event.event_id = event_data.website_event_id
        and website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type = 2
        ${eventNameFilter}
      cross join lateral jsonb_array_elements_text(coalesce(event_data.string_value, '[]')::jsonb) as array_item(value)
      ${cohortQuery}
      ${joinSessionQuery}
      where event_data.website_id = {{websiteId::uuid}}
        and event_data.created_at between {{startDate}} and {{endDate}}
        and event_data.data_key = {{propertyName}}
        and event_data.data_type = ${DATA_TYPE.array}
      ${filterQuery}
      group by array_item.value
      order by 2 desc
      limit 100
      `,
      { ...queryParams, eventName },
      FUNCTION_NAME,
    );
  }

  return rawQuery(
    `
    select
      case
        when data_type = 2 then replace(string_value, '.0000', '')
        when data_type = 4 then ${getDateSQL('date_value', 'hour')}
        else string_value
      end as "value",
      count(*) as "total"
    from event_data
    join website_event on website_event.event_id = event_data.website_event_id
      and website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type = 2
      ${eventNameFilter}
    ${cohortQuery}
    ${joinSessionQuery}
    where event_data.website_id = {{websiteId::uuid}}
      and event_data.created_at between {{startDate}} and {{endDate}}
      and event_data.data_key = {{propertyName}}
      ${dataType ? `and event_data.data_type = ${dataType}` : ''}
    ${filterQuery}
    group by value
    order by 2 desc
    limit 100
    `,
    { ...queryParams, eventName },
    FUNCTION_NAME,
  );
}

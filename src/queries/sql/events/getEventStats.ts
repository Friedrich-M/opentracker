import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getEventStats';

interface EventStatsParameters {
  limit?: number | string;
}

interface WebsiteEventMetric {
  x: string;
  t: string;
  y: number;
}

export async function getEventStats(
  ...args: [websiteId: string, parameters: EventStatsParameters, filters: QueryFilters]
): Promise<WebsiteEventMetric[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  parameters: EventStatsParameters,
  filters: QueryFilters,
) {
  const { limit } = parameters;
  const { timezone = 'utc', unit = 'day' } = filters;
  const { rawQuery, getDateSQL, parseFilters } = prisma;
  const { filterQuery, cohortQuery, joinSessionQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
  });

  const limitQuery = limit
    ? `and event_name in (
    select event_name
    from website_event
    where website_id = {{websiteId::uuid}}
      and created_at between {{startDate}} and {{endDate}}
      and event_type = 2
    group by event_name
    order by count(*) desc
    limit ${limit}
  )`
    : '';

  return rawQuery(
    `
    select
      event_name x,
      ${getDateSQL('website_event.created_at', unit, timezone)} t,
      count(*) y
    from website_event
    ${cohortQuery}
    ${joinSessionQuery}
    where website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type = 2
      ${filterQuery}
      ${limitQuery}
    group by 1, 2
    order by 2
    `,
    queryParams,
    FUNCTION_NAME,
  );
}

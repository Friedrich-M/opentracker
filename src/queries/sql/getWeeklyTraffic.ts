import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getWeeklyTraffic';

export async function getWeeklyTraffic(
  ...args: [websiteId: string, filters: QueryFilters]
): Promise<number[][]> {
  return relationalQuery(...args);
}

async function relationalQuery(websiteId: string, filters: QueryFilters) {
  const { timezone = 'utc' } = filters;
  const { rawQuery, getDateWeeklySQL, parseFilters } = prisma;
  const { filterQuery, joinSessionQuery, cohortQuery, excludeBounceQuery, queryParams } =
    parseFilters({
      ...filters,
      websiteId,
    });

  return rawQuery(
    `
    select
      ${getDateWeeklySQL('website_event.created_at', timezone)} as time,
      count(distinct website_event.session_id) as value
    from website_event
    ${cohortQuery}
    ${excludeBounceQuery}
    ${joinSessionQuery}
    where website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type NOT IN (2, 5)
      ${filterQuery}
    group by time
    order by 1
    `,
    queryParams,
    FUNCTION_NAME,
  ).then(formatResults);
}

function formatResults(data: any): number[][] {
  const days: number[][] = [];

  for (let i = 0; i < 7; i++) {
    days.push([]);

    for (let j = 0; j < 24; j++) {
      days[i].push(
        Number(
          data.find(({ time }) => time === `${i}:${j.toString().padStart(2, '0')}`)?.value || 0,
        ),
      );
    }
  }

  return days;
}

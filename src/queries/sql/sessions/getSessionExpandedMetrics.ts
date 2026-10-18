import { EVENT_TYPE, FILTER_COLUMNS, SESSION_COLUMNS } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getSessionExpandedMetrics';

interface SessionExpandedMetricsParameters {
  type: string;
  limit?: number | string;
  offset?: number | string;
}

interface SessionExpandedMetricsData {
  name: string;
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

export async function getSessionExpandedMetrics(
  ...args: [websiteId: string, parameters: SessionExpandedMetricsParameters, filters: QueryFilters]
): Promise<SessionExpandedMetricsData[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  parameters: SessionExpandedMetricsParameters,
  filters: QueryFilters,
): Promise<SessionExpandedMetricsData[]> {
  const { type, limit = 500, offset = 0 } = parameters;
  let column = FILTER_COLUMNS[type] || type;
  const { parseFilters, rawQuery, getTimestampDiffSQL } = prisma;
  const { filterQuery, joinSessionQuery, cohortQuery, excludeBounceQuery, queryParams } =
    parseFilters(
      {
        ...filters,
        websiteId,
      },
      {
        joinSession: SESSION_COLUMNS.includes(type),
      },
    );
  const needsBounceEvents = filters.excludeBounce !== true;
  const includeCountry = column === 'city' || column === 'region';

  if (type === 'language') {
    column = `lower(left(${type}, 2))`;
  }
  const bounceQuery = needsBounceEvents
    ? `sum(case when t.c = 1 and coalesce(e.has_custom_event, 0) = 0 then 1 else 0 end) as "bounces",`
    : '0 as "bounces",';
  const visitEventsJoin = needsBounceEvents
    ? `left join (
      select session_id, visit_id, 1 as "has_custom_event"
      from website_event
      where website_id = {{websiteId::uuid}}
        and created_at between {{startDate}} and {{endDate}}
        and event_type = ${EVENT_TYPE.customEvent}
      group by 1, 2
    ) as e
      on e.session_id = t.session_id
      and e.visit_id = t.visit_id`
    : '';

  return rawQuery(
    `
    select
      name,
      ${includeCountry ? 'country,' : ''}
      sum(t.c) as "pageviews",
      count(distinct t.session_id) as "visitors",
      count(distinct t.visit_id) as "visits",
      ${bounceQuery}
      sum(${getTimestampDiffSQL('t.min_time', 't.max_time')}) as "totaltime"
    from (
      select
        ${column} as "name",
        ${includeCountry ? 'country,' : ''}
        website_event.session_id,
        website_event.visit_id,
        count(*) as "c",
        min(website_event.created_at) as "min_time",
        max(website_event.created_at) as "max_time"
      from website_event
      ${cohortQuery}
      ${excludeBounceQuery}
      ${joinSessionQuery}
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type NOT IN (2, 5)
        ${filterQuery}
      group by name, website_event.session_id, website_event.visit_id
      ${includeCountry ? ', country' : ''}
    ) as t
    ${visitEventsJoin}
    where name != ''
    group by name 
    ${includeCountry ? ', country' : ''}
    order by visitors desc, visits desc
    limit ${limit}
    offset ${offset}
    `,
    { ...queryParams, ...parameters },
    FUNCTION_NAME,
  );
}

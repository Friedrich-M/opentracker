import { FILTER_COLUMNS, SESSION_COLUMNS } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getPageviewMetrics';

interface PageviewMetricsParameters {
  type: string;
  limit?: number | string;
  offset?: number | string;
}

interface PageviewMetricsData {
  x: string;
  y: number;
}

export async function getPageviewMetrics(
  ...args: [websiteId: string, parameters: PageviewMetricsParameters, filters: QueryFilters]
) {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  parameters: PageviewMetricsParameters,
  filters: QueryFilters,
): Promise<PageviewMetricsData[]> {
  const { type, limit = 500, offset = 0 } = parameters;
  let column = getPageviewColumn(type);
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, joinSessionQuery, cohortQuery, excludeBounceQuery, queryParams } =
    parseFilters(
      {
        ...filters,
        websiteId,
      },
      { joinSession: SESSION_COLUMNS.includes(type) },
    );
  const fullPathSearchQuery =
    type === 'fullPath' && filters.search
      ? `and (case when website_event.url_query != '' then website_event.url_path || '?' || website_event.url_query else website_event.url_path end) ilike {{fullPathSearch}}`
      : '';

  let entryExitQuery = '';
  let excludeDomain = '';
  if (column === 'referrer_domain') {
    excludeDomain = `and website_event.referrer_domain != regexp_replace(website_event.hostname, '^www.', '')
      and website_event.referrer_domain != ''`;
  }

  if (type === 'entry' || type === 'exit') {
    const order = type === 'entry' ? 'asc' : 'desc';

    entryExitQuery = `
      join (
        select distinct on (visit_id)
          visit_id,
          url_path,
          url_query
        from website_event
        where website_event.website_id = {{websiteId::uuid}}
          and website_event.created_at between {{startDate}} and {{endDate}}
          and website_event.event_type NOT IN (2, 5)
        order by visit_id, created_at ${order}
      ) x
      on x.visit_id = website_event.visit_id
    `;

    column = `x.${FILTER_COLUMNS[type] || type}`;
  }

  const selectColumn =
    type === 'fullPath'
      ? `case when website_event.url_query != '' then website_event.url_path || '?' || website_event.url_query else website_event.url_path end`
      : column;

  return rawQuery(
    `
    select ${selectColumn} x,
      count(distinct website_event.session_id) as y
    from website_event
    ${cohortQuery}
    ${excludeBounceQuery}
    ${joinSessionQuery}
    ${entryExitQuery}
    where website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type NOT IN (2, 5)
      and ${column} != ''
      ${excludeDomain}
      ${fullPathSearchQuery}
      ${filterQuery}
    group by 1
    order by 2 desc
    limit ${limit}
    offset ${offset}
    `,
    {
      ...queryParams,
      ...parameters,
      ...(type === 'fullPath' && filters.search ? { fullPathSearch: `%${filters.search}%` } : {}),
    },
    FUNCTION_NAME,
  );
}

function getPageviewColumn(type: string) {
  if (type === 'fullPath') {
    return 'url_path';
  }

  return FILTER_COLUMNS[type] || type;
}

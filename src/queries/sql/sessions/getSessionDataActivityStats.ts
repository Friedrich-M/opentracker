import { DATA_TYPE, EVENT_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { PropertyFilter, PropertyLeaderboardRow, QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getSessionDataActivityStats';

export async function getSessionDataActivityStats(
  ...args: [
    websiteId: string,
    propertyName: string,
    filters: QueryFilters,
    propertyFilters?: PropertyFilter[],
  ]
): Promise<PropertyLeaderboardRow[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  propertyName: string,
  filters: QueryFilters,
  propertyFilters: PropertyFilter[] = [],
) {
  const { timezone = 'utc' } = filters;
  const { rawQuery, parseFilters, getPropertyFilterQuery } = prisma;
  const { filterQuery, cohortQuery, joinSessionQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    timezone,
  });
  const { sql: pfSQL, params: pfParams } = getPropertyFilterQuery(
    propertyFilters,
    'session',
    timezone,
  );

  return rawQuery(
    `
    with filtered_sessions as (
      select distinct website_event.session_id, website_event.website_id
      from website_event
      ${cohortQuery}
      ${joinSessionQuery}
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type != ${EVENT_TYPE.performance}
        ${filterQuery}
        ${pfSQL}
    ),
    session_rollup as (
      select
        website_event.session_id,
        website_event.visit_id,
        count(*) as activity,
        sum(case when website_event.event_type = 1 then 1 else 0 end) as views,
        sum(case when website_event.event_type = 2 then 1 else 0 end) as events,
        min(website_event.created_at) as min_time,
        max(website_event.created_at) as max_time
      from website_event
      join filtered_sessions
        on filtered_sessions.session_id = website_event.session_id
        and filtered_sessions.website_id = website_event.website_id
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type != ${EVENT_TYPE.performance}
      group by website_event.session_id, website_event.visit_id
    ),
    session_stats as (
      select
        session_id,
        count(*) as visits,
        sum(activity) as activity,
        sum(views) as views,
        sum(events) as events
      from session_rollup
      group by session_id
    ),
    property_values as (
      select
        session_data.session_id,
        session_data.string_value as value
      from session_data
      join filtered_sessions
        on filtered_sessions.session_id = session_data.session_id
        and filtered_sessions.website_id = session_data.website_id
      where session_data.website_id = {{websiteId::uuid}}
        and session_data.data_key = {{propertyName}}
        and session_data.data_type = ${DATA_TYPE.string}
        and coalesce(session_data.string_value, '') != ''
    )
    select
      property_values.value as label,
      coalesce(sum(session_stats.activity), 0) as activity,
      count(distinct property_values.session_id) as sessions,
      coalesce(sum(session_stats.visits), 0) as visits,
      coalesce(sum(session_stats.views), 0) as views,
      coalesce(sum(session_stats.events), 0) as events
    from property_values
    join session_stats on session_stats.session_id = property_values.session_id
    group by property_values.value
    order by activity desc, property_values.value asc
    limit 100
    `,
    { ...queryParams, websiteId, propertyName, ...pfParams },
    FUNCTION_NAME,
  );
}

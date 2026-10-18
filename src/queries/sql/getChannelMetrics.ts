import {
  EMAIL_DOMAINS,
  LLM_DOMAINS,
  PAID_AD_PARAMS,
  SEARCH_DOMAINS,
  SHOPPING_DOMAINS,
  SOCIAL_DOMAINS,
  VIDEO_DOMAINS,
} from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getChannelMetrics';

export async function getChannelMetrics(...args: [websiteId: string, filters?: QueryFilters]) {
  return relationalQuery(...args);
}

async function relationalQuery(websiteId: string, filters: QueryFilters) {
  const { rawQuery, parseFilters } = prisma;
  const { queryParams, filterQuery, joinSessionQuery, cohortQuery, excludeBounceQuery, dateQuery } =
    parseFilters({
      ...filters,
      websiteId,
    });

  return rawQuery(
    `
    WITH prefix AS (
      select case when website_event.utm_medium LIKE 'p%' OR
          website_event.utm_medium LIKE '%ppc%' OR
          website_event.utm_medium LIKE '%retargeting%' OR
          website_event.utm_medium LIKE '%paid%' then 'paid' else 'organic' end prefix,
          website_event.referrer_domain,
          website_event.url_query,
          website_event.utm_medium,
          website_event.utm_source,
          website_event.session_id,
          website_event.visit_id,
          website_event.event_id,
          website_event.created_at,
          website_event.hostname
      from website_event
      ${cohortQuery}
      ${excludeBounceQuery}
      ${joinSessionQuery}
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.event_type NOT IN (2, 5)
        ${dateQuery}
        ${filterQuery}),

    channels as (
      select case
          when referrer_domain = '' and url_query = '' then 'direct'
          when ${toPostgresLikeClause('url_query', PAID_AD_PARAMS)} then 'paidAds'
          when ${toPostgresLikeClause('utm_medium', ['referral', 'app', 'link'])} then 'referral'
          when utm_medium ilike '%affiliate%' then 'affiliate'
          when utm_medium ilike '%sms%' or utm_source ilike '%sms%' then 'sms'
          when ${toPostgresLikeClause('referrer_domain', LLM_DOMAINS)} then 'llm'
          when ${toPostgresLikeClause('referrer_domain', SEARCH_DOMAINS)} or utm_medium ilike '%organic%' then concat(prefix, 'Search')
          when ${toPostgresLikeClause('referrer_domain', SOCIAL_DOMAINS)} then concat(prefix, 'Social')
          when ${toPostgresLikeClause('referrer_domain', EMAIL_DOMAINS)} or utm_medium ilike '%mail%' then 'email'
          when ${toPostgresLikeClause('referrer_domain', SHOPPING_DOMAINS)} or utm_medium ilike '%shop%' then concat(prefix, 'Shopping')
          when ${toPostgresLikeClause('referrer_domain', VIDEO_DOMAINS)} or utm_medium ilike '%video%' then concat(prefix, 'Video')
          when referrer_domain != regexp_replace(hostname, '^www.', '') and referrer_domain != '' then 'referral'
          else '' end AS x,
          session_id,
          visit_id,
          event_id,
          created_at
      from prefix),

    visit_channels as (
      select
        session_id,
        visit_id,
        coalesce(nullif(x, ''), 'direct') as x
      from (
        select
          x,
          session_id,
          visit_id,
          row_number() over (
            partition by session_id, visit_id
            order by case when x != '' then 0 else 1 end, created_at, event_id
          ) as row_num
        from channels
      ) as ranked_channels
      where row_num = 1)

    select x, count(distinct session_id) y
    from visit_channels
    group by x
    order by y desc;
    `,
    queryParams,
    FUNCTION_NAME,
  ).then(results => results.map(item => ({ ...item, y: Number(item.y) })));
}

function escapePostgresLikeValue(val: string) {
  // Escape LIKE wildcards/backslashes so the value is matched literally, then
  // escape single quotes for the surrounding SQL string literal.
  return val.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/'/g, "''");
}

function toPostgresLikeClause(column: string, arr: string[]) {
  return arr.map(val => `${column} ilike '%${escapePostgresLikeValue(val)}%'`).join(' OR\n  ');
}

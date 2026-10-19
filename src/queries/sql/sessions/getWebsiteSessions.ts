import { EVENT_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { PageResult, QueryFilters, WebsiteSession } from '@/lib/types';

const FUNCTION_NAME = 'getWebsiteSessions';

interface SessionListOptions {
  /** Owner requests: search and return IP, ASN, organisation and labels. */
  includeNetwork?: boolean;
  /** Whose visitor labels to join; only read with includeNetwork. */
  userId?: string;
}

export async function getWebsiteSessions(
  ...args: [websiteId: string, filters: QueryFilters, options?: SessionListOptions]
): Promise<PageResult<WebsiteSession[]>> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  filters: QueryFilters,
  options: SessionListOptions = {},
) {
  const { pagedRawQuery, parseFilters } = prisma;
  const { search } = filters;
  const { includeNetwork, userId } = options;
  const { filterQuery, dateQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    userId,
    search: search ? `%${search}%` : undefined,
  });

  const searchQuery = search
    ? `and (distinct_id ilike {{search}}
           or city ilike {{search}}
           ${includeNetwork ? 'or org ilike {{search}} or ip ilike {{search}}' : ''}
           or browser ilike {{search}}
           or os ilike {{search}}
           or device ilike {{search}})`
    : '';

  return pagedRawQuery(
    `
    select
      session.session_id as "id",
      session.website_id as "websiteId",
      website_event.hostname,
      session.browser,
      session.os,
      session.device,
      session.screen,
      session.language,
      session.country,
      session.region,
      session.city,
      session.ip,
      session.asn,
      session.org,
      min(website_event.created_at) as "firstAt",
      max(website_event.created_at) as "lastAt",
      count(distinct website_event.visit_id) as "visits",
      sum(case when website_event.event_type = ${EVENT_TYPE.pageView} then 1 else 0 end) as "views",
      sum(case when website_event.event_type = ${EVENT_TYPE.customEvent} then 1 else 0 end) as "events",
      max(website_event.created_at) as "createdAt",
      -- Visitor Activity: where the session came from, entered and ended up.
      (array_agg(website_event.url_path order by website_event.created_at)
        filter (where website_event.event_type = ${EVENT_TYPE.pageView}))[1:50] as "pages",
      (array_agg(website_event.page_title order by website_event.created_at)
        filter (where website_event.event_type = ${EVENT_TYPE.pageView}))[1] as "entryTitle",
      (array_agg(website_event.referrer_domain || coalesce(website_event.referrer_path, '')
        order by website_event.created_at)
        filter (where website_event.referrer_domain <> ''))[1] as "referrer",
      bool_or(website_event.internal) as "internal",
      (select sr.visit_id from session_replay sr
        where sr.website_id = session.website_id and sr.session_id = session.session_id
        order by sr.created_at desc limit 1) as "replayId"
      ${
        includeNetwork
          ? `,
      -- Within this website's owner's websites only: another account's
      -- visitors from the same address are not this owner's to count.
      (select count(*) from session s2
        join website w2 on w2.website_id = s2.website_id
        where s2.ip = session.ip
          and w2.user_id = (select user_id from website where website_id = {{websiteId::uuid}})
      ) as "ipSessions",
      (select count(*) from website_event e2
        join session s3 on s3.session_id = e2.session_id
        join website w3 on w3.website_id = e2.website_id
        where s3.ip = session.ip and e2.event_type = ${EVENT_TYPE.pageView}
          and e2.internal = false
          and w3.user_id = (select user_id from website where website_id = {{websiteId::uuid}})
      ) as "ipViews",
      (select vl.name from visitor_label vl
        where vl.ip = session.ip and vl.user_id = {{userId::uuid}}) as "label"`
          : ''
      }
    from website_event 
    ${cohortQuery}
    join session on session.session_id = website_event.session_id
      and session.website_id = website_event.website_id
    where website_event.website_id = {{websiteId::uuid}}
      and website_event.event_type != ${EVENT_TYPE.performance}
    ${dateQuery}
    ${filterQuery}
    ${searchQuery}
    group by session.session_id, 
      session.website_id, 
      website_event.hostname, 
      session.browser, 
      session.os, 
      session.device, 
      session.screen, 
      session.language, 
      session.country, 
      session.region, 
      session.city,
      session.ip,
      session.asn,
      session.org
    `,
    queryParams,
    filters,
    FUNCTION_NAME,
    'max(website_event.created_at) desc, session.session_id',
  );
}

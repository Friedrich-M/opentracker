import prisma from '@/lib/prisma';
import type { PageResult, QueryFilters, SessionReplaySummary } from '@/lib/types';
import { getReplayTagQuery } from './getReplayTagQuery';

const FUNCTION_NAME = 'getSessionReplays';

export function getSessionReplays(
  ...args: [websiteId: string, filters: QueryFilters, sessionId?: string]
): Promise<PageResult<SessionReplaySummary[]>> {
  return relationalQuery(...args);
}

async function relationalQuery(websiteId: string, filters: QueryFilters, sessionId?: string) {
  const { pagedRawQuery, parseFilters } = prisma;
  const { search, minDuration } = filters;
  const minDurationMs = minDuration && minDuration > 0 ? minDuration * 1000 : undefined;
  const { filterQuery, cohortQuery, queryParams, joinSessionQuery } = parseFilters({
    ...filters,
    websiteId,
    search: search ? `%${search}%` : undefined,
  });

  const joinQuery =
    filterQuery || cohortQuery
      ? `join (select distinct website_event.website_id, website_event.session_id, website_event.visit_id
               from website_event
               ${joinSessionQuery}
               ${cohortQuery}
               where website_event.website_id = {{websiteId::uuid}}
                  and website_event.created_at between {{startDate}} and {{endDate}}
                  ${filterQuery}) website_event
        on website_event.website_id = sr.website_id
          and website_event.session_id = sr.session_id
          and website_event.visit_id = sr.visit_id`
      : '';

  const { tagQuery, replayTags } = getReplayTagQuery(filters.tag, 'sr.tag');

  const sessionFilter = sessionId ? 'and sr.session_id = {{sessionId::uuid}}' : '';

  const searchQuery = search
    ? `and (session.distinct_id ilike {{search}}
           or session.city ilike {{search}}
           or session.browser ilike {{search}}
           or session.os ilike {{search}}
           or session.device ilike {{search}})`
    : '';

  const havingQuery = minDurationMs
    ? `having sum(extract(epoch from sr.ended_at - sr.started_at) * 1000) >= {{minDurationMs}}`
    : '';

  return pagedRawQuery(
    `
    select
      sr.visit_id as "id",
      sr.session_id as "sessionId",
      sr.website_id as "websiteId",
      session.browser,
      session.os,
      session.device,
      session.country,
      session.city,
      sum(sr.event_count) as "eventCount",
      count(sr.replay_id) as "chunkCount",
      min(sr.started_at) as "startedAt",
      max(sr.ended_at) as "endedAt",
      sum(extract(epoch from sr.ended_at - sr.started_at) * 1000)::bigint as "duration",
      max(sr.created_at) as "createdAt"
    from session_replay sr
    join session on session.session_id = sr.session_id
      and session.website_id = sr.website_id
    ${joinQuery}
    where sr.website_id = {{websiteId::uuid}}
      and sr.created_at between {{startDate}} and {{endDate}}
    ${sessionFilter}
    ${tagQuery}
    ${searchQuery}
    group by sr.visit_id,
      sr.session_id,
      sr.website_id,
      session.browser,
      session.os,
      session.device,
      session.country,
      session.city
    ${havingQuery}
    order by max(sr.created_at) desc
    `,
    { ...queryParams, sessionId, minDurationMs, replayTags },
    filters,
    FUNCTION_NAME,
  );
}

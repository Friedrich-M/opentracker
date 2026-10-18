import { EVENT_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getVisitorPaths';

/** Upper bound on returned events; the newest visits win when it is reached. */
const MAX_EVENTS = 2000;

interface VisitorPathEvent {
  sessionId: string;
  visitId: string;
  websiteId: string;
  websiteName: string;
  createdAt: Date;
  hostname: string | null;
  urlPath: string;
  urlQuery: string | null;
  referrerDomain: string | null;
  referrerPath: string | null;
  pageTitle: string | null;
  eventType: number;
  eventName: string | null;
  tag: string | null;
  internal: boolean;
}

/**
 * Every page view and custom event of one visitor, oldest first, for the
 * Navigation paths list. With `userId` (the logged-in owner) the visitor is
 * everyone sharing the session's IP across all of that user's websites, so a
 * reader who moves from Home to Research shows as one person; without it the
 * paths are the single session's own.
 */
export async function getVisitorPaths(
  ...args: [websiteId: string, sessionId: string, options?: { userId?: string }]
): Promise<VisitorPathEvent[]> {
  return relationalQuery(...args);
}

async function relationalQuery(
  websiteId: string,
  sessionId: string,
  options: { userId?: string } = {},
) {
  const { rawQuery } = prisma;
  const { userId } = options;

  const sessionsQuery = userId
    ? `select s.session_id from session s
       join website w on w.website_id = s.website_id
         and w.user_id = {{userId::uuid}} and w.deleted_at is null
       where s.ip = (select ip from session
                     where session_id = {{sessionId::uuid}} and website_id = {{websiteId::uuid}})
       union
       select {{sessionId::uuid}}`
    : `select {{sessionId::uuid}}`;

  const rows = await rawQuery(
    `
    select * from (
      select
        e.session_id as "sessionId",
        e.visit_id as "visitId",
        e.website_id as "websiteId",
        w.name as "websiteName",
        e.created_at as "createdAt",
        e.hostname,
        e.url_path as "urlPath",
        e.url_query as "urlQuery",
        e.referrer_domain as "referrerDomain",
        e.referrer_path as "referrerPath",
        e.page_title as "pageTitle",
        e.event_type as "eventType",
        e.event_name as "eventName",
        e.tag,
        e.internal
      from website_event e
      join website w on w.website_id = e.website_id
      where e.session_id in (${sessionsQuery})
        and e.event_type in (${EVENT_TYPE.pageView}, ${EVENT_TYPE.customEvent})
        ${userId ? '' : 'and e.website_id = {{websiteId::uuid}}'}
      order by e.created_at desc
      limit ${MAX_EVENTS}
    ) t
    order by "createdAt"
    `,
    { websiteId, sessionId, userId },
    FUNCTION_NAME,
  );

  return rows as VisitorPathEvent[];
}

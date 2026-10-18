import { EVENT_TYPE } from '@/lib/constants';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getWebsiteSession';

export async function getWebsiteSession(...args: [websiteId: string, sessionId: string]) {
  return relationalQuery(...args);
}

async function relationalQuery(websiteId: string, sessionId: string) {
  const { rawQuery, getTimestampDiffSQL } = prisma;

  return rawQuery(
    `
    select id,
      distinct_id as "distinctId",
      website_id as "websiteId",
      browser,
      os,
      device,
      screen,
      language,
      country,
      region,
      city,
      ip,
      asn,
      org,
      min(min_time) as "firstAt",
      max(max_time) as "lastAt",
      count(distinct visit_id) as visits,
      sum(views) as views,
      sum(events) as events,
      sum(${getTimestampDiffSQL('min_time', 'max_time')}) as "totaltime" 
    from (select
          session.session_id as id,
          session.distinct_id,
          website_event.visit_id,
          session.website_id,
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
          min(website_event.created_at) as min_time,
          max(website_event.created_at) as max_time,
          sum(case when website_event.event_type = ${EVENT_TYPE.pageView} then 1 else 0 end) as views,
          sum(case when website_event.event_type = ${EVENT_TYPE.customEvent} then 1 else 0 end) as events
    from session
    join website_event on website_event.session_id = session.session_id
    where session.website_id = {{websiteId::uuid}}
      and session.session_id = {{sessionId::uuid}}
      and website_event.event_type != ${EVENT_TYPE.performance}
    group by session.session_id, session.distinct_id, visit_id, session.website_id, session.browser, session.os, session.device, session.screen, session.language, session.country, session.region, session.city, session.ip, session.asn, session.org) t
    group by id, distinct_id, website_id, browser, os, device, screen, language, country, region, city, ip, asn, org;
    `,
    { websiteId, sessionId },
    FUNCTION_NAME,
  ).then(result => result?.[0]);
}

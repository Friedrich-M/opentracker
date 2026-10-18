import { FIELD_LENGTH } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { truncateString } from '@/lib/format';
import prisma from '@/lib/prisma';
import { saveEventData } from './saveEventData';

interface SaveEventArgs {
  websiteId: string;
  sessionId: string;
  visitId: string;
  eventType: number;
  createdAt?: Date;

  // Page
  pageTitle?: string;
  hostname?: string;
  urlPath: string;
  urlQuery?: string;
  referrerPath?: string;
  referrerQuery?: string;
  referrerDomain?: string;

  // Session
  distinctId?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  language?: string;
  country?: string;
  region?: string;
  city?: string;

  // Events
  eventName?: string;
  eventData?: any;
  tag?: string;

  // The owner's own visit or a local preview (see src/lib/internal.ts)
  internal?: boolean;

  // UTM
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;

  // Click IDs
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  lifatid?: string;
  twclid?: string;

  // Performance
  lcp?: number;
  inp?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}

export async function saveEvent(args: SaveEventArgs) {
  return relationalQuery(args);
}

async function relationalQuery({
  websiteId,
  sessionId,
  visitId,
  eventType,
  createdAt,
  pageTitle,
  hostname,
  urlPath,
  urlQuery,
  referrerPath,
  referrerQuery,
  referrerDomain,
  eventName,
  eventData,
  tag,
  internal,
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
  utmTerm,
  gclid,
  fbclid,
  msclkid,
  ttclid,
  lifatid,
  twclid,
  lcp,
  inp,
  cls,
  fcp,
  ttfb,
}: SaveEventArgs) {
  const websiteEventId = uuid();

  await prisma.client.websiteEvent.create({
    data: {
      id: websiteEventId,
      websiteId,
      sessionId,
      visitId,
      urlPath: truncateString(urlPath, FIELD_LENGTH.url),
      urlQuery: truncateString(urlQuery, FIELD_LENGTH.url),
      utmSource: truncateString(utmSource, FIELD_LENGTH.fieldValue),
      utmMedium: truncateString(utmMedium, FIELD_LENGTH.fieldValue),
      utmCampaign: truncateString(utmCampaign, FIELD_LENGTH.fieldValue),
      utmContent: truncateString(utmContent, FIELD_LENGTH.fieldValue),
      utmTerm: truncateString(utmTerm, FIELD_LENGTH.fieldValue),
      referrerPath: truncateString(referrerPath, FIELD_LENGTH.url),
      referrerQuery: truncateString(referrerQuery, FIELD_LENGTH.url),
      referrerDomain: truncateString(referrerDomain, FIELD_LENGTH.url),
      pageTitle: truncateString(pageTitle, FIELD_LENGTH.pageTitle),
      gclid: truncateString(gclid, FIELD_LENGTH.fieldValue),
      fbclid: truncateString(fbclid, FIELD_LENGTH.fieldValue),
      msclkid: truncateString(msclkid, FIELD_LENGTH.fieldValue),
      ttclid: truncateString(ttclid, FIELD_LENGTH.fieldValue),
      lifatid: truncateString(lifatid, FIELD_LENGTH.fieldValue),
      twclid: truncateString(twclid, FIELD_LENGTH.fieldValue),
      eventType,
      eventName: truncateString(eventName, FIELD_LENGTH.eventName) ?? null,
      tag: truncateString(tag, FIELD_LENGTH.tag),
      hostname: truncateString(hostname, FIELD_LENGTH.hostname),
      internal: internal === true,
      lcp,
      inp,
      cls,
      fcp,
      ttfb,
      createdAt,
    },
  });

  if (eventData) {
    await saveEventData({
      websiteId,
      sessionId,
      eventId: websiteEventId,
      urlPath: truncateString(urlPath, FIELD_LENGTH.url),
      eventName: truncateString(eventName, FIELD_LENGTH.eventName),
      eventData,
      createdAt,
    });
  }
}

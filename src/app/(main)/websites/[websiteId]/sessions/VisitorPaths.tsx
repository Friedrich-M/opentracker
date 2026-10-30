import { Button, Column, Icon, Row, Text } from '@umami/react-zen';
import { ChevronDown, Download } from 'lucide-react';
import { useState } from 'react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import {
  useLocale,
  useMessages,
  useTimezone,
  useVisitorPathsQuery,
  useWebsite,
} from '@/components/hooks';
import { EVENT_TYPE } from '@/lib/constants';
import { formatShortTime } from '@/lib/format';
import { getDatePatterns } from '@/lib/lang';
import { projectName } from '../ProjectTabs';
import { pageLabel, pageUrl, referrerLabel, referrerUrl } from './VisitorActivity';
import styles from './VisitorActivity.module.css';

export interface PathEvent {
  sessionId: string;
  visitId: string;
  websiteId: string;
  websiteName: string;
  createdAt: string;
  hostname: string | null;
  urlPath: string;
  urlQuery: string | null;
  pageTitle?: string | null;
  referrerDomain: string | null;
  referrerPath: string | null;
  eventType: number;
  eventName: string | null;
  tag?: string | null;
  internal: boolean;
}

interface PathVisit {
  visitId: string;
  sessionId: string;
  websiteId: string;
  websiteName: string;
  /** The project (event tag) the visit started in, if the page sent one. */
  tag: string | null;
  referrer: string | null;
  events: PathEvent[];
}

/**
 * Groups a visitor's events into visits (a visit ends after an hour of
 * silence, see docs/architecture.md), newest visit first, events oldest first.
 */
export function groupVisits(events: PathEvent[]): PathVisit[] {
  const visits = new Map<string, PathVisit>();

  for (const event of events) {
    let visit = visits.get(event.visitId);

    if (!visit) {
      visit = {
        visitId: event.visitId,
        sessionId: event.sessionId,
        websiteId: event.websiteId,
        websiteName: event.websiteName,
        tag: event.tag ?? null,
        referrer: null,
        events: [],
      };
      visits.set(event.visitId, visit);
    }

    if (!visit.referrer && event.referrerDomain) {
      visit.referrer = `${event.referrerDomain}${event.referrerPath || ''}`;
    }

    visit.events.push(event);
  }

  return [...visits.values()].reverse();
}

/** The first referrer this visitor ever arrived with (StatCounter's "Initial referrer"). */
export function initialReferrer(events: PathEvent[]) {
  const first = events.find(e => e.referrerDomain && e.referrerDomain !== e.hostname);
  return first ? `${first.referrerDomain}${first.referrerPath || ''}` : null;
}

/** Seconds from a visit's first event to its last. */
function visitSeconds(visit: PathVisit) {
  const first = new Date(visit.events[0]?.createdAt).getTime();
  const last = new Date(visit.events[visit.events.length - 1]?.createdAt).getTime();
  return Number.isFinite(last - first) ? Math.max(0, Math.round((last - first) / 1000)) : 0;
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** One CSV row per event, oldest first, for the Export button. */
export function toCsv(events: PathEvent[]) {
  const header = [
    'time',
    'website',
    'project',
    'visit',
    'type',
    'event',
    'url',
    'referrer',
    'internal',
  ];
  const rows = events.map(e => [
    new Date(e.createdAt).toISOString(),
    e.websiteName,
    e.tag,
    e.visitId,
    e.eventType === EVENT_TYPE.pageView ? 'pageview' : 'event',
    e.eventName,
    pageUrl(e.hostname, `${e.urlPath}${e.urlQuery ? `?${e.urlQuery}` : ''}`),
    e.referrerDomain ? `${e.referrerDomain}${e.referrerPath || ''}` : '',
    e.internal,
  ]);

  return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
}

/**
 * StatCounter's Navigation Paths: every visit this visitor made, newest first,
 * folded to a header (number, project, length, page views) that opens to the
 * pages in order, each preceded by the outside link it came from, if any. For
 * the owner it spans all their websites (same IP).
 */
export function VisitorPaths({
  websiteId,
  sessionId,
  currentSessionId,
}: {
  websiteId: string;
  sessionId: string;
  currentSessionId?: string;
}) {
  const { t, labels } = useMessages();
  const { formatTimezoneDate } = useTimezone();
  const { locale } = useLocale();
  const datePatterns = getDatePatterns(locale);
  const { data, isLoading, error } = useVisitorPathsQuery(websiteId, sessionId);
  const website = useWebsite();
  const events: PathEvent[] = data ?? [];
  const visits = groupVisits(events);
  const websites = new Set(events.map(e => e.websiteId));
  const [open, setOpen] = useState<Set<string> | null>(null);
  // The newest visit starts open; after that the owner's choice holds.
  const openIds = open ?? new Set(visits.slice(0, 1).map(v => v.visitId));

  const toggle = (id: string) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  };

  const handleExport = () => {
    const blob = new Blob([toCsv(events)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-${sessionId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const time = (date: string, pattern: string) => {
    const iso = new Date(date).toISOString();
    return (
      <span className={styles.time}>
        {formatTimezoneDate(iso, pattern)}
        <span className={styles.seconds}>:{formatTimezoneDate(iso, 'ss')}</span>
      </span>
    );
  };

  return (
    <LoadingPanel data={data} isLoading={isLoading} error={error}>
      <Column gap="3">
        <Row justifyContent="space-between" alignItems="center" wrap="wrap" gap="2">
          <Text color="muted">
            {t(labels.visits)}: {visits.length}
            {websites.size > 1 ? ` · ${t(labels.websites)}: ${websites.size}` : ''}
          </Text>
          <Row gap="1">
            <Button
              variant="quiet"
              size="sm"
              onPress={() => setOpen(new Set(visits.map(v => v.visitId)))}
            >
              {t(labels.expandAll)}
            </Button>
            <Button variant="quiet" size="sm" onPress={() => setOpen(new Set())}>
              {t(labels.collapseAll)}
            </Button>
            <Button variant="quiet" size="sm" onPress={handleExport} isDisabled={!events.length}>
              <Icon size="sm">
                <Download />
              </Icon>
              {t(labels.export)}
            </Button>
          </Row>
        </Row>
        <ol className={styles.visits}>
          {visits.map((visit, index) => {
            const isOpen = openIds.has(visit.visitId);
            const views = visit.events.filter(e => e.eventType === EVENT_TYPE.pageView).length;
            const seconds = visitSeconds(visit);

            return (
              <li key={visit.visitId} className={styles.visit}>
                <button
                  type="button"
                  className={styles.visitHead}
                  aria-expanded={isOpen}
                  onClick={() => toggle(visit.visitId)}
                >
                  <strong>
                    {t(labels.visit)} #{visits.length - index}
                  </strong>
                  <span className={styles.tag}>
                    {visit.tag ? projectName(visit.tag, t, labels) : visit.websiteName}
                  </span>
                  <span className={styles.muted}>
                    {time(visit.events[0].createdAt, datePatterns.short)}
                  </span>
                  {seconds > 0 && (
                    <span className={styles.muted}>
                      {formatShortTime(seconds, ['h', 'm', 's'], ' ')}
                    </span>
                  )}
                  <span>
                    {views} {t(labels.pageViews).toLowerCase()}
                  </span>
                  {visit.sessionId === currentSessionId && websites.size > 1 && (
                    <span className={styles.muted}>{t(labels.thisSession)}</span>
                  )}
                  <ChevronDown
                    className={styles.chevron}
                    data-open={isOpen || undefined}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <ol className={styles.steps}>
                    {visit.events.map(event => {
                      const external =
                        event.referrerDomain && event.referrerDomain !== event.hostname
                          ? `${event.referrerDomain}${event.referrerPath || ''}`
                          : null;
                      const url = pageUrl(event.hostname, event.urlPath);

                      return (
                        <li key={`${event.createdAt}-${event.urlPath}-${event.eventName}`}>
                          {external && (
                            <div className={styles.stepFrom}>
                              <span className={styles.journeyArrow}>↳</span>
                              <a
                                className={styles.url}
                                href={referrerUrl(external) as string}
                                target="_blank"
                                rel="noreferrer noopener"
                              >
                                {referrerLabel(external)}
                              </a>
                            </div>
                          )}
                          <div className={styles.step}>
                            {time(event.createdAt, 'HH:mm')}
                            {event.eventType === EVENT_TYPE.pageView ? (
                              <span className={styles.stepPage}>
                                <a
                                  className={styles.url}
                                  href={url ?? undefined}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                >
                                  {pageLabel(
                                    event.urlPath,
                                    event.pageTitle,
                                    t(labels.homePage),
                                    event.hostname,
                                    // Only this website's domain is at hand.
                                    event.websiteId === website?.id ? website.domain : null,
                                  )}
                                </a>
                                <span className={styles.muted}>{event.urlPath}</span>
                              </span>
                            ) : (
                              <span className={styles.muted}>
                                ↳ {event.eventName}
                                {event.urlPath ? ` · ${event.urlPath}` : ''}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      </Column>
    </LoadingPanel>
  );
}

import { Button, Icon } from '@umami/react-zen';
import { ChevronDown, ExternalLink, Play, Search, UserRound } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { SystemIcons } from '@/components/common/SystemIcons';
import { TypeIcon } from '@/components/common/TypeIcon';
import {
  useFormat,
  useLocale,
  useMessages,
  useNavigation,
  useTimezone,
  useWebsite,
} from '@/components/hooks';
import { formatShortTime } from '@/lib/format';
import { getDatePatterns } from '@/lib/lang';
import type { WebsiteSession } from '@/lib/types';
import styles from './VisitorActivity.module.css';

/** `https://` + host + path, the address a visitor actually saw. */
export function pageUrl(hostname: string | null | undefined, path: string | null | undefined) {
  if (!path) return null;
  return hostname ? `https://${hostname}${path}` : path;
}

/** A stored referrer is `domain/path`; give it a scheme so it links. */
export function referrerUrl(referrer: string | null | undefined) {
  if (!referrer) return null;
  return /^https?:\/\//.test(referrer) ? referrer : `https://${referrer}`;
}

/** A page path with consecutive reloads of the same page folded into one step. */
export function collapseRepeats(paths: string[]) {
  return paths.filter((path, i) => path !== paths[i - 1]);
}

const SEARCH_ENGINES =
  /(^|\.)(google|bing|duckduckgo|yahoo|baidu|yandex|ecosia|startpage|brave|kagi|naver|sogou|so)\.[a-z.]+$|^scholar\.google\./;

/** True when a stored referrer (`domain/path`) is a search engine. */
export function isSearchReferrer(referrer: string | null | undefined) {
  if (!referrer) return false;
  const domain = referrer
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .toLowerCase();
  return SEARCH_ENGINES.test(domain);
}

/** Seconds between a session's first and last event; 0 for a single hit. */
export function sessionSeconds(row: Pick<WebsiteSession, 'firstAt' | 'lastAt'>) {
  const ms = new Date(row.lastAt).getTime() - new Date(row.firstAt).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : 0;
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** The listed sessions as CSV, StatCounter's Export: one row per session. */
export function sessionsToCsv(rows: WebsiteSession[]) {
  const header = [
    'latest_view',
    'first_view',
    'session_seconds',
    'page_views',
    'visitor_page_views',
    'visitor_sessions',
    'country',
    'region',
    'city',
    'org',
    'ip',
    'referrer',
    'entry_page',
    'latest_page',
    'pages',
    'browser',
    'os',
    'device',
    'screen',
    'you',
    'label',
  ];
  const lines = rows.map(row => {
    const pages = row.pages ?? [];
    return [
      new Date(row.lastAt).toISOString(),
      new Date(row.firstAt).toISOString(),
      sessionSeconds(row),
      row.views,
      row.ipViews,
      row.ipSessions,
      row.country,
      row.region,
      row.city,
      row.org,
      row.ip,
      row.referrer,
      pageUrl(row.hostname, pages[0]),
      pageUrl(row.hostname, pages[pages.length - 1]),
      collapseRepeats(pages).join(' > '),
      row.browser,
      row.os,
      row.device,
      row.screen,
      row.internal ? 'yes' : '',
      row.label,
    ];
  });

  return [header, ...lines].map(line => line.map(csvCell).join(',')).join('\n');
}

const LEGAL_SUFFIX =
  /(,?\s+(LLC|L\.L\.C\.|Inc\.?|Incorporated|Corp\.?|Corporation|Co\.?|Ltd\.?|Limited|GmbH|AG|S\.?A\.?|a\.s\.|B\.V\.|PLC|Pty))+\.?$/i;

/** An organisation's name without its legal suffix, for the one-line summary. */
export function shortOrg(org: string | null | undefined) {
  if (!org) return org;
  return org.replace(LEGAL_SUFFIX, '').trim() || org;
}

/**
 * A referrer as people read it: host and path without the scheme, `www.` or
 * a trailing slash (`github.com/example-org/project`, `youtube.com`).
 */
export function referrerLabel(referrer: string | null | undefined) {
  if (!referrer) return null;
  return referrer
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

/** A host without `www.` or a port, for comparing a page's host with the website's domain. */
function bareHost(host: string) {
  return host
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/:\d+$/, '');
}

/**
 * A page as people name it: `home` for the website's root, else the document
 * title up to its first separator ("Project — A Longer Description…" →
 * "Project"), else the path. A root on another host (a subdomain the website
 * also tracks) is not the home page: it takes its title, else its host.
 */
export function pageLabel(
  path: string | null | undefined,
  title: string | null | undefined,
  home: string,
  hostname?: string | null,
  domain?: string | null,
) {
  if (!path) return null;
  const name = title?.split(/\s+[—–|·-]\s+/)[0]?.trim();
  if (path === '/' || path === '/index.html') {
    if (!hostname || !domain || bareHost(hostname) === bareHost(domain)) return home;
    return name || bareHost(hostname);
  }
  return name || path;
}

/**
 * The sessions list as StatCounter's Visitor Activity, folded: one line per
 * session (replay, time, views, place, network, referrer, entry page,
 * system) that expands to the full record. "Visitor details" opens the
 * visitor panel (SessionModal); the round button plays the latest replay.
 */
export function VisitorActivity({ data }: { data: WebsiteSession[] }) {
  const { t, labels } = useMessages();
  const { formatValue } = useFormat();
  const { formatTimezoneDate } = useTimezone();
  const { locale } = useLocale();
  const datePatterns = getDatePatterns(locale);
  const { router, updateParams } = useNavigation();
  const website = useWebsite();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // Share links get rows without network fields (withoutNetwork), so the
  // organisation column would only ever show dashes: leave it out.
  const hasNetwork = data.some(row => row.ip !== undefined);

  const toggle = (id: string) =>
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openVisitor = (row: WebsiteSession) =>
    router.push(updateParams({ session: row.id }), { scroll: false });

  const time = (date: Date | string, pattern = datePatterns.long) => {
    const iso = new Date(date).toISOString();
    return (
      <span className={styles.time}>
        {formatTimezoneDate(iso, pattern)}
        <span className={styles.seconds}>:{formatTimezoneDate(iso, 'ss')}</span>
      </span>
    );
  };

  const link = (href: string | null, text?: string) =>
    href ? (
      <a
        className={styles.url}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        onClick={e => e.stopPropagation()}
      >
        {text ?? href}
        <ExternalLink className={styles.external} aria-hidden="true" />
      </a>
    ) : (
      <span className={styles.muted}>—</span>
    );

  return (
    <ul className={styles.list} data-network={hasNetwork ? undefined : 'false'}>
      <li className={styles.head} aria-hidden="true">
        <span className={styles.play} />
        <span className={styles.toggle}>
          <span>{t(labels.latestPageView)}</span>
          <span className={styles.headJourney}>
            {t(labels.referrer)}
            <span className={styles.journeyArrow}>→</span>
            {t(labels.entryPage)}
          </span>
          <span>{t(labels.pageViews)}</span>
          <span>{t(labels.location)}</span>
          {hasNetwork && <span>{t(labels.org)}</span>}
          <span>{t(labels.system)}</span>
          <span />
        </span>
      </li>
      {data.map(row => {
        const isOpen = expanded.has(row.id);
        const seconds = sessionSeconds(row);
        const views = Number(row.views);
        const visitorViews = Number(row.ipViews ?? 0);
        const location = [row.city, formatValue(row.country, 'country')].filter(Boolean).join(', ');
        const pages = row.pages ?? [];
        const entry = pageUrl(row.hostname, pages[0]);
        const latest = pageUrl(row.hostname, pages[pages.length - 1]);
        const search = isSearchReferrer(row.referrer);
        const tags = (
          <>
            {row.internal && <span className={`${styles.tag} ${styles.you}`}>{t(labels.you)}</span>}
            {row.label && <span className={styles.tag}>{row.label}</span>}
          </>
        );

        return (
          <li
            key={row.id}
            className={[styles.entry, row.internal ? styles.internal : null]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.summary}>
              <span className={styles.play}>
                {row.replayId ? (
                  <button
                    type="button"
                    className={styles.playButton}
                    aria-label={t(labels.playReplay)}
                    title={t(labels.playReplay)}
                    onClick={() => router.push(updateParams({ replay: row.replayId as string }))}
                  >
                    <Play />
                  </button>
                ) : (
                  <span className={styles.noReplay} title={t(labels.noReplay)} />
                )}
              </span>

              <button
                type="button"
                className={styles.toggle}
                aria-expanded={isOpen}
                onClick={() => toggle(row.id)}
              >
                <span className={styles.cellTime}>{time(row.lastAt, datePatterns.short)}</span>
                <span
                  className={styles.cellJourney}
                  title={[referrerUrl(row.referrer) ?? t(labels.direct), entry]
                    .filter(Boolean)
                    .join(' → ')}
                >
                  {row.referrer ? (
                    <span className={styles.source}>
                      {search && <Search className={styles.inlineIcon} aria-hidden="true" />}
                      <span className={styles.ellipsis}>{referrerLabel(row.referrer)}</span>
                    </span>
                  ) : (
                    <span className={`${styles.source} ${styles.direct}`}>{t(labels.direct)}</span>
                  )}
                  <span className={styles.journeyArrow} aria-hidden="true">
                    →
                  </span>
                  <span className={styles.landing}>
                    <span className={styles.ellipsis}>
                      {pageLabel(
                        pages[0],
                        row.entryTitle,
                        t(labels.homePage),
                        row.hostname,
                        website?.domain,
                      ) ?? '—'}
                    </span>
                    {collapseRepeats(pages).length > 1 && (
                      <span className={styles.more}>+{collapseRepeats(pages).length - 1}</span>
                    )}
                  </span>
                </span>
                <span
                  className={styles.cellViews}
                  title={
                    visitorViews > views
                      ? `${visitorViews} ${t(labels.pageViews).toLowerCase()}, ${views} ${t(labels.thisSession)}`
                      : undefined
                  }
                >
                  {visitorViews > views ? (
                    <>
                      {visitorViews} <span className={styles.muted}>({views})</span>
                    </>
                  ) : (
                    views
                  )}
                  <span className={styles.unit}> {t(labels.pageViews).toLowerCase()}</span>
                </span>
                <span className={styles.cellPlace}>
                  <TypeIcon type="country" value={row.country}>
                    <span className={styles.ellipsis}>{row.city || location || '—'}</span>
                  </TypeIcon>
                </span>
                {hasNetwork && (
                  <span className={styles.cellOrg} title={row.org ?? undefined}>
                    <span className={styles.ellipsis}>
                      {shortOrg(row.org) || <span className={styles.muted}>—</span>}
                    </span>
                    {tags}
                  </span>
                )}
                <span className={styles.cellSystem}>
                  <SystemIcons device={row.device} os={row.os} browser={row.browser} />
                </span>
                <ChevronDown
                  className={styles.chevron}
                  data-open={isOpen || undefined}
                  aria-hidden="true"
                />
              </button>
            </div>

            {isOpen && (
              <div className={styles.details}>
                <dl className={styles.fields}>
                  <Field label={t(labels.pageViews)}>
                    {visitorViews > views ? (
                      <span>
                        {visitorViews}{' '}
                        <span className={styles.muted}>
                          ({views} {t(labels.thisSession)})
                        </span>
                      </span>
                    ) : (
                      views
                    )}
                  </Field>
                  <Field label={t(labels.latestPageView)}>{time(row.lastAt)}</Field>
                  {seconds > 0 && (
                    <Field label={t(labels.sessionLength)}>
                      {formatShortTime(seconds, ['h', 'm', 's'], ' ')}
                    </Field>
                  )}
                  <Field label={t(labels.resolution)}>{row.screen || '—'}</Field>
                  <Field label={t(labels.system)}>
                    <SystemIcons device={row.device} os={row.os} browser={row.browser} showText />
                  </Field>
                </dl>

                <dl className={styles.fields}>
                  {row.ipSessions !== undefined && (
                    <Field label={t(labels.totalSessions)}>
                      <span>{Number(row.ipSessions) || 1}</span>
                      {row.ip && (
                        <Button
                          variant="quiet"
                          size="sm"
                          aria-label={t(labels.search)}
                          onPress={() =>
                            router.push(updateParams({ search: row.ip as string, page: 1 }))
                          }
                        >
                          <Icon size="sm">
                            <Search />
                          </Icon>
                        </Button>
                      )}
                    </Field>
                  )}
                  <Field label={t(labels.location)}>
                    <TypeIcon type="country" value={row.country}>
                      {location || '—'}
                    </TypeIcon>
                  </Field>
                  {row.ip !== undefined && (
                    <Field label={t(labels.ispIp)}>
                      <span>
                        <strong className={styles.org}>{row.org || '—'}</strong>
                        {row.ip && <span className={styles.muted}> ({row.ip})</span>}
                      </span>
                      {tags}
                    </Field>
                  )}
                  <Field label={search ? t(labels.searchReferral) : t(labels.referringUrl)}>
                    {row.referrer ? (
                      link(referrerUrl(row.referrer))
                    ) : (
                      <span className={styles.muted}>{t(labels.noReferrer)}</span>
                    )}
                  </Field>
                  <Field label={t(labels.entryPage)}>{link(entry)}</Field>
                  {views > 1 && latest !== entry && (
                    <Field label={t(labels.latestPage)}>{link(latest)}</Field>
                  )}
                  {pages.length > 1 && (
                    <Field label={t(labels.pages)}>
                      <ol className={styles.pageList}>
                        {collapseRepeats(pages).map((path, i) => (
                          <li key={`${i}-${path}`}>
                            <span className={styles.pageIndex}>{i + 1}</span>
                            {link(pageUrl(row.hostname, path), path)}
                          </li>
                        ))}
                      </ol>
                    </Field>
                  )}
                  <Field label="">
                    <button
                      type="button"
                      className={styles.detailsLink}
                      onClick={() => openVisitor(row)}
                    >
                      <UserRound aria-hidden="true" />
                      {t(labels.visitorDetails)}
                    </button>
                  </Field>
                </dl>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

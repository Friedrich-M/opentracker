import type { ReactNode } from 'react';
import { DateDistance } from '@/components/common/DateDistance';
import { SystemIcons } from '@/components/common/SystemIcons';
import { TypeIcon } from '@/components/common/TypeIcon';
import { useFormat, useLocale, useMessages, useRegionNames, useTimezone } from '@/components/hooks';
import { getDatePatterns } from '@/lib/lang';
import { referrerLabel, referrerUrl } from './VisitorActivity';
import styles from './VisitorActivity.module.css';

/**
 * StatCounter's Magnify Visitor facts in two columns: where the visitor is
 * from (initial referrer, ISP, IP and host name, location, sessions) and what
 * they use (device and resolution, OS, browser, first and last seen).
 */
export function VisitorFacts({
  data,
  initialReferrer,
  totalSessions,
  hostname,
}: {
  data: any;
  initialReferrer: string | null;
  totalSessions: number | null;
  hostname?: string | null;
}) {
  const { t, labels } = useMessages();
  const { formatValue } = useFormat();
  const { locale } = useLocale();
  const { getRegionName } = useRegionNames(locale);
  const { formatTimezoneDate } = useTimezone();
  const datePatterns = getDatePatterns(locale);
  const place = [
    data.city,
    data.region && getRegionName(data.region),
    formatValue(data.country, 'country'),
  ]
    .filter(Boolean)
    .join(', ');

  const when = (date: string) => (
    <span>
      <span className={styles.time}>
        {formatTimezoneDate(new Date(date).toISOString(), datePatterns.long)}
      </span>{' '}
      <span className={styles.muted}>
        (<DateDistance date={new Date(date)} />)
      </span>
    </span>
  );

  return (
    <div className={styles.facts}>
      <dl className={styles.fields}>
        <Fact label={t(labels.initialReferrer)}>
          {initialReferrer ? (
            <a
              className={styles.url}
              href={referrerUrl(initialReferrer) as string}
              target="_blank"
              rel="noreferrer noopener"
            >
              {referrerLabel(initialReferrer)}
            </a>
          ) : (
            <span className={styles.muted}>{t(labels.noReferrer)}</span>
          )}
        </Fact>
        {data.ip !== undefined && (
          <>
            <Fact label={t(labels.isp)}>
              <strong className={styles.org}>{data.org || '—'}</strong>
              {data.asn ? <span className={styles.muted}>AS{data.asn}</span> : null}
            </Fact>
            <Fact label={t(labels.ipAddress)}>
              <span>
                {data.ip || '—'}
                {hostname && <span className={styles.muted}> — {hostname}</span>}
              </span>
            </Fact>
          </>
        )}
        <Fact label={t(labels.location)}>
          <TypeIcon type="country" value={data.country}>
            {place || '—'}
          </TypeIcon>
        </Fact>
        {totalSessions !== null && <Fact label={t(labels.totalSessions)}>{totalSessions}</Fact>}
      </dl>
      <dl className={styles.fields}>
        <Fact label={t(labels.platform)}>
          <span>
            {formatValue(data.device, 'device')}
            {data.screen ? ` / ${data.screen}` : ''}
          </span>
        </Fact>
        <Fact label={t(labels.system)}>
          <SystemIcons device={data.device} os={data.os} browser={data.browser} showText />
        </Fact>
        {data.language && <Fact label={t(labels.language)}>{data.language}</Fact>}
        <Fact label={t(labels.firstSeen)}>{when(data.firstAt)}</Fact>
        <Fact label={t(labels.lastSeen)}>{when(data.lastAt)}</Fact>
      </dl>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

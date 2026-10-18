import { Column, Grid, Icon, Label, Row } from '@umami/react-zen';
import type { ReactNode } from 'react';
import { DateDistance } from '@/components/common/DateDistance';
import { TypeIcon } from '@/components/common/TypeIcon';
import { useFormat, useLocale, useMessages, useRegionNames } from '@/components/hooks';
import { Building2, Calendar, Globe, KeyRound, Landmark, MapPin } from '@/components/icons';
import { Network } from '@/components/svg';

export function SessionInfo({ data }) {
  const { locale } = useLocale();
  const { t, labels } = useMessages();
  const { formatValue } = useFormat();
  const { getRegionName } = useRegionNames(locale);
  const distinctId =
    data?.distinctIds?.length > 1
      ? `${data.distinctIds.length} linked IDs`
      : data?.distinctId?.trim();
  const stitchedSessionCount = data?.stitchedSessionCount;

  return (
    <Grid columns="repeat(auto-fit, minmax(200px, 1fr)" gap>
      <Info label={t(labels.distinctId)} icon={<KeyRound />}>
        {distinctId ? <span style={{ overflowWrap: 'anywhere' }}>{distinctId}</span> : '—'}
      </Info>

      <Info label={t(labels.lastSeen)} icon={<Calendar />}>
        <DateDistance date={new Date(data.lastAt)} />
      </Info>

      <Info label={t(labels.firstSeen)} icon={<Calendar />}>
        <DateDistance date={new Date(data.firstAt)} />
      </Info>

      <Info label={t(labels.country)} icon={<TypeIcon type="country" value={data?.country} />}>
        {formatValue(data?.country, 'country')}
      </Info>

      <Info label={t(labels.region)} icon={<MapPin />}>
        {getRegionName(data?.region)}
      </Info>

      <Info label={t(labels.city)} icon={<Landmark />}>
        {data?.city}
      </Info>

      <Info label={t(labels.org)} icon={<Building2 />}>
        {data?.org ? (
          <span style={{ overflowWrap: 'anywhere' }}>
            {data.org}
            {data.asn ? ` (AS${data.asn})` : ''}
          </span>
        ) : null}
      </Info>

      <Info label={t(labels.ipAddress)} icon={<Globe />}>
        {data?.ip ? <span style={{ overflowWrap: 'anywhere' }}>{data.ip}</span> : null}
      </Info>

      <Info label={t(labels.browser)} icon={<TypeIcon type="browser" value={data?.browser} />}>
        {formatValue(data?.browser, 'browser')}
      </Info>

      <Info
        label={t(labels.os)}
        icon={<TypeIcon type="os" value={data?.os?.toLowerCase()?.replaceAll(/\W/g, '-')} />}
      >
        {formatValue(data?.os, 'os')}
      </Info>

      <Info label={t(labels.platform)} icon={<TypeIcon type="device" value={data?.device} />}>
        {formatValue(data?.device, 'device')}
        {data?.screen ? ` / ${data.screen}` : ''}
      </Info>

      {distinctId && stitchedSessionCount > 1 && (
        <Info label="Linked sessions" icon={<Network />}>
          {stitchedSessionCount}
        </Info>
      )}
    </Grid>
  );
}

const Info = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) => {
  return (
    <Column>
      <Label>{label}</Label>
      <Row alignItems="center" gap>
        {icon && <Icon>{icon}</Icon>}
        {children || '—'}
      </Row>
    </Column>
  );
};

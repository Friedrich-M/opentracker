'use client';
import { Button, Column, Heading, Icon, Row, Tab, TabList, TabPanel, Tabs } from '@umami/react-zen';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { SessionMark } from '@/components/common/SessionMark';
import {
  useFormat,
  useMessages,
  useNavigation,
  useVisitorLabelQuery,
  useVisitorNetworkQuery,
  useVisitorPathsQuery,
  useWebsiteSessionQuery,
} from '@/components/hooks';
import { X } from '@/components/icons';
import { SessionData } from './SessionData';
import { SessionDeleteButton } from './SessionDeleteButton';
import { SessionReplaysDataTable } from './SessionReplaysDataTable';
import { VisitorFacts } from './VisitorFacts';
import { VisitorLabel } from './VisitorLabel';
import { VisitorMap } from './VisitorMap';
import { initialReferrer, type PathEvent, VisitorPaths } from './VisitorPaths';

/**
 * The visitor panel, after StatCounter's Magnify Visitor: who it is (label,
 * else network, else place), a map of the IP's approximate location, the
 * facts, then Navigation paths across every visit; properties and replays
 * sit in tabs below.
 */
export function SessionProfile({
  websiteId,
  sessionId,
  showReplays = true,
  onClose,
}: {
  websiteId: string;
  sessionId: string;
  showReplays?: boolean;
  onClose?: () => void;
}) {
  const { data, isLoading, error } = useWebsiteSessionQuery(websiteId, sessionId);
  const { t, labels } = useMessages();
  const { pathname } = useNavigation();
  const isSharePage = pathname.includes('/share/');
  const { formatValue } = useFormat();
  // Network data (IP, label, map, host name) is the owner's only: the
  // session route strips `ip` for share links, so its presence gates them.
  const isOwner = Boolean(data && data.ip !== undefined && !isSharePage);
  const { data: label } = useVisitorLabelQuery(isOwner ? data?.ip : null);
  const { data: network } = useVisitorNetworkQuery(websiteId, sessionId, isOwner);
  const { data: paths } = useVisitorPathsQuery(websiteId, sessionId);
  const events: PathEvent[] = paths ?? [];
  const place = [data?.city, data?.country && formatValue(data.country, 'country')]
    .filter(Boolean)
    .join(', ');
  // Who this is, as plainly as the data allows: the owner's label, else the
  // network it came from, else where it was.
  const title = label?.name || data?.org || place || t(labels.unknown);
  const showDeleteButton = Boolean(!isSharePage && data?.canDelete);
  const coordinates = network?.coordinates;

  return (
    <LoadingPanel
      data={data}
      isLoading={isLoading}
      error={error}
      loadingIcon="spinner"
      loadingPlacement="absolute"
    >
      {data && (
        <Column gap width="100%" minWidth="0">
          {onClose && (
            <Row justifyContent="flex-end" gap="1">
              {showDeleteButton && (
                <SessionDeleteButton websiteId={websiteId} sessionId={sessionId} onSave={onClose} />
              )}
              <Button onPress={onClose} variant="quiet">
                <Icon>
                  <X />
                </Icon>
              </Button>
            </Row>
          )}
          <Column gap="6" width="100%" minWidth="0">
            <Column gap="3">
              <Heading size={{ base: 'xl', md: '2xl' }}>{title}</Heading>
              <Row alignItems="center" gap="3" wrap="wrap">
                <SessionMark id={data.id} size="lg" />
                {isOwner && data.ip && <VisitorLabel ip={data.ip} />}
              </Row>
            </Column>

            {coordinates && (
              <VisitorMap
                latitude={coordinates.latitude}
                longitude={coordinates.longitude}
                accuracyRadius={coordinates.accuracyRadius}
                caption={place || undefined}
              />
            )}

            <VisitorFacts
              data={data}
              initialReferrer={initialReferrer(events)}
              totalSessions={paths ? new Set(events.map(e => e.sessionId)).size : null}
              hostname={network?.hostname}
            />

            <Column gap="3">
              <Heading size="lg">{t(labels.navigationPaths)}</Heading>
              <VisitorPaths
                websiteId={websiteId}
                sessionId={sessionId}
                currentSessionId={sessionId}
              />
            </Column>

            <Tabs>
              <TabList>
                <Tab id="properties">{t(labels.properties)}</Tab>
                {showReplays && <Tab id="replays">{t(labels.replays)}</Tab>}
              </TabList>
              <TabPanel id="properties">
                <SessionData sessionId={sessionId} websiteId={websiteId} />
              </TabPanel>
              {showReplays && (
                <TabPanel id="replays" style={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}>
                  <SessionReplaysDataTable websiteId={websiteId} sessionId={sessionId} />
                </TabPanel>
              )}
            </Tabs>
          </Column>
        </Column>
      )}
    </LoadingPanel>
  );
}

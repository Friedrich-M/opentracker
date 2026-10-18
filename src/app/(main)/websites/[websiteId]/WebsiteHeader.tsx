import { Row } from '@umami/react-zen';
import { Favicon } from '@/components/common/Favicon';
import { IconLabel } from '@/components/common/IconLabel';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { useMessages, useNavigation, useWebsite } from '@/components/hooks';
import { Edit } from '@/components/icons';
import { ActiveUsers } from '@/components/metrics/ActiveUsers';
import { ProjectTabs } from './ProjectTabs';

export function WebsiteHeader({
  showActions,
  allowLink = true,
}: {
  showActions?: boolean;
  allowLink?: boolean;
}) {
  const website = useWebsite();
  const { renderUrl, pathname } = useNavigation();
  const isSettings = pathname.endsWith('/settings');

  const { t, labels } = useMessages();

  if (isSettings) {
    return null;
  }

  return (
    <PageHeader
      title={website.name}
      wordmark
      icon={<Favicon domain={website.domain} />}
      titleHref={allowLink ? renderUrl(`/websites/${website.id}`, false) : undefined}
      below={allowLink ? <ProjectTabs /> : undefined}
      // The project tabs draw opencode's tab rule; a second rule under them
      // would double it.
      showBorder={!allowLink}
    >
      <Row alignItems="center" gap="6" wrap="wrap">
        <ActiveUsers websiteId={website.id} allowLink={allowLink} />

        {showActions && (
          <LinkButton href={renderUrl(`/websites/${website.id}/settings`, false)}>
            <IconLabel icon={<Edit />}>{t(labels.edit)}</IconLabel>
          </LinkButton>
        )}
      </Row>
    </PageHeader>
  );
}

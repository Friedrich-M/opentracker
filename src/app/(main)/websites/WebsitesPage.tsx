'use client';
import { Column } from '@umami/react-zen';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useLoginQuery, useMessages } from '@/components/hooks';
import { ROLES } from '@/lib/constants';
import { WebsiteAddButton } from './WebsiteAddButton';
import { WebsitesDataTable } from './WebsitesDataTable';

export function WebsitesPage() {
  const { user } = useLoginQuery();
  const { t, labels } = useMessages();
  const showActions = user.role !== ROLES.viewOnly;

  return (
    <PageBody>
      <Column gap="6" margin="2">
        <PageHeader title={t(labels.websites)}>{showActions && <WebsiteAddButton />}</PageHeader>
        <Panel>
          <WebsitesDataTable showActions={showActions} />
        </Panel>
      </Column>
    </PageBody>
  );
}

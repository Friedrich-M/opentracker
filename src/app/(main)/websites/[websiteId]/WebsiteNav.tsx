import { NavMenu } from '@/components/common/NavMenu';
import { useMessages, useNavigation, useWebsiteNavItems } from '@/components/hooks';

export function WebsiteNav({
  websiteId,
  onItemClick,
}: {
  websiteId: string;
  onItemClick?: () => void;
}) {
  const { t, labels } = useMessages();
  const { renderUrl } = useNavigation();
  const { items, selectedKey } = useWebsiteNavItems(websiteId);

  return (
    <NavMenu
      items={items}
      selectedKey={selectedKey}
      back={{ href: renderUrl('/websites', false), label: t(labels.back) }}
      onItemClick={onItemClick}
    />
  );
}

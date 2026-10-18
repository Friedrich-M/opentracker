import { NavMenu } from '@/components/common/NavMenu';
import { useMessages, useNavigation } from '@/components/hooks';

export function SettingsNav({ onItemClick }: { onItemClick?: () => void }) {
  const { t, labels } = useMessages();
  const { renderUrl, pathname } = useNavigation();

  const items = [
    {
      label: t(labels.settings),
      items: [
        {
          id: 'preferences',
          label: t(labels.preferences),
          path: renderUrl('/settings/preferences'),
        },
        {
          id: 'profile',
          label: t(labels.profile),
          path: renderUrl('/settings/profile'),
        },
        {
          id: 'security',
          label: t(labels.security),
          path: renderUrl('/settings/security'),
        },
        {
          id: 'api-keys',
          label: t(labels.apiKeys),
          path: renderUrl('/settings/api-keys'),
        },
      ],
    },
  ];

  const selectedKey = items
    .flatMap(e => e.items)
    .find(({ path }) => path && pathname.includes(path.split('?')[0]))?.id;

  return (
    <NavMenu
      items={items}
      selectedKey={selectedKey}
      back={{ href: renderUrl('/websites', false), label: t(labels.back) }}
      onItemClick={onItemClick}
    />
  );
}

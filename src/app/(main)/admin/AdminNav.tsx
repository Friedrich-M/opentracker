import { NavMenu } from '@/components/common/NavMenu';
import { useMessages, useNavigation } from '@/components/hooks';

export function AdminNav({ onItemClick }: { onItemClick?: () => void }) {
  const { t, labels } = useMessages();
  const { pathname, renderUrl } = useNavigation();

  const items = [
    {
      label: t(labels.manage),
      items: [
        {
          id: 'users',
          label: t(labels.users),
          path: '/admin/users',
        },
        {
          id: 'websites',
          label: t(labels.websites),
          path: '/admin/websites',
        },
        {
          id: 'security',
          label: t(labels.security),
          path: '/admin/security',
        },
      ],
    },
  ];

  const selectedKey = items
    .flatMap(e => e.items)
    ?.find(({ path }) => path && pathname.startsWith(path))?.id;

  return (
    <NavMenu
      items={items}
      selectedKey={selectedKey}
      back={{ href: renderUrl('/websites', false), label: t(labels.back) }}
      onItemClick={onItemClick}
    />
  );
}

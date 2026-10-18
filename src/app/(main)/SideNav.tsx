import { AdminNav } from '@/app/(main)/admin/AdminNav';
import { SettingsNav } from '@/app/(main)/settings/SettingsNav';
import { WebsiteNav } from '@/app/(main)/websites/[websiteId]/WebsiteNav';
import { NavMenu } from '@/components/common/NavMenu';
import { useMessages, useNavigation } from '@/components/hooks';

// The sidebar's links for the current section: a website's reports, settings,
// admin, or the top level. App.tsx places it in the sidebar column on wide
// screens and in the mobile navigation drawer on narrow ones.
export function SideNav({ onItemClick }: { onItemClick?: () => void }) {
  const { t, labels } = useMessages();
  const { pathname, renderUrl, websiteId } = useNavigation();

  if (websiteId) {
    return <WebsiteNav websiteId={websiteId} onItemClick={onItemClick} />;
  }

  if (pathname.includes('/settings')) {
    return <SettingsNav onItemClick={onItemClick} />;
  }

  if (pathname.includes('/admin')) {
    return <AdminNav onItemClick={onItemClick} />;
  }

  return (
    <NavMenu
      items={[
        {
          items: [
            { id: 'websites', label: t(labels.websites), path: renderUrl('/websites', false) },
          ],
        },
      ]}
      selectedKey={pathname.startsWith('/websites') ? 'websites' : undefined}
      onItemClick={onItemClick}
    />
  );
}

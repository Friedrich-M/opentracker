'use client';
import Link from '@/components/common/Link';
import { PixelWordmark } from '@/components/common/PixelWordmark';
import { useLoginQuery, useMessages, useMobile, useNavigation } from '@/components/hooks';
import { UserButton } from '@/components/input/UserButton';
import { WebsiteSelect } from '@/components/input/WebsiteSelect';

// A port of opencode's DocsHeader (services/www/src/docs/components/
// DocsHeader.astro): brand, section links, then the website switcher where
// their search sits and the account menu where their GitHub link sits.
// Styled by .site-header in src/app/opencode.css.
export function TopNav() {
  const { t, labels } = useMessages();
  const { user } = useLoginQuery();
  const { isMobile } = useMobile();
  const { websiteId, router, renderUrl, pathname } = useNavigation();

  const navigateToEntity = (basePath: string, value: string | number | null) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    router.push(renderUrl(`${basePath}/${value}`, false));
  };

  const handleWebsiteChange = (value: string | number | null) => {
    navigateToEntity('/websites', value);
  };

  const sections = [
    { id: 'websites', label: t(labels.websites), path: '/websites' },
    { id: 'settings', label: t(labels.settings), path: '/settings' },
    user?.isAdmin && { id: 'admin', label: t(labels.admin), path: '/admin' },
  ].filter(Boolean) as { id: string; label: string; path: string }[];

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href={renderUrl('/websites', false)} aria-label="OpenTracker">
          <PixelWordmark text="opentracker" plain />
        </Link>
        <nav aria-label={t(labels.navigation)}>
          {sections.map(({ id, label, path }) => (
            <Link
              key={id}
              href={renderUrl(path, false)}
              aria-current={pathname.startsWith(path) ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-spacer" />
        {websiteId && (
          <div className="search-trigger">
            <WebsiteSelect websiteId={websiteId} onChange={handleWebsiteChange} />
          </div>
        )}
        <div className="header-account">
          <UserButton showText={!isMobile} />
        </div>
      </div>
    </header>
  );
}

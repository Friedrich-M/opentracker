'use client';
import { Loading } from '@umami/react-zen';
import { useRef } from 'react';
import { SideNav } from '@/app/(main)/SideNav';
import { TopNav } from '@/app/(main)/TopNav';
import { useLoginQuery, useMessages, useTwoFactorStatusQuery } from '@/components/hooks';
import { TwoFactorSetupModal } from '@/components/modals/TwoFactorSetupModal';

// The shell is a port of opencode's DocsLayout (services/www/src/docs/
// layouts/DocsLayout.astro): skip link, sticky header, a <details> drawer for
// navigation on phones, then the sidebar and main column of .docs-frame.
export function App({ children }) {
  const { user, isLoading, error } = useLoginQuery();
  const { t, labels } = useMessages();
  const { data: twoFactorStatus } = useTwoFactorStatusQuery(!!user);
  const needsTwoFactorSetup = !!(twoFactorStatus?.isRequired && !twoFactorStatus?.isEnabled);
  const drawer = useRef<HTMLDetailsElement>(null);

  if (isLoading) {
    return <Loading placement="absolute" />;
  }

  if (error) {
    window.location.href = `/login`;
    return null;
  }

  if (!user) {
    return null;
  }

  const closeDrawer = () => drawer.current?.removeAttribute('open');

  return (
    <>
      <a className="skip-link" href="#docs-content">
        {t(labels.skipToContent)}
      </a>
      <TopNav />
      <div
        aria-hidden={needsTwoFactorSetup || undefined}
        style={needsTwoFactorSetup ? { pointerEvents: 'none' } : undefined}
      >
        <details className="mobile-navigation" ref={drawer}>
          <summary>{t(labels.navigation)}</summary>
          <SideNav onItemClick={closeDrawer} />
        </details>
        <div className="docs-frame">
          <aside className="sidebar-column">
            <SideNav />
          </aside>
          <main id="docs-content">{children}</main>
        </div>
      </div>
      {needsTwoFactorSetup && <TwoFactorSetupModal required={true} />}
    </>
  );
}

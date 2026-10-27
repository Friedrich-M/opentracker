'use client';
import { Loading } from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { PixelWordmark } from '@/components/common/PixelWordmark';
import { useLoginQuery, useMessages } from '@/components/hooks';
import { LoginForm } from './LoginForm';

const REPOSITORY = 'https://github.com/Friedrich-M/opentracker';

// The sign-in screen as opencode.ai's home page: a framed column with the
// brand header, the pitch with a tabbed command box (their install box), and
// the form in the frame's second cell. Styled by .login-* in global.css.
export function LoginPageWrapper({ children }: PropsWithChildren) {
  const { t, labels } = useMessages();
  const { user, isLoading } = useLoginQuery();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  if (isLoading || user) {
    return <Loading placement="absolute" />;
  }

  return (
    <div className="login-page">
      <header className="site-header login-header">
        <div className="header-inner">
          <a className="brand" href="/" aria-label="OpenTracker">
            <PixelWordmark text="opentracker" mutedPrefix="open" />
          </a>
          <div className="header-spacer" />
          <nav aria-label={t(labels.navigation)}>
            <a href={REPOSITORY} target="_blank" rel="noopener">
              GitHub
            </a>
            <a href={`${REPOSITORY}#readme`} target="_blank" rel="noopener">
              {t(labels.loginDocs)}
            </a>
          </nav>
        </div>
      </header>
      <main className="login-frame">
        <section className="login-intro">
          <h1>{t(labels.loginHeadline)}</h1>
          <p>{t(labels.loginTagline)}</p>
          <CommandTabs />
        </section>
        <section className="login-panel">{children}</section>
      </main>
    </div>
  );
}

// opencode's curl / npm / brew box, here the two ways in: the source to host
// it yourself, and the tag a tracked page carries.
function CommandTabs() {
  const { t, labels } = useMessages();
  const [tab, setTab] = useState<'git' | 'script'>('git');
  const [copied, setCopied] = useState(false);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const commands = {
    git: `git clone ${REPOSITORY}`,
    script: `<script defer src="${origin}/script.js" data-website-id="…"></script>`,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(commands[tab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied: the command stays selectable.
    }
  };

  return (
    <div className="login-command">
      <div className="docs-plan-tabs-list" role="tablist">
        {(['git', 'script'] as const).map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`login-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="login-command-panel"
            onClick={() => {
              setTab(id);
              setCopied(false);
            }}
          >
            {id}
          </button>
        ))}
      </div>
      <div
        className="login-command-body"
        role="tabpanel"
        id="login-command-panel"
        aria-labelledby={`login-tab-${tab}`}
      >
        <code>{commands[tab]}</code>
        <button type="button" className="login-copy" onClick={copy} aria-live="polite">
          {copied ? t(labels.copied) : t(labels.copy)}
        </button>
      </div>
    </div>
  );
}

export function LoginPage() {
  return (
    <LoginPageWrapper>
      <LoginForm />
    </LoginPageWrapper>
  );
}

import { Column, Label, Row, Text } from '@umami/react-zen';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/common/CopyButton';
import { useApi, useMessages, useUserWebsitesQuery } from '@/components/hooks';

/**
 * Links that mark a browser as the owner's: open one in each browser you use
 * and its visits are recorded as internal (hidden unless "Include my visits").
 */
export function OwnerMarkSetting() {
  const { t, labels, messages } = useMessages();
  const { get, useQuery } = useApi();
  const { data } = useQuery<{ mark: string | null }>({
    queryKey: ['me:owner-mark'],
    queryFn: () => get('/me/owner-mark'),
  });
  // The dashboard's sign-in sets the tracker_me cookie on the site's parent
  // domain, which this subdomain can read too: its presence means this
  // browser's visits to the site are marked.
  const [marked, setMarked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!data) return;

    const hasCookie = () => /(?:^|; )tracker_me=/.test(document.cookie);
    const hostLabels = location.hostname.split('.');

    // Fallback for the server's Set-Cookie (POST /api/auth/verify): write the
    // same cookie here, on the parent of this host.
    if (data.mark && !hasCookie() && hostLabels.length >= 3) {
      // biome-ignore lint/suspicious/noDocumentCookie: a cross-subdomain cookie is the point
      document.cookie = `tracker_me=${encodeURIComponent(data.mark)}; Domain=${hostLabels
        .slice(1)
        .join('.')}; Path=/; Max-Age=34560000; Secure; SameSite=Lax`;
    }

    setMarked(hasCookie());
  }, [data]);

  const { data: websites } = useUserWebsitesQuery({}, { pageSize: 100 });
  const domains = Array.from(
    new Set<string>(
      (websites?.data ?? []).map((w: { domain: string }) => w.domain).filter(Boolean),
    ),
  );

  return (
    <Column gap="2">
      <Label>{t(labels.markMyBrowser)}</Label>
      {data?.mark ? (
        <>
          {marked !== null && (
            <Text weight="bold">
              {marked ? t(messages.thisBrowserMarked) : t(messages.thisBrowserNotMarked)}
            </Text>
          )}
          <Text color="muted">{t(messages.markMyBrowser)}</Text>
          {domains.map(domain => {
            const url = `https://${domain}/?tracker=${data.mark}`;
            return (
              <Row key={domain} alignItems="center" gap>
                <Text style={{ overflowWrap: 'anywhere' }}>{url}</Text>
                <CopyButton value={url} />
              </Row>
            );
          })}
          <Text color="muted">{t(messages.unmarkMyBrowser)}</Text>
        </>
      ) : (
        <Text color="muted">{t(messages.ownerMarkUnset)}</Text>
      )}
    </Column>
  );
}

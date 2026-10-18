import { Column, Label, Text, TextField } from '@umami/react-zen';
import { useMessages } from '@/components/hooks';

const SCRIPT_NAME = 'script.js';

export function WebsiteTrackingCode({
  websiteId,
  hostUrl,
  showHeader = true,
}: {
  websiteId: string;
  hostUrl?: string;
  showHeader?: boolean;
}) {
  const { t, messages, labels } = useMessages();
  const url = `${hostUrl || window?.location?.origin || ''}/${SCRIPT_NAME}`;

  const code = `<script defer src="${url}" data-website-id="${websiteId}"></script>`;

  return (
    <Column gap>
      {showHeader && <Label>{t(labels.trackingCode)}</Label>}
      <Text color="muted">{t(messages.trackingCode)}</Text>
      <TextField
        value={code}
        isReadOnly
        allowCopy
        asTextArea
        resize="none"
        className="code-textarea"
      />
    </Column>
  );
}

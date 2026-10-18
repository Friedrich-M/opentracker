import { Button, Column, Dialog, DialogTrigger, Modal } from '@umami/react-zen';
import { ActionForm } from '@/components/common/ActionForm';
import { useMessages, useModified, useNavigation } from '@/components/hooks';
import { WebsiteDeleteForm } from './WebsiteDeleteForm';
import { WebsiteResetForm } from './WebsiteResetForm';

export function WebsiteData({ websiteId, onSave }: { websiteId: string; onSave?: () => void }) {
  const { t, labels, messages } = useMessages();
  const { touch } = useModified();
  const { router, renderUrl } = useNavigation();

  const handleSave = () => {
    touch('websites');
    onSave?.();
    router.push(renderUrl(`/websites`));
  };

  const handleReset = async () => {
    onSave?.();
  };

  return (
    <Column gap="6">
      <ActionForm label={t(labels.resetWebsite)} description={t(messages.resetWebsiteWarning)}>
        <DialogTrigger>
          <Button>{t(labels.reset)}</Button>
          <Modal>
            <Dialog title={t(labels.resetWebsite)} style={{ width: 400 }}>
              {({ close }) => (
                <WebsiteResetForm websiteId={websiteId} onSave={handleReset} onClose={close} />
              )}
            </Dialog>
          </Modal>
        </DialogTrigger>
      </ActionForm>

      <ActionForm label={t(labels.deleteWebsite)} description={t(messages.deleteWebsiteWarning)}>
        <DialogTrigger>
          <Button data-test="button-delete" variant="danger">
            {t(labels.delete)}
          </Button>
          <Modal>
            <Dialog title={t(labels.deleteWebsite)} style={{ width: 400 }}>
              {({ close }) => (
                <WebsiteDeleteForm websiteId={websiteId} onSave={handleSave} onClose={close} />
              )}
            </Dialog>
          </Modal>
        </DialogTrigger>
      </ActionForm>
    </Column>
  );
}

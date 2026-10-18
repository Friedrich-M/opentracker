import { Button, Icon, Row, TextField } from '@umami/react-zen';
import { useEffect, useState } from 'react';
import { useApi, useMessages, useModified, useVisitorLabelQuery } from '@/components/hooks';
import { Edit } from '@/components/icons';
import styles from './VisitorActivity.module.css';

/**
 * The owner's name and note for the visitor at this IP. Saved labels show in
 * Visitor Activity for every session from the same address.
 */
export function VisitorLabel({ ip }: { ip: string }) {
  const { t, labels } = useMessages();
  const { post, del } = useApi();
  const { touch } = useModified();
  const { data } = useVisitorLabelQuery(ip);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(data?.name ?? '');
    setNote(data?.note ?? '');
  }, [data?.name, data?.note]);

  const done = () => {
    touch('visitor-labels');
    touch('sessions');
    setSaving(false);
    setEditing(false);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await post('/me/visitor-labels', { ip, name, note: note || null }).finally(done);
  };

  const remove = async () => {
    setSaving(true);
    await del('/me/visitor-labels', { ip }).finally(done);
  };

  if (!editing) {
    return (
      <Row alignItems="center" gap="2" wrap="wrap">
        {data?.name && <span className={styles.tag}>{data.name}</span>}
        {data?.note && <span className={styles.muted}>{data.note}</span>}
        <Button variant="quiet" size="sm" onPress={() => setEditing(true)}>
          <Icon size="sm">
            <Edit />
          </Icon>
          {data?.name ? t(labels.edit) : t(labels.visitorLabel)}
        </Button>
      </Row>
    );
  }

  return (
    <Row alignItems="flex-end" gap="2" wrap="wrap">
      <TextField
        label={t(labels.labelVisitorHint)}
        value={name}
        onChange={setName}
        maxLength={100}
        autoFocus
        style={{ minWidth: 200 }}
      />
      <TextField
        label={t(labels.note)}
        value={note}
        onChange={setNote}
        maxLength={500}
        style={{ minWidth: 240 }}
      />
      <Button variant="primary" onPress={save} isDisabled={saving || !name.trim()}>
        {t(labels.save)}
      </Button>
      {data?.name && (
        <Button onPress={remove} isDisabled={saving}>
          {t(labels.removeLabel)}
        </Button>
      )}
      <Button variant="quiet" onPress={() => setEditing(false)}>
        {t(labels.cancel)}
      </Button>
    </Row>
  );
}

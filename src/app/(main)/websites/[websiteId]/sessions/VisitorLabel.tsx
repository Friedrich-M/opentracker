import { Button, Checkbox, Icon, Row, TextField } from '@umami/react-zen';
import { useEffect, useState } from 'react';
import { useApi, useMessages, useModified, useVisitorLabelQuery } from '@/components/hooks';
import { Edit } from '@/components/icons';
import { isOwnerDevice, type OwnerDevice, toOwnerDevices } from '@/lib/owner-devices';
import styles from './VisitorActivity.module.css';

/**
 * The owner's name and note for the visitor at this IP. Saved labels show in
 * Visitor Activity for every session from the same address. "This device is
 * me" adds or removes this session's OS and screen in the label's owner
 * devices, whose visits are then stored as internal.
 */
export function VisitorLabel({ ip, os, screen }: { ip: string; os?: string; screen?: string }) {
  const { t, labels } = useMessages();
  const { post, del } = useApi();
  const { touch } = useModified();
  const { data } = useVisitorLabelQuery(ip);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const devices = toOwnerDevices(data?.ownerDevices);
  const canMarkDevice = Boolean(os && screen);
  const isMe = isOwnerDevice(devices, os, screen);
  const [markMe, setMarkMe] = useState(false);

  useEffect(() => {
    setName(data?.name ?? '');
    setNote(data?.note ?? '');
    setMarkMe(isMe);
  }, [data?.name, data?.note, isMe]);

  const done = () => {
    touch('visitor-labels');
    touch('sessions');
    setSaving(false);
    setEditing(false);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const others = devices.filter(d => !(d.os === os && d.screen === screen));
    const ownerDevices: OwnerDevice[] =
      markMe && canMarkDevice ? [...others, { os, screen }] : others;
    await post('/me/visitor-labels', { ip, name, note: note || null, ownerDevices }).finally(done);
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
        {isMe && <span className={styles.muted}>{t(labels.ownerDevice)}</span>}
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
      {canMarkDevice && (
        <Checkbox value={markMe ? 'true' : ''} onChange={setMarkMe}>
          {t(labels.ownerDevice)}
        </Checkbox>
      )}
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

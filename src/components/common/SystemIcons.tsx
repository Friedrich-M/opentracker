import { useFormat } from '@/components/hooks';

const iconSrc = (type: string, value?: string | null) =>
  `/images/${type}/${value?.toLowerCase().replaceAll(/\W/g, '-') || 'unknown'}.png`;

/**
 * Device, OS and browser as one cell of three icons (StatCounter's "System"),
 * with the names in the tooltip and, when `showText`, on lines beside them.
 */
export function SystemIcons({
  device,
  os,
  browser,
  showText = false,
}: {
  device?: string | null;
  os?: string | null;
  browser?: string | null;
  showText?: boolean;
}) {
  const { formatValue } = useFormat();
  const names = [
    formatValue(browser, 'browser'),
    formatValue(os, 'os'),
    formatValue(device, 'device'),
  ];

  return (
    <span
      title={names.join(' · ')}
      style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10 }}
    >
      <span style={{ display: 'inline-flex', gap: 5, paddingTop: 3, flexShrink: 0 }}>
        {(
          [
            ['device', device],
            ['os', os],
            ['browser', browser],
          ] as const
        ).map(([type, value]) => (
          <img
            key={type}
            src={iconSrc(type, value)}
            onError={e => {
              e.currentTarget.src = iconSrc(type, null);
            }}
            alt=""
            width={16}
            height={16}
          />
        ))}
      </span>
      {showText && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.35 }}>
          <span>{names[0]}</span>
          <span>{names[1]}</span>
          <span style={{ color: 'var(--site-ink-tertiary)' }}>{names[2]}</span>
        </span>
      )}
    </span>
  );
}

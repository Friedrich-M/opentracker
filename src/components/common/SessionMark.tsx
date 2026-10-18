/**
 * A session's short handle: the first six characters of its ID on the plate
 * tone. It replaced upstream's generated cartoon avatars, which looked like
 * people but carried no information (owner's request, 2026-10-11).
 */
export function SessionMark({ id, size = 'sm' }: { id: string; size?: 'sm' | 'lg' }) {
  const large = size === 'lg';

  return (
    <span
      title={id}
      style={{
        display: 'inline-block',
        padding: large ? '4px 10px' : '1px 7px',
        border: '1px solid var(--site-rule)',
        borderRadius: 4,
        background: 'var(--site-weak)',
        color: 'var(--site-ink-secondary)',
        fontSize: large ? '1rem' : '0.8rem',
        fontVariantNumeric: 'tabular-nums lining-nums',
        letterSpacing: '0.04em',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}
    >
      {id?.slice(0, 6) || '—'}
    </span>
  );
}

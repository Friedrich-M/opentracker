import { CELL, cellsToPath, layoutPixelText, ROWS } from '@/lib/pixel-glyphs';

const SUFFIX = /^(.+)(\.[a-z]{2,})$/i;

type Tone = 'strong' | 'base';

/**
 * Text drawn as opencode draws its logo (src/lib/pixel-glyphs.ts). `plain` is
 * their docs-header logo: one colour, no shadow. Otherwise it is their ornate
 * logo, two tones over the weak shadow (global.css, .pixel-*): with
 * `mutedPrefix` the prefix is in the base tone and the rest strong, as their
 * "open" and "code"; else a domain's name is strong and its suffix (".com")
 * base. Check canDrawPixelText first; characters without a glyph are dropped.
 */
export function PixelWordmark({
  text,
  plain,
  mutedPrefix,
  className,
}: {
  text: string;
  plain?: boolean;
  mutedPrefix?: string;
  className?: string;
}) {
  const parts = plain ? [{ text, tone: 'strong' as Tone }] : splitTones(text, mutedPrefix);

  let col = 0;
  const laid = parts.map(({ text, tone }) => {
    const layout = layoutPixelText(text, col);
    col += layout.width + 1;
    return { ...layout, tone };
  });
  const width = Math.max(col - 1, 0) * CELL;

  const strokes = (tone: Tone) =>
    cellsToPath(laid.filter(p => p.tone === tone).flatMap(p => p.cells.filter(c => !c.shade)));
  const shadows = cellsToPath(laid.flatMap(p => p.cells.filter(c => c.shade)));

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${ROWS * CELL}`}
      role="img"
      aria-label={text}
      xmlns="http://www.w3.org/2000/svg"
    >
      {!plain && <path className="pixel-shadow" d={shadows} />}
      <path className={plain ? 'pixel-plain' : 'pixel-strong'} d={strokes('strong')} />
      {!plain && <path className="pixel-base" d={strokes('base')} />}
    </svg>
  );
}

function splitTones(text: string, mutedPrefix?: string): { text: string; tone: Tone }[] {
  if (mutedPrefix && text.startsWith(mutedPrefix) && text.length > mutedPrefix.length) {
    return [
      { text: mutedPrefix, tone: 'base' },
      { text: text.slice(mutedPrefix.length), tone: 'strong' },
    ];
  }

  const match = text.includes(' ') ? null : text.match(SUFFIX);

  return match
    ? [
        { text: match[1], tone: 'strong' },
        { text: match[2], tone: 'base' },
      ]
    : [{ text, tone: 'strong' }];
}

/*
 * Letters in the grammar of opencode's logo (packages/ui/src/components/
 * logo.tsx, packages/tui/src/logo.ts): 1-cell strokes on a grid of 6-unit
 * cells, glyphs 4 cells wide with a 1-cell gap, an x-height of 5 cells, one
 * cell above for ascenders and one below for descenders. o, p, e, n, c and d
 * are theirs cell for cell; the rest are drawn to match.
 *
 * Rows, top to bottom: 0 ascender, 1–5 x-height, 6 descender. '#' is stroke.
 * Their shading rule (shade()): an empty cell in x-height rows 3–5 with a
 * stroke to its left in the same row gets the weak shadow tone, which is the
 * lighter block inside their o, c, e and n.
 */
const GLYPHS: Record<string, string[]> = {
  a: ['....', '####', '...#', '####', '#..#', '####', '....'],
  b: ['#...', '####', '#..#', '#..#', '#..#', '####', '....'],
  c: ['....', '####', '#...', '#...', '#...', '####', '....'],
  d: ['...#', '####', '#..#', '#..#', '#..#', '####', '....'],
  e: ['....', '####', '#..#', '####', '#...', '####', '....'],
  f: ['.###', '.#..', '####', '.#..', '.#..', '.#..', '....'],
  g: ['....', '####', '#..#', '#..#', '####', '...#', '####'],
  h: ['#...', '####', '#..#', '#..#', '#..#', '#..#', '....'],
  i: ['#', '.', '#', '#', '#', '#', '.'],
  j: ['..#', '...', '..#', '..#', '..#', '..#', '###'],
  k: ['#...', '#..#', '#.#.', '##..', '#.#.', '#..#', '....'],
  l: ['#', '#', '#', '#', '#', '#', '.'],
  m: ['.....', '#####', '#.#.#', '#.#.#', '#.#.#', '#.#.#', '.....'],
  n: ['....', '####', '#..#', '#..#', '#..#', '#..#', '....'],
  o: ['....', '####', '#..#', '#..#', '#..#', '####', '....'],
  p: ['....', '####', '#..#', '#..#', '#..#', '####', '#...'],
  q: ['....', '####', '#..#', '#..#', '#..#', '####', '...#'],
  r: ['....', '####', '#...', '#...', '#...', '#...', '....'],
  s: ['....', '####', '#...', '####', '...#', '####', '....'],
  t: ['.#..', '####', '.#..', '.#..', '.#..', '.###', '....'],
  u: ['....', '#..#', '#..#', '#..#', '#..#', '####', '....'],
  v: ['....', '#..#', '#..#', '#..#', '#..#', '.##.', '....'],
  w: ['.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '#####', '.....'],
  x: ['....', '#..#', '#..#', '.##.', '#..#', '#..#', '....'],
  y: ['....', '#..#', '#..#', '#..#', '####', '...#', '####'],
  z: ['....', '####', '...#', '.##.', '#...', '####', '....'],
  '0': ['####', '#..#', '#..#', '#..#', '#..#', '####', '....'],
  '1': ['##', '.#', '.#', '.#', '.#', '.#', '..'],
  '2': ['####', '...#', '####', '#...', '#...', '####', '....'],
  '3': ['####', '...#', '####', '...#', '...#', '####', '....'],
  '4': ['#..#', '#..#', '####', '...#', '...#', '...#', '....'],
  '5': ['####', '#...', '####', '...#', '...#', '####', '....'],
  '6': ['####', '#...', '####', '#..#', '#..#', '####', '....'],
  '7': ['####', '...#', '...#', '...#', '...#', '...#', '....'],
  '8': ['####', '#..#', '####', '#..#', '#..#', '####', '....'],
  '9': ['####', '#..#', '####', '...#', '...#', '####', '....'],
  '.': ['.', '.', '.', '.', '.', '#', '.'],
  '-': ['..', '..', '..', '##', '..', '..', '..'],
  _: ['....', '....', '....', '....', '....', '####', '....'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

export const CELL = 6;
export const ROWS = 7;

interface PixelCell {
  x: number;
  y: number;
  shade: boolean;
}

/** True when every character of `text` has a glyph. */
export function canDrawPixelText(text: string) {
  return [...text.toLowerCase()].every(char => char in GLYPHS);
}

function shade(rows: string[], row: number, col: number) {
  return row >= 3 && row <= 5 && rows[row][col] === '.' && rows[row].slice(0, col).includes('#');
}

/**
 * Lays `text` out cell by cell from the left edge: stroke cells and shadow
 * cells in grid units, plus the total width in cells. Characters without a
 * glyph are skipped; check canDrawPixelText first.
 */
export function layoutPixelText(text: string, startCol = 0) {
  const cells: PixelCell[] = [];
  let col = startCol;

  for (const char of text.toLowerCase()) {
    const rows = GLYPHS[char];
    if (!rows) continue;
    rows.forEach((line, row) => {
      [...line].forEach((mark, c) => {
        if (mark === '#') cells.push({ x: col + c, y: row, shade: false });
        else if (shade(rows, row, c)) cells.push({ x: col + c, y: row, shade: true });
      });
    });
    col += rows[0].length + 1;
  }

  return { cells, width: Math.max(col - startCol - 1, 0) };
}

/** An SVG path of unit squares, one subpath per cell. */
export function cellsToPath(cells: PixelCell[]) {
  return cells.map(({ x, y }) => `M${x * CELL} ${y * CELL}h${CELL}v${CELL}h-${CELL}z`).join('');
}

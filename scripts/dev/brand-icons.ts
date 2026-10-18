/* eslint-disable no-console */
/**
 * Draws the browser icons in opencode's favicon grammar
 * (services/www/public/favicon.svg: a #131010 square, a white ring of
 * 64-unit cells, its lower interior in #5a5858 shadow). Theirs is the "o" of
 * opencode; ours is the "o" of opentracker drawn as a target: a 5-cell ring
 * with a solid centre cell, shadow in the lower two interior rows around it.
 *
 *   npx tsx scripts/dev/brand-icons.ts   # writes public/favicon.svg and apple-touch-icon.png
 *
 * The PNG is rendered by Chrome through Playwright.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const SIZE = 512;
const UNIT = 64;

// '#' stroke, 's' shadow, '.' ground.
const MARK = ['#####', '#...#', '#s#s#', '#sss#', '#####'];

const left = (SIZE - MARK[0].length * UNIT) / 2;
const top = (SIZE - MARK.length * UNIT) / 2;

const path = (mark: string) =>
  MARK.flatMap((row, y) =>
    [...row].map((cell, x) =>
      cell === mark ? `M${left + x * UNIT} ${top + y * UNIT}h${UNIT}v${UNIT}h-${UNIT}z` : '',
    ),
  ).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">
<rect width="${SIZE}" height="${SIZE}" fill="#131010"/>
<path d="${path('s')}" fill="#5a5858"/>
<path d="${path('#')}" fill="#ffffff"/>
</svg>
`;

writeFileSync('public/favicon.svg', svg);

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
await page.setContent(
  `<body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="180" height="180"></body>`,
);
await page.screenshot({
  path: 'public/apple-touch-icon.png',
  clip: { x: 0, y: 0, width: 180, height: 180 },
});
await browser.close();

console.log('Wrote public/favicon.svg and public/apple-touch-icon.png');

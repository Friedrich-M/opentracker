/* eslint-disable no-console */
/**
 * Screenshot a dashboard page against a running dev server:
 *   pnpm screenshot --path /websites/<id> --theme dark --width 390 --out artifacts/shot.png
 * Logs in with TRACKER_USER / TRACKER_PASSWORD, by default the local
 * database's admin account with the first migration's initial password —
 * never use production credentials here. The main column scrolls
 * internally, so pass --height for a taller capture. Pass --click "<selector>"
 * to press an element first, e.g. to expand a row.
 */
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';

// Set by prisma/migrations/01_init for the admin user of a new database.
const INITIAL_ADMIN_PASSWORD = 'umami';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(' ')
    .split('--')
    .filter(Boolean)
    .map(pair => {
      const [key, ...value] = pair.trim().split(' ');
      return [key, value.join(' ')];
    }),
);

const base = args.base || process.env.TRACKER_URL || 'http://localhost:3000';
const theme = (args.theme || 'light') as 'light' | 'dark';
const width = Number(args.width || 1440);
const height = Number(args.height || 1000);
const out = args.out || `artifacts/screenshot-${theme}-${width}.png`;

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome' });
const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
const page = await context.newPage();

await page.goto(`${base}/login`);
await page
  .getByRole('textbox')
  .first()
  .fill(process.env.TRACKER_USER || 'admin');
await page
  .locator('input[type=password]')
  .fill(process.env.TRACKER_PASSWORD || INITIAL_ADMIN_PASSWORD);
await page.keyboard.press('Enter');
await page.waitForURL(/websites/, { timeout: 60000 });
// Let the post-login navigation settle before requesting the capture route.
await page.waitForLoadState('networkidle');
// No theme is saved, so the app follows the emulated system colour scheme.

await page.goto(`${base}${args.path || '/websites'}`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
// --click "<selector>" presses the first match before capturing (an expanded
// row, an open menu).
if (args.click) {
  await page.locator(args.click).first().click();
  await page.waitForTimeout(800);
}
await mkdir(dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: true });
console.log(`Saved ${out} (${page.url()})`);
await browser.close();

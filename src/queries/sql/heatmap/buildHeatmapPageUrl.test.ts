import { expect, test } from 'vitest';
import { buildHeatmapPageUrl } from './getHeatmap';

test.each([
  ['example.com', '/docs/a', 'https://example.com/docs/a'],
  ['https://example.com', '/', 'https://example.com/'],
  ['localhost:3000', '/x', 'http://localhost:3000/x'],
])('frames %s%s on the website itself', (domain, path, expected) => {
  expect(buildHeatmapPageUrl(domain, path)).toBe(expected);
});

test.each([
  '//evil.example/login',
  '/\\evil.example/x',
  'https://evil.example/',
  'javascript:alert(1)',
])('frames nothing for a path that leaves the website: %s', path => {
  expect(buildHeatmapPageUrl('example.com', path)).toBeNull();
});

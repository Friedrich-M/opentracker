import { expect, test } from 'vitest';
import { getContentSecurityPolicy } from './csp';

const directives = () =>
  Object.fromEntries(
    getContentSecurityPolicy()
      .split(';')
      .map(d => d.trim())
      .filter(Boolean)
      .map(d => {
        const [name, ...values] = d.split(/\s+/);
        return [name, values];
      }),
  );

test('replayed pages can load their fonts, stylesheets and media', () => {
  const csp = directives();

  expect(csp['font-src']).toEqual(expect.arrayContaining(["'self'", 'https:', 'data:']));
  expect(csp['style-src']).toEqual(expect.arrayContaining(["'self'", 'https:']));
  expect(csp['media-src']).toEqual(expect.arrayContaining(["'self'", 'https:']));
});

test('scripts and framing stay limited', () => {
  const csp = directives();

  expect(csp['script-src']).not.toContain('https:');
  expect(csp['default-src']).toEqual(["'self'"]);
  expect(csp['frame-ancestors']).toEqual(["'self'"]);
});

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  getOwnerCookieDomain,
  getOwnerMarkCookie,
  isInternalVisit,
  isLocalHostname,
  isOwnerMark,
} from './internal';

describe('isLocalHostname', () => {
  test.each([
    'localhost',
    'localhost:8000',
    'LOCALHOST',
    'preview.localhost',
    'macbook.local',
    '127.0.0.1',
    '127.0.0.1:3000',
    '0.0.0.0',
    '192.168.1.20',
    '10.0.0.5:8080',
    '172.16.4.1',
    '169.254.1.1',
    '[::1]',
    '[::1]:8000',
    '::1',
    'fd00::1',
  ])('treats %s as local', host => {
    expect(isLocalHostname(host)).toBe(true);
  });

  test.each([
    'example.com',
    'www.example.com',
    'stats.example.com',
    '192.0.2.10',
    '8.8.8.8',
    '',
    undefined,
    null,
  ])('treats %s as public', host => {
    expect(isLocalHostname(host as string)).toBe(false);
  });
});

describe('isInternalVisit', () => {
  beforeEach(() => {
    vi.stubEnv('OWNER_MARK', 'secret-mark-123');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('the owner mark makes a visit internal on the live site', () => {
    expect(isInternalVisit({ owner: 'secret-mark-123', hostname: 'example.com' })).toBe(true);
  });

  test('a wrong or guessed mark does not', () => {
    expect(isInternalVisit({ owner: 'me', hostname: 'example.com' })).toBe(false);
    expect(isInternalVisit({ owner: 'secret-mark-12', hostname: 'example.com' })).toBe(false);
  });

  test('no browser is marked when OWNER_MARK is unset', () => {
    vi.stubEnv('OWNER_MARK', '');
    expect(isOwnerMark('secret-mark-123')).toBe(false);
  });

  test('local previews are internal without a mark', () => {
    expect(isInternalVisit({ hostname: 'localhost:8000', origin: 'http://localhost:8000' })).toBe(
      true,
    );
  });

  // Any script can send a local hostname; the browser-set Origin must agree.
  test('a local hostname from a public origin, or with no origin, is not internal', () => {
    expect(isInternalVisit({ hostname: 'localhost', origin: 'https://example.com' })).toBe(false);
    expect(isInternalVisit({ hostname: 'localhost' })).toBe(false);
    expect(isInternalVisit({ hostname: 'localhost', origin: 'not a url' })).toBe(false);
  });

  test('ordinary readers are not internal', () => {
    expect(isInternalVisit({ hostname: 'example.com' })).toBe(false);
  });
});

describe('owner mark cookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('is set on the parent of the dashboard host', () => {
    expect(getOwnerCookieDomain('stats.example.com')).toBe('example.com');
    expect(getOwnerCookieDomain('stats.example.com:443')).toBe('example.com');
  });

  test('has no domain for local, IP or two-label hosts', () => {
    expect(getOwnerCookieDomain('localhost:3000')).toBeNull();
    expect(getOwnerCookieDomain('192.0.2.10')).toBeNull();
    expect(getOwnerCookieDomain('example.com')).toBeNull();
    expect(getOwnerCookieDomain(null)).toBeNull();
  });

  test('OWNER_COOKIE_DOMAIN overrides the derived domain', () => {
    vi.stubEnv('OWNER_COOKIE_DOMAIN', 'example.org');
    expect(getOwnerCookieDomain('stats.example.com')).toBe('example.org');
  });

  test('carries the mark only when OWNER_MARK is set', () => {
    vi.stubEnv('OWNER_MARK', '');
    expect(getOwnerMarkCookie('stats.example.com')).toBeNull();

    vi.stubEnv('OWNER_MARK', 'secret mark');
    const cookie = getOwnerMarkCookie('stats.example.com');
    expect(cookie).toContain('tracker_me=secret%20mark;');
    expect(cookie).toContain('Domain=example.com');
    expect(cookie).toContain('Secure');
    expect(getOwnerMarkCookie('localhost:3000')).toBeNull();
  });
});

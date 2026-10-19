import { expect, test } from 'vitest';
import { clearLoginFailures, loginRetryAfter, recordLoginFailure } from './login-limit';

test('ten failures for one account from one address lock it for the window', () => {
  const now = 1_000_000;

  for (let i = 0; i < 9; i++) recordLoginFailure('198.51.100.1', 'admin', now);
  expect(loginRetryAfter('198.51.100.1', 'admin', now)).toBe(0);

  recordLoginFailure('198.51.100.1', 'admin', now);
  expect(loginRetryAfter('198.51.100.1', 'admin', now)).toBe(15 * 60);
  // Another address, or the same address for another account, is not locked.
  expect(loginRetryAfter('198.51.100.2', 'admin', now)).toBe(0);
  expect(loginRetryAfter('198.51.100.1', 'someone', now)).toBe(0);
  // The window passes.
  expect(loginRetryAfter('198.51.100.1', 'admin', now + 15 * 60 * 1000)).toBe(0);
});

test('one address is limited across accounts, and a success clears its account', () => {
  const now = 2_000_000;

  for (let i = 0; i < 50; i++) recordLoginFailure('198.51.100.9', `user${i}`, now);
  expect(loginRetryAfter('198.51.100.9', 'fresh', now)).toBeGreaterThan(0);

  recordLoginFailure('198.51.100.10', 'ada', now);
  clearLoginFailures('198.51.100.10', 'ada');
  expect(loginRetryAfter('198.51.100.10', 'ada', now)).toBe(0);
});

test('without an address only the per-username limit applies', () => {
  const now = 3_000_000;

  for (let i = 0; i < 99; i++) recordLoginFailure(undefined, 'grace', now);
  expect(loginRetryAfter(undefined, 'grace', now)).toBe(0);
  // Other usernames are unaffected: there is no shared "unknown" address.
  expect(loginRetryAfter(undefined, 'henry', now)).toBe(0);

  recordLoginFailure(undefined, 'grace', now);
  expect(loginRetryAfter(undefined, 'grace', now)).toBeGreaterThan(0);
  // The username limit holds from any address, and a success does not reset it.
  clearLoginFailures('198.51.100.20', 'grace');
  expect(loginRetryAfter('198.51.100.20', 'grace', now)).toBeGreaterThan(0);
});

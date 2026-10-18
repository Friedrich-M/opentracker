import { describe, expect, test } from 'vitest';
import { getApiUrl } from './api-url';

describe('getApiUrl', () => {
  test('puts relative paths under /api', () => {
    expect(getApiUrl('/websites')).toBe('/api/websites');
    expect(getApiUrl('auth/verify')).toBe('/api/auth/verify');
  });

  test('returns absolute input urls unchanged', () => {
    expect(getApiUrl('https://example.com/api/websites')).toBe('https://example.com/api/websites');
  });
});

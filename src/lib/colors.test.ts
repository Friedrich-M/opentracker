import { describe, expect, test } from 'vitest';
import { getThemeColors, hex6 } from './colors';

describe('hex6', () => {
  test('is deterministic for the same input', () => {
    expect(hex6('tracker')).toBe(hex6('tracker'));
  });

  test('returns a 6-character hex string', () => {
    expect(hex6('anything')).toMatch(/^[0-9a-f]{6}$/);
  });

  test('produces different hashes for different inputs', () => {
    expect(hex6('a')).not.toBe(hex6('b'));
  });
});

describe('getThemeColors', () => {
  test('builds a color structure for the light theme', () => {
    const result = getThemeColors('light');

    expect(result.colors.theme).toMatchObject({ primary: '#4d8eff' });
    expect(result.colors.map.baseColor).toBe('#4d8eff');
    expect(result.colors.chart.views.backgroundColor).toContain('rgba');
    expect(result.colors.chart.text).toBeDefined();
  });

  test('builds a color structure for the dark theme', () => {
    const result = getThemeColors('dark');
    expect(result.colors.theme).toMatchObject({ fill: '#101010' });
  });
});

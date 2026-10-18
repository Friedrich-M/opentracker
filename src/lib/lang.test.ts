import { enUS, zhCN } from 'date-fns/locale';
import { describe, expect, test } from 'vitest';
import { getDateLocale, getTextDirection, toLanguage } from './lang';

describe('getDateLocale', () => {
  test('returns the configured date-fns locale', () => {
    expect(getDateLocale('zh-CN')).toBe(zhCN);
  });

  test('falls back to en-US for unknown locales', () => {
    expect(getDateLocale('xx-XX')).toBe(enUS);
  });
});

describe('getTextDirection', () => {
  test('returns ltr for the configured languages', () => {
    expect(getTextDirection('en-US')).toBe('ltr');
    expect(getTextDirection('zh-CN')).toBe('ltr');
  });

  test('falls back to ltr for unknown locales', () => {
    expect(getTextDirection('xx-XX')).toBe('ltr');
  });
});

test('unsupported locales fall back to English', () => {
  expect(toLanguage('zh-CN')).toBe('zh-CN');
  expect(toLanguage('zh-TW')).toBe('en-US');
  expect(toLanguage(null)).toBe('en-US');
});

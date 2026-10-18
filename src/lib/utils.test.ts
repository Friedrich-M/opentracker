import { describe, expect, test } from 'vitest';
import { ensureArray } from './utils';

describe('ensureArray', () => {
  test('returns empty array for undefined', () => {
    expect(ensureArray(undefined)).toEqual([]);
  });

  test('returns empty array for null', () => {
    expect(ensureArray(null)).toEqual([]);
  });

  test('returns the same array when given an array', () => {
    const arr = [1, 2, 3];
    expect(ensureArray(arr)).toBe(arr);
  });

  test('wraps a non-array value in an array', () => {
    expect(ensureArray('a')).toEqual(['a']);
    expect(ensureArray(0)).toEqual([0]);
  });
});

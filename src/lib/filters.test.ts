import { describe, expect, test } from 'vitest';
import { percentFilter } from './filters';

describe('percentFilter', () => {
  test('computes each row percentage of the total', () => {
    const result = percentFilter([
      { x: 'a', y: 25 },
      { x: 'b', y: 75 },
    ]);

    expect(result).toEqual([
      { x: 'a', y: 25, z: 25 },
      { x: 'b', y: 75, z: 75 },
    ]);
  });

  test('preserves extra props', () => {
    const result = percentFilter([{ x: 'a', y: 10, label: 'foo' }]);
    expect(result[0]).toMatchObject({ x: 'a', y: 10, z: 100, label: 'foo' });
  });

  test('uses zero percentage when total is zero', () => {
    const result = percentFilter([
      { x: 'a', y: 0 },
      { x: 'b', y: 0 },
    ]);

    expect(result).toEqual([
      { x: 'a', y: 0, z: 0 },
      { x: 'b', y: 0, z: 0 },
    ]);
  });

  test('returns an empty array for non-array input', () => {
    expect(percentFilter(undefined as any)).toEqual([]);
    expect(percentFilter(null as any)).toEqual([]);
  });
});

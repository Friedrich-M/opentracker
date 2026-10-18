import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getPerformanceChart } from './getPerformanceChart';
import { getPerformanceStats } from './getPerformanceStats';

const mocks = vi.hoisted(() => ({
  rawQuery: vi.fn(),
  parseFilters: vi.fn(() => ({
    queryParams: {},
    filterQuery: 'and filtered',
    cohortQuery: '',
    joinSessionQuery: '',
  })),
}));
vi.mock('@/lib/prisma', () => ({
  default: {
    rawQuery: mocks.rawQuery,
    parseFilters: mocks.parseFilters,
    getDateSQL: () => 'bucket',
  },
}));
const parameters = {
  startDate: new Date(1000),
  endDate: new Date(2000),
  unit: 'day',
  timezone: 'UTC',
  metric: 'inp',
};

describe('performance datasets', () => {
  beforeEach(() => {
    mocks.rawQuery.mockReset().mockResolvedValue([]);
  });
  test('chart executes only the selected metric time series', async () => {
    expect(await getPerformanceChart('website', parameters, {})).toEqual({ chart: [] });
    expect(mocks.rawQuery).toHaveBeenCalledTimes(1);
    const sql = mocks.rawQuery.mock.calls[0][0];
    expect(sql).toContain('inp');
    expect(sql).toContain('group by t');
    expect(sql).not.toContain('lcp_p50');
    expect(sql).toContain('and filtered');
  });
  test('stats executes only the summary and preserves empty-result defaults', async () => {
    const stats = await getPerformanceStats('website', parameters, {});
    expect(stats.count).toBe(0);
    expect(stats.lcp).toEqual({ p50: 0, p75: 0, p95: 0 });
    expect(mocks.rawQuery).toHaveBeenCalledTimes(1);
    expect(mocks.rawQuery.mock.calls[0][0]).not.toContain('group by t');
  });
});

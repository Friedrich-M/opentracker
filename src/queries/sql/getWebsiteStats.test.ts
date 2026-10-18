import { afterEach, describe, expect, test, vi } from 'vitest';

const parseFiltersResult = {
  queryParams: { websiteId: 'website-1' },
  filterQuery: 'and website_event.url_path = {{path}}',
  joinSessionQuery: 'join session on session.session_id = website_event.session_id',
  cohortQuery: 'join cohort on cohort.session_id = website_event.session_id',
  excludeBounceQuery: 'join excludeBounce on excludeBounce.visit_id = website_event.visit_id',
};

async function loadModule() {
  vi.resetModules();

  const prismaRawQuery = vi.fn().mockResolvedValue([{}]);
  const prismaParseFilters = vi.fn().mockReturnValue(parseFiltersResult);
  const getTimestampDiffSQL = vi.fn().mockReturnValue('ts_diff(t.min_time, t.max_time)');

  vi.doMock('@/lib/prisma', () => ({
    default: {
      rawQuery: prismaRawQuery,
      parseFilters: prismaParseFilters,
      getTimestampDiffSQL,
    },
  }));

  const mod = await import('./getWebsiteStats');

  return {
    getWebsiteStats: mod.getWebsiteStats,
    prismaRawQuery,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('getWebsiteStats default bounce path', () => {
  test('postgres uses a single grouped pass for the default path', async () => {
    const { getWebsiteStats, prismaRawQuery } = await loadModule();

    await getWebsiteStats('website-1', {});

    const [query] = prismaRawQuery.mock.calls[0];

    expect(query).toContain('t.c = 1 and t.has_custom_event = 0');
    expect(query).toContain(
      'max(case when website_event.event_type = 2 then 1 else 0 end) as "has_custom_event"',
    );
    expect(query).not.toContain('left join (');
  });
});

describe('getWebsiteStats filtered bounce path', () => {
  test('postgres switches to the visit-events join when event filters are present', async () => {
    const { getWebsiteStats, prismaRawQuery } = await loadModule();

    await getWebsiteStats('website-1', { path: '/pricing' } as any);

    const [query] = prismaRawQuery.mock.calls[0];

    expect(query).toContain('left join (');
    expect(query).toContain('coalesce(e.has_custom_event, 0) = 0');
    expect(query).toContain('event_type = 2');
  });
});

describe('getWebsiteStats excludeBounce path', () => {
  test('postgres skips the extra join when excludeBounce is enabled on the filtered path', async () => {
    const { getWebsiteStats, prismaRawQuery } = await loadModule();

    await getWebsiteStats('website-1', { excludeBounce: true, path: '/pricing' } as any);

    const [query] = prismaRawQuery.mock.calls[0];

    expect(query).toContain('0 as "bounces"');
    expect(query).not.toContain('left join (');
  });
});

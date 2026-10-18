import { afterEach, describe, expect, test, vi } from 'vitest';

const parseFiltersResult = {
  queryParams: { websiteId: 'website-1' },
  filterQuery: 'and website_event.url_path = {{path}}',
  joinSessionQuery: 'join session on session.session_id = website_event.session_id',
  cohortQuery: 'join cohort on cohort.session_id = website_event.session_id',
};

async function loadModule() {
  vi.resetModules();

  const prismaRawQuery = vi.fn().mockResolvedValue([{}]);
  const prismaParseFilters = vi.fn().mockReturnValue(parseFiltersResult);

  vi.doMock('@/lib/prisma', () => ({
    default: {
      rawQuery: prismaRawQuery,
      parseFilters: prismaParseFilters,
    },
  }));

  const mod = await import('./getWebsiteEventStats');

  return {
    getWebsiteEventStats: mod.getWebsiteEventStats,
    prismaRawQuery,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('getWebsiteEventStats', () => {
  test('postgres aggregates directly from filtered custom events', async () => {
    const { getWebsiteEventStats, prismaRawQuery } = await loadModule();

    await getWebsiteEventStats('website-1', { path: '/pricing' } as any);

    const [query] = prismaRawQuery.mock.calls[0];

    expect(query).toContain('cast(count(*) as bigint) as "events"');
    expect(query).toContain('count(distinct website_event.session_id) as "visitors"');
    expect(query).toContain('count(distinct website_event.visit_id) as "visits"');
    expect(query).toContain('count(distinct website_event.event_name) as "uniqueEvents"');
    expect(query).toContain('from website_event');
    expect(query).toContain('join session on session.session_id = website_event.session_id');
    expect(query).not.toContain('group by 1, 2, 3');
    expect(query).not.toContain('sum(t.c)');
  });
});

import { beforeEach, expect, test, vi } from 'vitest';
import { checkAuth } from '@/lib/auth';
import { fetchWebsite } from '@/lib/load';
import { getWebsiteSegment } from '@/queries/prisma';
import { getQueryFilters, parseRequest } from './request';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/tracker?schema=public';
  delete process.env.DATABASE_REPLICA_URL;
});

vi.mock('@/lib/load', () => ({
  fetchWebsite: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  checkAuth: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  getWebsiteSegment: vi.fn(),
}));

const fetchWebsiteMock = vi.mocked(fetchWebsite);
const getWebsiteSegmentMock = vi.mocked(getWebsiteSegment);

beforeEach(() => {
  fetchWebsiteMock.mockReset();
  getWebsiteSegmentMock.mockReset();
  fetchWebsiteMock.mockResolvedValue({ id: 'website-1' } as any);
});

test("combines a saved segment's session property filters with active filters", async () => {
  getWebsiteSegmentMock.mockResolvedValue({
    parameters: {
      filters: [],
      sessionPropertyFilters: [{ propertyName: 'plan', dataType: 1, operator: 'eq', value: 'pro' }],
    },
  } as any);

  const filters = await getQueryFilters(
    {
      startAt: String(+new Date('2026-09-01T00:00:00.000Z')),
      endAt: String(+new Date('2026-09-02T00:00:00.000Z')),
      segment: 'segment-1',
      spf0: '1.eq.country.US',
    },
    'website-1',
  );

  expect(filters.sessionPropertyFilters).toEqual([
    { propertyName: 'country', dataType: 1, operator: 'eq', value: 'US' },
    { propertyName: 'plan', dataType: 1, operator: 'eq', value: 'pro' },
  ]);
});

test.each([
  ['true', true],
  ['false', undefined],
  ['1', undefined],
])('includeInternal=%s sets the filter only for the exact value true', async (value, expected) => {
  const filters = await getQueryFilters(
    { startAt: Date.now() - 86400000, endAt: Date.now(), includeInternal: value } as any,
    'website-1',
  );

  expect(filters.includeInternal).toBe(expected);
});

test('parseRequest drops includeInternal for share tokens and keeps it for users', async () => {
  const request = () => new Request('http://localhost/api/websites/w-1/stats?includeInternal=true');

  vi.mocked(checkAuth).mockResolvedValueOnce({ shareToken: { websiteId: 'w-1' } } as any);
  await expect(parseRequest(request())).resolves.toMatchObject({ query: {} });

  vi.mocked(checkAuth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
  await expect(parseRequest(request())).resolves.toMatchObject({
    query: { includeInternal: 'true' },
  });
});

test('parseRequest with requireUser rejects a share token and accepts a user', async () => {
  const request = () => new Request('http://localhost/api/me/api-keys');

  vi.mocked(checkAuth).mockResolvedValueOnce({ shareToken: { websiteId: 'w-1' } } as any);
  const rejected = await parseRequest(request(), undefined, { requireUser: true });
  expect(rejected.error).toBeDefined();
  expect(rejected.error().status).toBe(401);

  vi.mocked(checkAuth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
  const accepted = await parseRequest(request(), undefined, { requireUser: true });
  expect(accepted.error).toBeUndefined();
  expect(accepted.auth.user.id).toBe('user-1');
});

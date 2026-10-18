import { beforeEach, expect, test, vi } from 'vitest';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canViewWebsiteSection } from '@/permissions';
import { getWebsiteSessions } from '@/queries/sql';
import { GET } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
  getQueryFilters: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canViewWebsiteSection: vi.fn(),
}));

vi.mock('@/queries/sql', () => ({
  getWebsiteSessions: vi.fn(),
}));

const row = {
  id: 'session-1',
  city: 'Springfield',
  ip: '192.0.2.10',
  asn: 88,
  org: 'Example University',
};

beforeEach(() => {
  vi.mocked(canViewWebsiteSection).mockResolvedValue(true);
  vi.mocked(getQueryFilters).mockResolvedValue({} as any);
  vi.mocked(getWebsiteSessions).mockReset();
  vi.mocked(getWebsiteSessions).mockResolvedValue({
    data: [row],
    count: 1,
    page: 1,
    pageSize: 20,
  } as any);
});

const call = () =>
  GET(new Request('http://localhost/api/websites/website-1/sessions'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });

test('share tokens get sessions without network fields or network search', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { shareToken: { websiteId: 'website-1' } },
    query: {},
    error: undefined,
  } as any);

  const body = await (await call()).json();

  expect(body.data[0]).toEqual({ id: 'session-1', city: 'Springfield' });
  expect(vi.mocked(getWebsiteSessions).mock.calls[0][2]).toEqual({ includeNetwork: false });
});

test('the logged-in owner gets network fields and network search', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: {},
    error: undefined,
  } as any);

  const body = await (await call()).json();

  expect(body.data[0]).toMatchObject({ ip: '192.0.2.10', org: 'Example University' });
  expect(vi.mocked(getWebsiteSessions).mock.calls[0][2]).toEqual({
    includeNetwork: true,
    userId: 'user-1',
  });
});

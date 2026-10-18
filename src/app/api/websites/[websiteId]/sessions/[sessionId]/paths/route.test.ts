import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canViewWebsiteSection } from '@/permissions';
import { getVisitorPaths } from '@/queries/sql';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/permissions', () => ({ canViewWebsiteSection: vi.fn() }));
vi.mock('@/queries/sql', () => ({ getVisitorPaths: vi.fn() }));

beforeEach(() => {
  vi.mocked(canViewWebsiteSection).mockResolvedValue(true);
  vi.mocked(getVisitorPaths).mockReset();
  vi.mocked(getVisitorPaths).mockResolvedValue([]);
});

const call = () =>
  GET(new Request('http://localhost/api/websites/w/sessions/s/paths'), {
    params: Promise.resolve({ websiteId: 'w', sessionId: 's' }),
  });

test('the logged-in owner gets paths across their websites', async () => {
  vi.mocked(parseRequest).mockResolvedValue({ auth: { user: { id: 'user-1' } } });

  await call();

  expect(vi.mocked(getVisitorPaths)).toHaveBeenCalledWith('w', 's', { userId: 'user-1' });
});

test('a share link gets the single session, never an IP match', async () => {
  vi.mocked(parseRequest).mockResolvedValue({ auth: { shareToken: { websiteId: 'w' } } });

  await call();

  expect(vi.mocked(getVisitorPaths)).toHaveBeenCalledWith('w', 's', { userId: undefined });
});

test('a caller without access is refused', async () => {
  vi.mocked(parseRequest).mockResolvedValue({ auth: null });
  vi.mocked(canViewWebsiteSection).mockResolvedValue(false);

  const res = await call();

  expect(res.status).toBe(401);
  expect(vi.mocked(getVisitorPaths)).not.toHaveBeenCalled();
});

import { beforeEach, expect, test, vi } from 'vitest';
import { getCoordinates } from '@/lib/detect';
import { getHostName } from '@/lib/hostname';
import { parseRequest } from '@/lib/request';
import { canViewWebsite } from '@/permissions';
import { getWebsiteSession } from '@/queries/sql';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/permissions', () => ({ canViewWebsite: vi.fn() }));
vi.mock('@/queries/sql', () => ({ getWebsiteSession: vi.fn() }));
vi.mock('@/lib/detect', () => ({ getCoordinates: vi.fn() }));
vi.mock('@/lib/hostname', () => ({ getHostName: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(canViewWebsite).mockResolvedValue(true);
  vi.mocked(getWebsiteSession).mockResolvedValue({ id: 's', ip: '24.228.119.183' } as any);
  vi.mocked(getCoordinates).mockResolvedValue({
    latitude: 40.67,
    longitude: -73.95,
    accuracyRadius: 5,
  });
  vi.mocked(getHostName).mockResolvedValue('ool-18e477b7.dyn.optonline.net');
});

const call = () =>
  GET(new Request('http://localhost/api/websites/w/sessions/s/network'), {
    params: Promise.resolve({ websiteId: 'w', sessionId: 's' }),
  });

test('the owner gets coordinates and host name from the stored IP', async () => {
  vi.mocked(parseRequest).mockResolvedValue({ auth: { user: { id: 'u' } } });

  const res = await call();

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    coordinates: { latitude: 40.67, longitude: -73.95, accuracyRadius: 5 },
    hostname: 'ool-18e477b7.dyn.optonline.net',
  });
  expect(getCoordinates).toHaveBeenCalledWith('24.228.119.183');
});

test('share links are refused', async () => {
  vi.mocked(parseRequest).mockResolvedValue({ auth: { shareToken: { websiteId: 'w' } } });

  expect((await call()).status).toBe(401);
  expect(getWebsiteSession).not.toHaveBeenCalled();
});

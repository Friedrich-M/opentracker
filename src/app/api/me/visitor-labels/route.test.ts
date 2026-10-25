import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { markOwnerDeviceVisits, saveVisitorLabel } from '@/queries/prisma';
import { POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  deleteVisitorLabel: vi.fn(),
  getVisitorLabel: vi.fn(),
  markOwnerDeviceVisits: vi.fn(),
  saveVisitorLabel: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const saveMock = vi.mocked(saveVisitorLabel);
const markMock = vi.mocked(markOwnerDeviceVisits);
const phone = { os: 'iOS', screen: '402x874' };

const post = () => POST(new Request('http://localhost/api/me/visitor-labels', { method: 'POST' }));

beforeEach(() => {
  vi.clearAllMocks();
  saveMock.mockResolvedValue({ ip: '198.51.100.7', name: 'Me' } as any);
  markMock.mockResolvedValue(3);
});

test('saving owner devices also marks their recorded visits', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { ip: '198.51.100.7', name: 'Me', note: '', ownerDevices: [phone] },
    error: undefined,
  } as any);

  const response = await post();

  expect(response.status).toBe(200);
  expect(saveMock).toHaveBeenCalledWith('user-1', '198.51.100.7', 'Me', null, [phone]);
  expect(markMock).toHaveBeenCalledWith('user-1', '198.51.100.7', [phone]);
});

test('a label without devices marks nothing', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { ip: '198.51.100.7', name: 'Lab' },
    error: undefined,
  } as any);

  await post();

  expect(saveMock).toHaveBeenCalledWith('user-1', '198.51.100.7', 'Lab', null, []);
  expect(markMock).toHaveBeenCalledWith('user-1', '198.51.100.7', []);
});

test('only logged-in users can label', async () => {
  parseRequestMock.mockResolvedValue({ auth: null, body: {}, error: undefined } as any);

  expect((await post()).status).toBe(401);
  expect(saveMock).not.toHaveBeenCalled();
});

test('the device list is bounded and shaped', async () => {
  parseRequestMock.mockResolvedValue({ auth: null, body: {}, error: undefined } as any);
  await post();
  const schema = parseRequestMock.mock.calls[0][1] as any;
  const base = { ip: '198.51.100.7', name: 'Me' };

  expect(schema.safeParse({ ...base, ownerDevices: [phone] }).success).toBe(true);
  expect(schema.safeParse({ ...base, ownerDevices: [{ os: 'iOS' }] }).success).toBe(false);
  expect(schema.safeParse({ ...base, ownerDevices: Array(11).fill(phone) }).success).toBe(false);
});

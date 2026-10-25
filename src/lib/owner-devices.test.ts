import { beforeEach, expect, test, vi } from 'vitest';
import { getOwnerDevices } from '@/queries/prisma';
import { clearOwnerDeviceCache, isOwnerDeviceVisit } from './owner-device-visit';
import { isOwnerDevice, toOwnerDevices } from './owner-devices';

vi.mock('@/queries/prisma', () => ({
  getOwnerDevices: vi.fn(),
}));

const getOwnerDevicesMock = vi.mocked(getOwnerDevices);
const phone = { os: 'iOS', screen: '402x874' };

beforeEach(() => {
  clearOwnerDeviceCache();
  getOwnerDevicesMock.mockReset();
});

test('stored JSON becomes a clean device list', () => {
  expect(toOwnerDevices(null)).toEqual([]);
  expect(toOwnerDevices([phone, { os: 'iOS' }, 'x', { ...phone, extra: 1 }])).toEqual([
    phone,
    phone,
  ]);
});

test('a device matches on both OS and screen', () => {
  expect(isOwnerDevice([phone], 'iOS', '402x874')).toBe(true);
  expect(isOwnerDevice([phone], 'iOS', '414x896')).toBe(false);
  expect(isOwnerDevice([phone], 'Android', '402x874')).toBe(false);
  expect(isOwnerDevice([phone], 'iOS', undefined)).toBe(false);
});

test('collection looks a website and IP up once, then uses the cache', async () => {
  getOwnerDevicesMock.mockResolvedValue([phone] as any);

  expect(await isOwnerDeviceVisit('w-1', '198.51.100.7', 'iOS', '402x874')).toBe(true);
  expect(await isOwnerDeviceVisit('w-1', '198.51.100.7', 'Mac OS', '2560x1440')).toBe(false);
  expect(getOwnerDevicesMock).toHaveBeenCalledTimes(1);
  expect(getOwnerDevicesMock).toHaveBeenCalledWith('w-1', '198.51.100.7');
});

test('a visit without an IP, OS or screen is never looked up', async () => {
  expect(await isOwnerDeviceVisit('w-1', undefined, 'iOS', '402x874')).toBe(false);
  expect(await isOwnerDeviceVisit('w-1', '198.51.100.7', 'iOS', undefined)).toBe(false);
  expect(getOwnerDevicesMock).not.toHaveBeenCalled();
});

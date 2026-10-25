import { getOwnerDevices } from '@/queries/prisma';
import { isOwnerDevice, type OwnerDevice, toOwnerDevices } from './owner-devices';

// Server only (it reads the database): kept apart from owner-devices.ts so the
// label editor can import those helpers without bundling the driver.
// Collection asks once per website and IP a minute, not once per event. A
// label saved elsewhere takes effect within that minute.
const CACHE_MS = 60_000;
const cache = new Map<string, { devices: OwnerDevice[]; at: number }>();

export async function isOwnerDeviceVisit(
  websiteId: string,
  ip: string | undefined,
  os?: string | null,
  screen?: string | null,
) {
  if (!ip || !os || !screen) {
    return false;
  }

  const key = `${websiteId}|${ip}`;
  const now = Date.now();
  let entry = cache.get(key);

  if (!entry || now - entry.at > CACHE_MS) {
    entry = { devices: toOwnerDevices(await getOwnerDevices(websiteId, ip)), at: now };
    cache.set(key, entry);

    if (cache.size > 5000) {
      cache.delete(cache.keys().next().value);
    }
  }

  return isOwnerDevice(entry.devices, os, screen);
}

/** Test hook: forget cached lookups. */
export function clearOwnerDeviceCache() {
  cache.clear();
}

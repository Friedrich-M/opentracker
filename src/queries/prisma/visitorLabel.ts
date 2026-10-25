import { Prisma } from '@/generated/prisma/client';
import { uuid } from '@/lib/crypto';
import type { OwnerDevice } from '@/lib/owner-devices';
import prisma from '@/lib/prisma';

const select = { ip: true, name: true, note: true, ownerDevices: true, updatedAt: true };

export async function getVisitorLabel(userId: string, ip: string) {
  return prisma.client.visitorLabel.findUnique({
    where: { userId_ip: { userId, ip } },
    select,
  });
}

export async function saveVisitorLabel(
  userId: string,
  ip: string,
  name: string,
  note: string | null,
  ownerDevices: OwnerDevice[] | null = null,
) {
  const devices = ownerDevices?.length
    ? (ownerDevices as unknown as Prisma.InputJsonArray)
    : Prisma.DbNull;

  return prisma.client.visitorLabel.upsert({
    where: { userId_ip: { userId, ip } },
    create: { id: uuid(), userId, ip, name, note, ownerDevices: devices },
    update: { name, note, ownerDevices: devices },
    select,
  });
}

export async function deleteVisitorLabel(userId: string, ip: string) {
  return prisma.client.visitorLabel.deleteMany({ where: { userId, ip } });
}

/** The owner devices the website's owner listed for this IP, or null. */
export async function getOwnerDevices(websiteId: string, ip: string) {
  const label = await prisma.client.visitorLabel.findFirst({
    where: { ip, user: { websites: { some: { id: websiteId } } } },
    select: { ownerDevices: true },
  });

  return label?.ownerDevices ?? null;
}

/**
 * Marks events already recorded from these devices at this IP, on the user's
 * own websites, as internal; returns how many changed. Unmarking a device does
 * not reverse it: an internal event cannot tell which rule made it so.
 */
export async function markOwnerDeviceVisits(userId: string, ip: string, devices: OwnerDevice[]) {
  if (!devices.length) {
    return 0;
  }

  return prisma.client.$executeRaw`
    update website_event e
    set internal = true
    from session s
    join website w on w.website_id = s.website_id
    where e.session_id = s.session_id
      and w.user_id = ${userId}::uuid
      and s.ip = ${ip}
      and not e.internal
      and exists (
        select 1 from jsonb_array_elements(${JSON.stringify(devices)}::jsonb) d
        where d->>'os' = s.os and d->>'screen' = s.screen
      )`;
}

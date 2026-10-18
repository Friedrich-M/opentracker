import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

const select = { ip: true, name: true, note: true, updatedAt: true };

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
) {
  return prisma.client.visitorLabel.upsert({
    where: { userId_ip: { userId, ip } },
    create: { id: uuid(), userId, ip, name, note },
    update: { name, note },
    select,
  });
}

export async function deleteVisitorLabel(userId: string, ip: string) {
  return prisma.client.visitorLabel.deleteMany({ where: { userId, ip } });
}

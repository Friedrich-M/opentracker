import prisma from '@/lib/prisma';

/** How many replay chunks a visit has stored, for the per-visit cap. */
export async function countReplayChunks(websiteId: string, visitId: string) {
  return prisma.client.sessionReplay.count({ where: { websiteId, visitId } });
}

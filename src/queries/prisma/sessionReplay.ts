import type { SessionReplaySaved } from '@/generated/prisma/client';
import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';
import { deleteReplayChunks } from '@/lib/replay-store';
import type { PageResult, QueryFilters } from '@/lib/types';

/**
 * Deletes replay chunks recorded before `before`, except visits the owner
 * saved. Returns the number of chunks removed.
 */
export async function deleteExpiredReplays(before: Date) {
  const saved = await prisma.client.sessionReplaySaved.findMany({
    select: { visitId: true },
  });

  const where = {
    createdAt: { lt: before },
    visitId: { notIn: saved.map(({ visitId }) => visitId) },
  };
  const expired = await prisma.client.sessionReplay.findMany({
    where,
    select: { id: true, websiteId: true, visitId: true },
  });

  // Bodies first: if the store fails, the rows stay and the next run retries.
  // Rows older than `before` stop arriving, so deleteMany matches the same rows.
  await deleteReplayChunks(expired);

  const { count } = await prisma.client.sessionReplay.deleteMany({ where });

  return count;
}

export async function getReplaySaved(websiteId: string, visitId: string): Promise<boolean> {
  const record = await prisma.client.sessionReplaySaved.findUnique({
    where: { websiteId_visitId: { websiteId, visitId } },
    select: { id: true },
  });
  return record !== null;
}

export async function createReplaySaved(websiteId: string, visitId: string, name: string) {
  return prisma.client.sessionReplaySaved.create({
    data: { id: uuid(), websiteId, visitId, name },
  });
}

export async function deleteReplaySaved(websiteId: string, visitId: string) {
  return prisma.client.sessionReplaySaved.deleteMany({
    where: { websiteId, visitId },
  });
}

export async function getSavedReplays(
  websiteId: string,
  filters: QueryFilters,
): Promise<PageResult<SessionReplaySaved[]>> {
  const { search } = filters;
  const { getSearchParameters, pagedQuery } = prisma;

  const where = {
    websiteId,
    ...getSearchParameters(search, [{ name: 'contains' }]),
  };

  return pagedQuery(
    'sessionReplaySaved',
    {
      where,
      orderBy: { createdAt: 'desc' },
    },
    filters,
  );
}

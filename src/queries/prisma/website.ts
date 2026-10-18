import { z } from 'zod';
import type { Prisma, Website } from '@/generated/prisma/client';
import prisma, { getSchema } from '@/lib/prisma';
import { deleteWebsiteReplayChunks, logReplayStoreError } from '@/lib/replay-store';
import { sanitizeSortFilters } from '@/lib/sort';
import type { PageResult, QueryFilters } from '@/lib/types';

const WEBSITE_SORT_FIELDS = ['name', 'domain', 'createdAt'] as const;

type WebsiteListItem = Website & {
  shareId: string | null;
  user?: { id: string; username: string } | null;
  createUser?: { id: string; username: string } | null;
};

async function deleteWebsiteDependentData(tx: any, websiteId: string) {
  await tx.sessionReplaySaved.deleteMany({
    where: { websiteId },
  });

  await tx.sessionReplay.deleteMany({
    where: { websiteId },
  });

  await tx.heatmapEvent.deleteMany({
    where: { websiteId },
  });

  await tx.eventData.deleteMany({
    where: { websiteId },
  });

  // Follow the real EventData -> WebsiteEvent dependency to clean up any legacy rows
  // whose duplicated websiteId drifted from the parent event row.
  const schema = getSchema();

  if (schema) {
    await tx.$executeRawUnsafe(`SET search_path TO "${schema}";`);
  }

  await tx.$executeRawUnsafe(
    `
      delete from event_data
      using website_event
      where event_data.website_event_id = website_event.event_id
        and website_event.website_id = $1
    `,
    websiteId,
  );

  await tx.sessionData.deleteMany({
    where: { websiteId },
  });

  await tx.sessionLink.deleteMany({
    where: { websiteId },
  });

  await tx.websiteEvent.deleteMany({
    where: { websiteId },
  });

  await tx.session.deleteMany({
    where: { websiteId },
  });
}

async function findWebsite(criteria: Prisma.WebsiteFindUniqueArgs) {
  return prisma.client.website.findUnique(criteria);
}

export async function getWebsite(websiteId: string) {
  if (!z.uuid().safeParse(websiteId).success) {
    return null;
  }

  const website = await findWebsite({
    where: {
      id: websiteId,
    },
  });

  if (!website) {
    return null;
  }

  return attachShareIdToWebsite(website);
}

export async function getWebsites(
  criteria: Prisma.WebsiteFindManyArgs,
  filters: QueryFilters,
): Promise<PageResult<WebsiteListItem[]>> {
  const sortFilters = sanitizeSortFilters(filters, WEBSITE_SORT_FIELDS);
  const { search } = sortFilters;
  const { getSearchParameters, pagedQuery } = prisma;

  const where: Prisma.WebsiteWhereInput = {
    ...criteria.where,
    ...getSearchParameters(search, [
      {
        name: 'contains',
      },
      { domain: 'contains' },
    ]),
    deletedAt: null,
  };

  const websites = await pagedQuery('website', { ...criteria, where }, sortFilters);

  return attachShareIdToWebsites(websites);
}

export async function getUserWebsites(userId: string, filters?: QueryFilters) {
  return getWebsites(
    {
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            username: true,
            id: true,
          },
        },
      },
    },
    sanitizeSortFilters(filters, WEBSITE_SORT_FIELDS, { orderBy: 'name' }),
  );
}

export async function createWebsite(
  data: Prisma.WebsiteCreateInput | Prisma.WebsiteUncheckedCreateInput,
) {
  return prisma.client.website.create({
    data,
  });
}

export async function updateWebsite(
  websiteId: string,
  data: Prisma.WebsiteUpdateInput | Prisma.WebsiteUncheckedUpdateInput,
) {
  return prisma.client.website.update({
    where: {
      id: websiteId,
    },
    data,
  });
}

export async function resetWebsite(websiteId: string) {
  const { transaction } = prisma;

  const website = await transaction(
    async tx => {
      await deleteWebsiteDependentData(tx, websiteId);

      const website = await tx.website.update({
        where: { id: websiteId },
        data: {
          resetAt: new Date(),
        },
      });

      return website;
    },
    {
      timeout: 30000,
    },
  );

  // A chunk recorded between the commit and this call loses its body and is
  // skipped on playback; resetting a live site accepts that.
  await deleteWebsiteReplayChunks(websiteId).catch(logReplayStoreError);

  return website;
}

export async function deleteWebsite(websiteId: string) {
  const { transaction } = prisma;

  const website = await transaction(async tx => deleteWebsiteRecords(tx, websiteId), {
    timeout: 30000,
  });

  await deleteWebsiteReplayChunks(websiteId).catch(logReplayStoreError);

  return website;
}

/**
 * Deletes a website and everything stored for it, inside the caller's
 * transaction; the caller then clears its replay store objects
 * (deleteWebsiteReplayChunks). Shared by deleteWebsite and deleteUser so neither leaves
 * replays, heatmaps or other per-website rows behind (relationMode = "prisma"
 * means the database has no foreign keys to cascade).
 */
export async function deleteWebsiteRecords(tx: any, websiteId: string) {
  await deleteWebsiteDependentData(tx, websiteId);

  await tx.report.deleteMany({
    where: { websiteId },
  });

  await tx.segment.deleteMany({
    where: { websiteId },
  });

  await tx.annotation.deleteMany({
    where: { websiteId },
  });

  await tx.share.deleteMany({
    where: { entityId: websiteId },
  });

  return tx.website.delete({
    where: { id: websiteId },
  });
}

async function attachShareIdToWebsite(website: Website) {
  const share = await prisma.client.share.findFirst({
    where: {
      entityId: website.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      slug: true,
    },
  });

  return {
    ...website,
    shareId: share?.slug ?? null,
  };
}

async function attachShareIdToWebsites(
  websites: PageResult<(Website & Partial<WebsiteListItem>)[]>,
): Promise<PageResult<WebsiteListItem[]>> {
  const websiteIds = websites.data.map(website => website.id);

  if (websiteIds.length === 0) {
    return {
      ...websites,
      data: websites.data.map(website => ({ ...website, shareId: null })),
    };
  }

  const shares = await prisma.client.share.findMany({
    where: {
      entityId: { in: websiteIds },
    },
    distinct: ['entityId'],
    orderBy: {
      createdAt: 'desc',
    },
  });

  const shareByWebsiteId = new Map(shares.map(share => [share.entityId, share.slug]));

  return {
    ...websites,
    data: websites.data.map(website => ({
      ...website,
      shareId: shareByWebsiteId.get(website.id) ?? null,
    })),
  };
}

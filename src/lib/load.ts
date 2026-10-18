import type { Website } from '@/generated/prisma/client';
import { getWebsite } from '@/queries/prisma';

export async function fetchWebsite(websiteId: string): Promise<Website> {
  const website = await getWebsite(websiteId);

  if (!website || website.deletedAt) {
    return null;
  }

  return website;
}

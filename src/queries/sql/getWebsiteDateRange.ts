import { DEFAULT_RESET_DATE } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { WebsiteDateRange } from '@/lib/types';

export async function getWebsiteDateRange(
  ...args: [websiteId: string]
): Promise<WebsiteDateRange | null> {
  return relationalQuery(...args);
}

async function relationalQuery(websiteId: string) {
  const { rawQuery, parseFilters } = prisma;
  const { queryParams } = parseFilters({
    startDate: new Date(DEFAULT_RESET_DATE),
    websiteId,
  });

  const result = await rawQuery(
    `
    select
      min(created_at) as "startDate",
      max(created_at) as "endDate"
    from website_event
    where website_id = {{websiteId::uuid}}
      and created_at >= {{startDate}}
      and internal = false
    `,
    queryParams,
  );

  return result[0] ?? null;
}

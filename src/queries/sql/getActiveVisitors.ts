import { subMinutes } from 'date-fns';
import prisma from '@/lib/prisma';
import type { ActiveVisitors } from '@/lib/types';

const FUNCTION_NAME = 'getActiveVisitors';

export async function getActiveVisitors(
  ...args: [websiteId: string]
): Promise<ActiveVisitors | null> {
  return relationalQuery(...args);
}

async function relationalQuery(websiteId: string) {
  const { rawQuery } = prisma;
  const startDate = subMinutes(new Date(), 5);

  const result = await rawQuery(
    `
    select count(distinct session_id) as "visitors"
    from website_event
    where website_id = {{websiteId::uuid}}
    and created_at >= {{startDate}}
    and internal = false
    `,
    { websiteId, startDate },
    FUNCTION_NAME,
  );

  return result?.[0] ?? null;
}

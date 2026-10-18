import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getLinkedSessionIds';

export async function getLinkedSessionIds(
  ...args: [websiteId: string, distinctId: string]
): Promise<{ sessionId: string; createdAt: string }[]> {
  return relationalQuery(...args);
}

async function relationalQuery(websiteId: string, distinctId: string) {
  const { rawQuery } = prisma;

  return rawQuery(
    `
    select
      session_id as "sessionId",
      min(created_at) as "createdAt"
    from session_link
    where website_id = {{websiteId::uuid}}
      and distinct_id = {{distinctId}}
    group by session_id
    `,
    { websiteId, distinctId },
    FUNCTION_NAME,
  );
}

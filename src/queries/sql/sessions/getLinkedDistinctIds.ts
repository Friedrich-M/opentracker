import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getLinkedDistinctIds';

export async function getLinkedDistinctIds(
  ...args: [websiteId: string, sessionId: string]
): Promise<string[]> {
  return relationalQuery(...args);
}

async function relationalQuery(websiteId: string, sessionId: string): Promise<string[]> {
  const { rawQuery } = prisma;

  return rawQuery(
    `
    select distinct distinct_id as "distinctId"
    from session_link
    where website_id = {{websiteId::uuid}}
      and session_id = {{sessionId::uuid}}
    `,
    { websiteId, sessionId },
    FUNCTION_NAME,
  ).then(result => (result as { distinctId: string }[]).map(({ distinctId }) => distinctId));
}

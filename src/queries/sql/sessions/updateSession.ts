import { FIELD_LENGTH } from '@/lib/constants';
import { truncateString } from '@/lib/format';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'updateSession';

interface UpdateSessionArgs {
  websiteId: string;
  sessionId: string;
  distinctId: string;
}

export async function updateSession(data: UpdateSessionArgs) {
  return relationalQuery(data);
}

async function relationalQuery({ websiteId, sessionId, distinctId }: UpdateSessionArgs) {
  const { writeRawQuery } = prisma;

  await writeRawQuery(
    `
    update session
    set distinct_id = {{distinctId}}
    where website_id = {{websiteId}}
      and session_id = {{sessionId}}
      and coalesce(distinct_id, '') = ''
    `,
    {
      websiteId,
      sessionId,
      distinctId: truncateString(distinctId, FIELD_LENGTH.distinctId),
    },
    FUNCTION_NAME,
  );
}

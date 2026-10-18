import { FIELD_LENGTH } from '@/lib/constants';
import { truncateString } from '@/lib/format';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'saveSessionLink';

interface SaveSessionLinkArgs {
  websiteId: string;
  sessionId: string;
  distinctId: string;
  createdAt?: Date;
}

export async function saveSessionLink(data: SaveSessionLinkArgs) {
  return relationalQuery(data);
}

async function relationalQuery({
  websiteId,
  sessionId,
  distinctId,
  createdAt,
}: SaveSessionLinkArgs) {
  const { writeRawQuery } = prisma;

  await writeRawQuery(
    `
    insert into session_link (
      website_id,
      session_id,
      distinct_id,
      created_at
    )
    values (
      {{websiteId}},
      {{sessionId}},
      {{distinctId}},
      {{createdAt}}
    )
    on conflict (website_id, distinct_id, session_id) do nothing
    `,
    {
      websiteId,
      sessionId,
      distinctId: truncateString(distinctId, FIELD_LENGTH.distinctId),
      createdAt,
    },
    FUNCTION_NAME,
  );
}

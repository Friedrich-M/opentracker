import { ENTITY_TYPE } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canCreateWebsite } from '@/permissions';
import { createShare, createWebsite } from '@/queries/prisma';
import { getUserWebsites } from '@/queries/prisma/website';
import { createWebsiteRequestSchema, listWebsitesQuerySchema } from './request-schema';

export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, listWebsitesQuerySchema, { requireUser: true });

  if (error) {
    return error();
  }

  const userId = auth.user.id;

  const filters = await getQueryFilters(query);

  return json(await getUserWebsites(userId, filters));
}

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, createWebsiteRequestSchema, { requireUser: true });

  if (error) {
    return error();
  }

  const { id, name, domain, shareId } = body;

  if (!(await canCreateWebsite(auth))) {
    return unauthorized();
  }

  const data: any = {
    id: id ?? uuid(),
    createdBy: auth.user.id,
    name,
    domain,
    userId: auth.user.id,
  };

  const website = await createWebsite(data);

  const share = shareId
    ? await createShare({
        id: uuid(),
        entityId: website.id,
        shareType: ENTITY_TYPE.website,
        name: website.name,
        slug: shareId,
        parameters: { overview: true, events: true },
      })
    : null;

  return json({
    ...website,
    shareId: share?.slug ?? null,
  });
}

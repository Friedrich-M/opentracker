import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json } from '@/lib/response';
import { pagingParams, sortingParams } from '@/lib/schema';
import { getUserWebsites } from '@/queries/prisma';

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    ...sortingParams,
  });

  const { auth, query, error } = await parseRequest(request, schema, { requireUser: true });

  if (error) {
    return error();
  }

  const filters = await getQueryFilters(query);

  return json(await getUserWebsites(auth.user.id, filters));
}

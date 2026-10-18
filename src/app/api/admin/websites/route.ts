import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams, sortingParams } from '@/lib/schema';
import { canViewAllWebsites } from '@/permissions';
import { getWebsites } from '@/queries/prisma/website';

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
    ...sortingParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!(await canViewAllWebsites(auth))) {
    return unauthorized();
  }

  const websites = await getWebsites(
    {
      include: {
        user: {
          where: {
            deletedAt: null,
          },
          select: {
            username: true,
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    },
    query,
  );

  return json(websites);
}

import { withoutNetwork } from '@/lib/network';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { filterParams, pagingParams, searchParams, withDateRange } from '@/lib/schema';
import { canViewWebsiteSection } from '@/permissions';
import { getWebsiteSessions } from '@/queries/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = withDateRange({
    ...filterParams,
    ...pagingParams,
    ...searchParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsiteSection(auth, websiteId, 'sessions'))) {
    return unauthorized();
  }

  const filters = await getQueryFilters(query, websiteId);

  // Visitor network data is for the logged-in owner only, never share links.
  const includeNetwork = !!auth.user;
  const data = await getWebsiteSessions(websiteId, filters, {
    includeNetwork,
    userId: auth.user?.id,
  });

  return json(includeNetwork ? data : { ...data, data: data.data.map(withoutNetwork) });
}

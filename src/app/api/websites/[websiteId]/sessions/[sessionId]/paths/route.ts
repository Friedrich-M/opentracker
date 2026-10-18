import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewWebsiteSection } from '@/permissions';
import { getVisitorPaths } from '@/queries/sql';

// The visitor's navigation paths. A logged-in owner sees every session from
// the same IP across their websites (the IP stays server-side); a share link
// sees this session alone, since matching by IP would reveal network identity.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; sessionId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, sessionId } = await params;

  if (!(await canViewWebsiteSection(auth, websiteId, ['sessions', 'events', 'realtime']))) {
    return unauthorized();
  }

  const data = await getVisitorPaths(websiteId, sessionId, { userId: auth.user?.id });

  return json(data);
}

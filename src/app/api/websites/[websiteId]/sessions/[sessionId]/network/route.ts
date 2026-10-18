import { getCoordinates } from '@/lib/detect';
import { getHostName } from '@/lib/hostname';
import { parseRequest } from '@/lib/request';
import { json, notFound, unauthorized } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getWebsiteSession } from '@/queries/sql';

// Where the visitor's IP is and what it is called: approximate coordinates
// (GeoLite2-City) for the visitor map and the reverse-DNS host name. Both are
// derived from the IP when asked, so older sessions get them too. Logged-in
// owners only; share links never see network data.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; sessionId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, sessionId } = await params;

  if (!auth?.user || !(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const session = await getWebsiteSession(websiteId, sessionId);

  if (!session) {
    return notFound();
  }

  const [coordinates, hostname] = await Promise.all([
    getCoordinates(session.ip),
    getHostName(session.ip),
  ]);

  return json({ coordinates, hostname });
}

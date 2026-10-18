import { withoutNetwork } from '@/lib/network';
import { parseRequest } from '@/lib/request';
import { json, notFound, ok, unauthorized } from '@/lib/response';
import { canDeleteWebsite, canViewWebsiteSection } from '@/permissions';
import { deleteSession } from '@/queries/prisma';
import { getLinkedDistinctIds, getLinkedSessionIds, getWebsiteSession } from '@/queries/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; sessionId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, sessionId } = await params;
  const canDelete = await canDeleteWebsite(auth, websiteId);

  if (!(await canViewWebsiteSection(auth, websiteId, ['sessions', 'events', 'realtime']))) {
    return unauthorized();
  }

  const data = await getWebsiteSession(websiteId, sessionId);

  if (!data) {
    return notFound();
  }

  let sessionIds = [sessionId];
  const linkedDistinctIds = await getLinkedDistinctIds(websiteId, sessionId);
  const distinctIds = linkedDistinctIds.length
    ? linkedDistinctIds
    : data.distinctId
      ? [data.distinctId]
      : [];
  const distinctId = distinctIds.length === 1 ? distinctIds[0] : undefined;

  // A collided legacy session cannot be safely attributed to one identity.
  data.distinctId = distinctId;

  if (distinctId) {
    const links = await getLinkedSessionIds(websiteId, distinctId);
    const linkedIds = links.map(link => link.sessionId);

    sessionIds = Array.from(new Set([sessionId, ...linkedIds]));
  }

  const stitchedSessionCount = sessionIds.length;

  return json({
    // Visitor network data is for the logged-in owner only, never share links.
    ...(auth.user ? data : withoutNetwork(data)),
    canDelete,
    distinctIds,
    stitchedSessionCount,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; sessionId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, sessionId } = await params;

  if (!(await canDeleteWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const deletedSession = await deleteSession(websiteId, sessionId);

  if (!deletedSession) {
    return notFound();
  }

  return ok();
}

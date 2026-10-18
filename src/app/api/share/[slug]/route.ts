import { ENTITY_TYPE, SHARE_TOKEN_TTL, SHARE_TOKEN_TYPE } from '@/lib/constants';
import { secret } from '@/lib/crypto';
import { createToken } from '@/lib/jwt';
import { json, notFound } from '@/lib/response';
import { getShareByCode, getWebsite } from '@/queries/prisma';

// Resolves a public share link to a short-lived token for its website; the
// share page asks for a fresh one on every load.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const share = await getShareByCode(slug);

  if (!share || share.shareType !== ENTITY_TYPE.website) {
    return notFound();
  }

  const website = await getWebsite(share.entityId);

  if (!website) {
    return notFound();
  }

  const data: Record<string, any> = {
    shareId: share.id,
    shareType: share.shareType,
    parameters: share.parameters,
    websiteId: share.entityId,
  };

  data.token = createToken({ ...data, type: SHARE_TOKEN_TYPE }, secret(), {
    expiresIn: SHARE_TOKEN_TTL,
  });

  return json(data);
}

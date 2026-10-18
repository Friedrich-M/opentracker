import { parseRequest } from '@/lib/request';
import { notFound, ok } from '@/lib/response';
import { deleteApiKey } from '@/queries/prisma/apiKey';

export async function DELETE(request: Request, { params }: { params: Promise<{ keyId: string }> }) {
  const { auth, error } = await parseRequest(request, undefined, { requireUser: true });

  if (error) {
    return error();
  }

  const { keyId } = await params;

  const count = await deleteApiKey(keyId, auth.user.id);

  if (!count) {
    return notFound();
  }

  return ok();
}

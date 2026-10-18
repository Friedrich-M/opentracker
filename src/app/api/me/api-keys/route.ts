import { z } from 'zod';
import { generateApiKey, getApiKeyPrefix, hashApiKey } from '@/lib/api-key';
import { uuid } from '@/lib/crypto';
import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';
import { createApiKey, getUserApiKeys } from '@/queries/prisma/apiKey';

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request, undefined, { requireUser: true });

  if (error) {
    return error();
  }

  return json(await getUserApiKeys(auth.user.id));
}

export async function POST(request: Request) {
  const schema = z.object({
    name: z.string().trim().min(1).max(255),
  });

  const { auth, body, error } = await parseRequest(request, schema, { requireUser: true });

  if (error) {
    return error();
  }

  const key = generateApiKey();

  const apiKey = await createApiKey({
    id: uuid(),
    userId: auth.user.id,
    name: body.name,
    keyHash: hashApiKey(key),
    keyPrefix: getApiKeyPrefix(key),
  });

  // The plaintext key is only returned once, at creation time.
  return json({ ...apiKey, key });
}

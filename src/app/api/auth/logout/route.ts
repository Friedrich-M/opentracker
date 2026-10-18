import { parseRequest } from '@/lib/request';
import { ok } from '@/lib/response';

export async function POST(request: Request) {
  const { error } = await parseRequest(request);

  if (error) {
    return error();
  }

  // Tokens are stateless; the client discards its copy.

  return ok();
}

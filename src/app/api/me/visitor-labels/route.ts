import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, json, ok, unauthorized } from '@/lib/response';
import { deleteVisitorLabel, getVisitorLabel, saveVisitorLabel } from '@/queries/prisma';

// The owner's labels for visitors, keyed by IP. Labels are network data, so
// only logged-in users reach them, and each user sees only their own.
const ipSchema = z.object({ ip: z.string().min(1).max(45) });

export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, ipSchema);

  if (error) {
    return error();
  }

  if (!auth?.user) {
    return unauthorized();
  }

  return json((await getVisitorLabel(auth.user.id, query.ip)) ?? null);
}

export async function POST(request: Request) {
  const schema = z.object({
    ip: z.string().min(1).max(45),
    name: z.string().trim().min(1).max(100),
    note: z.string().trim().max(500).optional().nullable(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!auth?.user) {
    return unauthorized();
  }

  return json(await saveVisitorLabel(auth.user.id, body.ip, body.name, body.note || null));
}

// DELETE carries the IP in the query string (parseRequest validates bodies
// for every method but GET), so it is checked here.
export async function DELETE(request: Request) {
  const { auth, query, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!auth?.user) {
    return unauthorized();
  }

  const parsed = ipSchema.safeParse(query);

  if (!parsed.success) {
    return badRequest(z.treeifyError(parsed.error));
  }

  await deleteVisitorLabel(auth.user.id, parsed.data.ip);

  return ok();
}

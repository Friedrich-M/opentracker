import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';

// The owner mark (OWNER_MARK) that tags a browser's visits as internal; shown
// to logged-in users only so they can mark their own browsers.
export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!auth?.user) {
    return unauthorized();
  }

  return json({ mark: process.env.OWNER_MARK || null });
}

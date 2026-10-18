import { getOwnerCookieDomain, getOwnerMarkCookie } from '@/lib/internal';
import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';

export async function POST(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const response = json(auth.user);

  // Every dashboard load re-marks this device as the owner's, so signing in
  // once on a phone is enough to keep its visits out of the default reports.
  if (auth?.user) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const cookie = getOwnerMarkCookie(host);

    if (cookie) {
      response.headers.append('Set-Cookie', cookie);
    }

    // The domain only, never the mark: lets the deploy logs show the device
    // marking working (tracker-deploy skill).
    console.log(
      `owner cookie ${cookie ? `set on ${getOwnerCookieDomain(host)}` : `not set (host ${host})`}`,
    );
  }

  return response;
}

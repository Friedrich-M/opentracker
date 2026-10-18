// Replay chunk store: the tracker's server is the only client, authenticated
// with Authorization: Bearer <REPLAY_STORE_SECRET>.
//
//   PUT  /chunk/<websiteId>/<visitId>/<replayId>  store a gzipped chunk
//   GET  /chunk/<websiteId>/<visitId>/<replayId>  read it back (404 if gone)
//   POST /delete  { keys: [...] } (at most 1000) or { prefix: "<websiteId>/" }
//
// Keys are "<websiteId>/<visitId>/<replayId>", so a website's chunks share a
// prefix and deleting the website can clear them without listing rows.

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const KEY = new RegExp(`^${UUID}/${UUID}/${UUID}$`);
const PREFIX = new RegExp(`^${UUID}/$`);
const CHUNK = new RegExp(`^/chunk/(${UUID}/${UUID}/${UUID})$`);
const MAX_KEYS = 1000;

const encoder = new TextEncoder();

function authorized(request, env) {
  if (!env.REPLAY_STORE_SECRET) return false;
  const header = encoder.encode(request.headers.get('Authorization') || '');
  const expected = encoder.encode(`Bearer ${env.REPLAY_STORE_SECRET}`);
  return (
    header.byteLength === expected.byteLength && crypto.subtle.timingSafeEqual(header, expected)
  );
}

async function deletePrefix(bucket, prefix) {
  let deleted = 0;
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor, limit: MAX_KEYS });
    if (page.objects.length) {
      await bucket.delete(page.objects.map(object => object.key));
      deleted += page.objects.length;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return deleted;
}

export default {
  async fetch(request, env) {
    if (!authorized(request, env)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const chunk = CHUNK.exec(pathname);

    if (chunk && request.method === 'PUT') {
      await env.REPLAYS.put(chunk[1], request.body, {
        httpMetadata: { contentType: 'application/gzip' },
      });
      return new Response(null, { status: 204 });
    }

    if (chunk && request.method === 'GET') {
      const object = await env.REPLAYS.get(chunk[1]);
      if (!object) return new Response('Not found', { status: 404 });
      return new Response(object.body, { headers: { 'Content-Type': 'application/gzip' } });
    }

    if (pathname === '/delete' && request.method === 'POST') {
      const body = await request.json().catch(() => null);

      const keys = body?.keys;
      if (Array.isArray(keys) && keys.length <= MAX_KEYS && keys.every(k => KEY.test(k))) {
        if (keys.length) await env.REPLAYS.delete(keys);
        return Response.json({ deleted: keys.length });
      }

      if (typeof body?.prefix === 'string' && PREFIX.test(body.prefix)) {
        return Response.json({ deleted: await deletePrefix(env.REPLAYS, body.prefix) });
      }

      return new Response('Bad request', { status: 400 });
    }

    return new Response('Not found', { status: 404 });
  },
};

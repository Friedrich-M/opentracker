import { serializeError } from 'serialize-error';

/**
 * Replay chunk bodies (gzipped rrweb events) live in Cloudflare R2 behind the
 * `tracker-replay-store` Worker (`workers/replay-store/`); `session_replay`
 * keeps only each chunk's metadata, with `events` null. Without
 * REPLAY_STORE_URL and REPLAY_STORE_SECRET (local development, tests) chunks
 * stay in the `events` column as before.
 */

const MAX_DELETE_KEYS = 1000;

interface StoredChunk {
  id: string;
  websiteId: string;
  visitId: string;
}

function getStore() {
  const url = process.env.REPLAY_STORE_URL;
  const secret = process.env.REPLAY_STORE_SECRET;

  return url && secret ? { url: url.replace(/\/+$/, ''), secret } : null;
}

export function hasReplayStore() {
  return getStore() !== null;
}

// The Worker accepts lowercase UUIDs only; ids from a URL or payload may not be.
function getReplayChunkKey({ id, websiteId, visitId }: StoredChunk) {
  return `${websiteId}/${visitId}/${id}`.toLowerCase();
}

async function request(path: string, init: RequestInit = {}) {
  const store = getStore();

  if (!store) {
    throw new Error('Replay store is not configured.');
  }

  return fetch(`${store.url}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${store.secret}` },
  });
}

export async function putReplayChunk(chunk: StoredChunk, body: Buffer) {
  const res = await request(`/chunk/${getReplayChunkKey(chunk)}`, {
    method: 'PUT',
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    throw new Error(`Replay store PUT failed: ${res.status}`);
  }
}

/**
 * The gzipped chunk, or null when the store no longer has it or is not
 * configured (a local copy of production rows).
 */
export async function getReplayChunk(chunk: StoredChunk): Promise<Buffer | null> {
  if (!hasReplayStore()) {
    return null;
  }

  const res = await request(`/chunk/${getReplayChunkKey(chunk)}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Replay store GET failed: ${res.status}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function postDelete(body: { keys: string[] } | { prefix: string }) {
  const res = await request('/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Replay store delete failed: ${res.status}`);
  }
}

/**
 * Removes stored bodies. The retention cron calls it before deleting rows, so
 * a failure is retried the next day; deletes a user asks for run it after the
 * commit through logReplayStoreError, leaving at worst unreachable objects.
 */
export async function deleteReplayChunks(chunks: StoredChunk[]) {
  if (!hasReplayStore()) {
    return;
  }

  const keys = chunks.map(getReplayChunkKey);

  for (let i = 0; i < keys.length; i += MAX_DELETE_KEYS) {
    await postDelete({ keys: keys.slice(i, i + MAX_DELETE_KEYS) });
  }
}

export async function deleteWebsiteReplayChunks(websiteId: string) {
  if (hasReplayStore()) {
    await postDelete({ prefix: `${websiteId.toLowerCase()}/` });
  }
}

/** For store cleanup after a committed delete: the delete itself succeeded. */
export function logReplayStoreError(error: unknown) {
  // eslint-disable-next-line no-console
  console.log('replay store cleanup failed', serializeError(error));
}

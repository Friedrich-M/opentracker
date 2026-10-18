import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  deleteReplayChunks,
  deleteWebsiteReplayChunks,
  getReplayChunk,
  hasReplayStore,
  putReplayChunk,
} from './replay-store';

const chunk = {
  id: '33333333-3333-4333-8333-333333333333',
  websiteId: '11111111-1111-4111-8111-111111111111',
  visitId: '22222222-2222-4222-8222-222222222222',
};
const key = `${chunk.websiteId}/${chunk.visitId}/${chunk.id}`;
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('REPLAY_STORE_URL', 'https://store.example/');
  vi.stubEnv('REPLAY_STORE_SECRET', 'secret');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test('is off without both settings', () => {
  vi.stubEnv('REPLAY_STORE_SECRET', '');
  expect(hasReplayStore()).toBe(false);
});

test('puts a chunk under website/visit/replay with the bearer secret', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

  await putReplayChunk(chunk, Buffer.from('gz'));

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`https://store.example/chunk/${key}`);
  expect(init.method).toBe('PUT');
  expect(init.headers.Authorization).toBe('Bearer secret');
});

test('lowercases ids in keys', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

  await putReplayChunk({ ...chunk, websiteId: chunk.websiteId.toUpperCase() }, Buffer.from('gz'));

  expect(fetchMock.mock.calls[0][0]).toBe(`https://store.example/chunk/${key}`);
});

test('reads nothing without a store', async () => {
  vi.stubEnv('REPLAY_STORE_URL', '');

  expect(await getReplayChunk(chunk)).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('throws when a put fails, so no row is written', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

  await expect(putReplayChunk(chunk, Buffer.from('gz'))).rejects.toThrow('500');
});

test('reads a chunk back and returns null when it is gone', async () => {
  fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2])));
  fetchMock.mockResolvedValueOnce(new Response('Not found', { status: 404 }));

  expect(await getReplayChunk(chunk)).toEqual(Buffer.from([1, 2]));
  expect(await getReplayChunk(chunk)).toBeNull();
});

test('deletes keys in batches of 1000', async () => {
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({ deleted: 0 })));

  await deleteReplayChunks(Array.from({ length: 1001 }, () => chunk));

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).keys).toHaveLength(1000);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).keys).toEqual([key]);
});

test('deletes a website by prefix', async () => {
  fetchMock.mockResolvedValue(Response.json({ deleted: 3 }));

  await deleteWebsiteReplayChunks(chunk.websiteId);

  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ prefix: `${chunk.websiteId}/` });
});

test('does nothing on delete without a store', async () => {
  vi.stubEnv('REPLAY_STORE_URL', '');

  await deleteReplayChunks([chunk]);
  await deleteWebsiteReplayChunks(chunk.websiteId);

  expect(fetchMock).not.toHaveBeenCalled();
});

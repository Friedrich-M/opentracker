import { gunzipSync } from 'node:zlib';
import prisma from '@/lib/prisma';
import { getReplayChunk } from '@/lib/replay-store';
import { getReplayTagQuery } from './getReplayTagQuery';

const FUNCTION_NAME = 'getReplayChunks';

// Parallel reads from the replay store per request.
const STORE_CONCURRENCY = 8;

interface ReplayChunk {
  sessionId: string;
  visitId: string;
  events: any[];
  chunkIndex: number;
  eventCount: number;
  startedAt: Date;
  endedAt: Date;
}

interface GetReplayChunksOptions {
  endAt?: Date;
  endChunkIndex?: number;
  // The project view's `tag` filter, as in the URL.
  tag?: string;
}

export async function getReplayChunks(
  websiteId: string,
  visitId: string,
  options: GetReplayChunksOptions = {},
): Promise<ReplayChunk[]> {
  return relationalQuery(websiteId, visitId, options);
}

async function relationalQuery(
  websiteId: string,
  visitId: string,
  { endAt, endChunkIndex, tag }: GetReplayChunksOptions,
): Promise<ReplayChunk[]> {
  const { rawQuery } = prisma;
  const { tagQuery, replayTags } = getReplayTagQuery(tag, 'tag');
  const endAtFilter = endAt
    ? `
      and started_at <= {{endAt}}
    `
    : '';
  const endChunkFilter =
    endChunkIndex !== undefined
      ? `
      and chunk_index <= {{endChunkIndex}}
    `
      : '';

  const chunks: {
    id: string;
    websiteId: string;
    sessionId: string;
    visitId: string;
    events: Buffer | null;
    chunkIndex: number;
    eventCount: number;
    startedAt: Date;
    endedAt: Date;
  }[] = await rawQuery(
    `
    select
      replay_id as "id",
      website_id as "websiteId",
      session_id as "sessionId",
      visit_id as "visitId",
      events,
      chunk_index as "chunkIndex",
      event_count as "eventCount",
      started_at as "startedAt",
      ended_at as "endedAt"
    from session_replay
    where website_id = {{websiteId::uuid}}
      and visit_id = {{visitId::uuid}}
      ${endAtFilter}
      ${endChunkFilter}
      ${tagQuery}
    order by chunk_index asc
    `,
    { websiteId, visitId, endAt, endChunkIndex, replayTags },
    FUNCTION_NAME,
  );

  // Rows with null events keep their body in the replay store.
  const bodies: (Buffer | null)[] = chunks.map(chunk =>
    chunk.events ? Buffer.from(chunk.events) : null,
  );
  const stored = chunks.flatMap((chunk, i) => (chunk.events ? [] : [i]));

  for (let i = 0; i < stored.length; i += STORE_CONCURRENCY) {
    await Promise.all(
      stored.slice(i, i + STORE_CONCURRENCY).map(async index => {
        bodies[index] = await getReplayChunk(chunks[index]);
      }),
    );
  }

  // A chunk whose body is missing is skipped; the player plays the rest.
  return chunks.flatMap(({ id: _id, websiteId: _websiteId, events: _events, ...chunk }, i) =>
    bodies[i] ? [{ ...chunk, events: JSON.parse(gunzipSync(bodies[i]).toString('utf-8')) }] : [],
  );
}

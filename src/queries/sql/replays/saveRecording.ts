import { gzipSync } from 'node:zlib';
import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';
import { hasReplayStore, putReplayChunk } from '@/lib/replay-store';

interface SaveRecordingArgs {
  websiteId: string;
  sessionId: string;
  visitId: string;
  chunkIndex: number;
  events: any[];
  eventCount: number;
  startedAt: Date;
  endedAt: Date;
  tag?: string;
}

export async function saveRecording(args: SaveRecordingArgs) {
  return relationalQuery(args);
}

async function relationalQuery({
  websiteId,
  sessionId,
  visitId,
  chunkIndex,
  events,
  eventCount,
  startedAt,
  endedAt,
  tag,
}: SaveRecordingArgs) {
  // recorder.js cached before chunks carried a tag (up to a day) sends none:
  // take the visit's latest page view, as migration 33 did for older rows.
  const chunkTag =
    tag ??
    (
      await prisma.client.websiteEvent.findFirst({
        where: { websiteId, visitId, eventType: 1 },
        orderBy: { createdAt: 'desc' },
        select: { tag: true },
      })
    )?.tag ??
    null;
  const compressed = gzipSync(Buffer.from(JSON.stringify(events), 'utf-8'));
  const id = uuid();
  const stored = hasReplayStore();

  // The body goes first, so a row never points at a chunk that was not stored;
  // if the insert then fails, the object is unreachable until its website goes.
  if (stored) {
    await putReplayChunk({ id, websiteId, visitId }, compressed);
  }

  return prisma.client.sessionReplay.create({
    data: {
      id,
      websiteId,
      sessionId,
      visitId,
      chunkIndex,
      events: stored ? null : (compressed as any),
      eventCount,
      startedAt,
      endedAt,
      tag: chunkTag,
    },
  });
}

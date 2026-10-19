import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  savedFindMany: vi.fn(),
  replayFindMany: vi.fn(),
  replayDeleteMany: vi.fn(),
  deleteReplayChunks: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      sessionReplaySaved: { findMany: mocks.savedFindMany },
      sessionReplay: { findMany: mocks.replayFindMany, deleteMany: mocks.replayDeleteMany },
    },
  },
}));

vi.mock('@/lib/replay-store', () => ({
  deleteReplayChunks: mocks.deleteReplayChunks,
}));

import { deleteExpiredReplays } from './sessionReplay';

const before = new Date('2026-10-01T00:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.replayFindMany.mockResolvedValue([]);
  mocks.replayDeleteMany.mockResolvedValue({ count: 0 });
});

test('a saved visit keeps only its own website’s chunks', async () => {
  mocks.savedFindMany.mockResolvedValue([{ websiteId: 'w-1', visitId: 'v-1' }]);

  await deleteExpiredReplays(before);

  const where = {
    createdAt: { lt: before },
    NOT: { OR: [{ websiteId: 'w-1', visitId: 'v-1' }] },
  };
  expect(mocks.replayFindMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
  expect(mocks.replayDeleteMany).toHaveBeenCalledWith({ where });
});

test('with nothing saved every expired chunk goes', async () => {
  mocks.savedFindMany.mockResolvedValue([]);

  await deleteExpiredReplays(before);

  expect(mocks.replayDeleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: before } } });
});

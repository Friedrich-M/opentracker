import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseRequest: vi.fn(),
  canUpdateWebsite: vi.fn(),
  hasReplayChunks: vi.fn(),
  createReplaySaved: vi.fn(),
}));

vi.mock('@/lib/request', () => ({ parseRequest: mocks.parseRequest }));

vi.mock('@/permissions', () => ({
  canUpdateWebsite: mocks.canUpdateWebsite,
  canViewAuthenticatedWebsite: vi.fn(),
}));

vi.mock('@/queries/prisma/sessionReplay', () => ({
  createReplaySaved: mocks.createReplaySaved,
  deleteReplaySaved: vi.fn(),
  getReplaySaved: vi.fn(),
  hasReplayChunks: mocks.hasReplayChunks,
}));

import { POST } from './route';

const save = () =>
  POST(new Request('http://localhost/api/websites/w-1/replays/saved/v-1', { method: 'POST' }), {
    params: Promise.resolve({ websiteId: 'w-1', replayId: 'v-1' }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.parseRequest.mockResolvedValue({ auth: { user: { id: 'u-1' } }, body: { isSaved: true } });
  mocks.canUpdateWebsite.mockResolvedValue(true);
});

test('a visit with no chunks on this website cannot be saved', async () => {
  mocks.hasReplayChunks.mockResolvedValue(false);

  expect((await save()).status).toBe(404);
  expect(mocks.hasReplayChunks).toHaveBeenCalledWith('w-1', 'v-1');
  expect(mocks.createReplaySaved).not.toHaveBeenCalled();
});

test('a recorded visit is saved', async () => {
  mocks.hasReplayChunks.mockResolvedValue(true);

  expect((await save()).status).toBe(200);
  expect(mocks.createReplaySaved).toHaveBeenCalledWith('w-1', 'v-1', '');
});

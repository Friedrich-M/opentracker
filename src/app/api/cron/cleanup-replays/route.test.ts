import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getRetentionDays } from '@/lib/cron';
import { deleteExpiredReplays } from '@/queries/prisma';
import { GET } from './route';

vi.mock('@/queries/prisma', () => ({ deleteExpiredReplays: vi.fn() }));

beforeEach(() => {
  vi.mocked(deleteExpiredReplays).mockReset();
  vi.mocked(deleteExpiredReplays).mockResolvedValue(3);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const call = (authorization?: string) =>
  GET(
    new Request('http://localhost/api/cron/cleanup-replays', {
      headers: authorization ? { authorization } : {},
    }),
  );

test('refuses requests without the cron secret', async () => {
  vi.stubEnv('CRON_SECRET', 'cron-secret');

  expect((await call()).status).toBe(401);
  expect((await call('Bearer wrong')).status).toBe(401);
  expect(deleteExpiredReplays).not.toHaveBeenCalled();
});

test('refuses everything when CRON_SECRET is unset', async () => {
  vi.stubEnv('CRON_SECRET', '');

  expect((await call('Bearer ')).status).toBe(401);
});

test('deletes replays older than the retention period', async () => {
  vi.stubEnv('CRON_SECRET', 'cron-secret');
  vi.stubEnv('REPLAY_RETENTION_DAYS', '14');

  const res = await call('Bearer cron-secret');
  const before = vi.mocked(deleteExpiredReplays).mock.calls[0][0];
  const age = Date.now() - before.getTime();

  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ deleted: 3 });
  expect(Math.round(age / 86400000)).toBe(14);
});

test('retention defaults to 14 days', () => {
  vi.stubEnv('REPLAY_RETENTION_DAYS', 'soon');
  expect(getRetentionDays()).toBe(14);
  vi.stubEnv('REPLAY_RETENTION_DAYS', '30');
  expect(getRetentionDays()).toBe(30);
});

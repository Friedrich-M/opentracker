import { expect, test, vi } from 'vitest';
import { deleteUser } from './user';

const { client, transaction, deleted } = vi.hoisted(() => {
  const deleted: string[] = [];
  const recorder = (table: string) => ({
    deleteMany: vi.fn(async ({ where }) => {
      deleted.push(`${table}:${where.websiteId ?? where.entityId ?? where.userId}`);
    }),
    delete: vi.fn(async ({ where }) => {
      deleted.push(`${table}:${where.id}`);
    }),
  });
  const tables = [
    'sessionReplaySaved',
    'sessionReplay',
    'heatmapEvent',
    'eventData',
    'sessionData',
    'sessionLink',
    'websiteEvent',
    'session',
    'report',
    'segment',
    'annotation',
    'share',
    'website',
    'user',
  ];
  const tx: Record<string, any> = Object.fromEntries(tables.map(t => [t, recorder(t)]));
  tx.$executeRawUnsafe = vi.fn();

  return {
    deleted,
    client: { website: { findMany: vi.fn(async () => [{ id: 'w-1' }, { id: 'w-2' }]) } },
    transaction: vi.fn(async (fn: (tx: any) => Promise<unknown>) => fn(tx)),
  };
});

vi.mock('@/lib/prisma', () => ({
  default: { client, transaction },
  getSchema: () => null,
}));

test('deleteUser removes every owned website with its replays, heatmaps and shares', async () => {
  await deleteUser('user-1');

  for (const websiteId of ['w-1', 'w-2']) {
    for (const table of ['sessionReplay', 'sessionReplaySaved', 'heatmapEvent', 'session']) {
      expect(deleted).toContain(`${table}:${websiteId}`);
    }
    expect(deleted).toContain(`share:${websiteId}`);
    expect(deleted).toContain(`website:${websiteId}`);
  }

  expect(deleted).toContain('report:user-1');
  expect(deleted.at(-1)).toBe('user:user-1');
});

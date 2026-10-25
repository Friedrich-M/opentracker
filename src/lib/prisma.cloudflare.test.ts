import { afterEach, beforeAll, expect, test, vi } from 'vitest';

// A Cloudflare build inlines OPENTRACKER_TARGET; set it before the import.
process.env.OPENTRACKER_TARGET = 'cloudflare';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/tracker?schema=public';
delete process.env.DATABASE_REPLICA_URL;

const adapterUrls: string[] = [];

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class PrismaPg {
    constructor({ connectionString }: { connectionString: string }) {
      adapterUrls.push(connectionString);
    }
  },
}));

vi.mock('@prisma/extension-read-replicas', () => ({
  readReplicas: () => () => ({}),
}));

vi.mock('@/generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {
    $queryRawUnsafe() {
      return this;
    }
    $on = vi.fn();
  },
}));

const CLOUDFLARE_CONTEXT = Symbol.for('__cloudflare-context__');

let prisma!: typeof import('./prisma').default;

beforeAll(async () => {
  ({ default: prisma } = await import('./prisma'));
});

afterEach(() => {
  delete globalThis[CLOUDFLARE_CONTEXT];
  delete process.env.OPENTRACKER_TARGET;
});

const inRequest = (env: Record<string, unknown> = {}) => {
  globalThis[CLOUDFLARE_CONTEXT] = { env, ctx: {} };
};

test('each Worker request gets its own client, reused within the request', () => {
  const client = prisma.client as any;

  inRequest();
  const first = client.$queryRawUnsafe();
  expect(client.$queryRawUnsafe()).toBe(first);
  expect(client.$queryRawUnsafe).toBe(client.$queryRawUnsafe);

  inRequest();
  expect(client.$queryRawUnsafe()).not.toBe(first);
});

test('a Hyperdrive binding replaces DATABASE_URL', () => {
  inRequest({ HYPERDRIVE: { connectionString: 'postgresql://pooled.example.com/db' } });
  (prisma.client as any).$queryRawUnsafe();

  expect(adapterUrls.at(-1)).toBe('postgresql://pooled.example.com/db');
});

test('a query outside a request context fails loudly', () => {
  expect(() => (prisma.client as any).$queryRawUnsafe).toThrow('No Cloudflare request context');
});

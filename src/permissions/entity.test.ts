import { beforeEach, expect, test, vi } from 'vitest';
import { getWebsite } from '@/queries/prisma';
import { canDeleteEntity, canUpdateEntity, canViewEntity } from './entity';

vi.mock('@/queries/prisma', () => ({
  getWebsite: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: { client: {} },
}));

const adminUser = { id: 'admin-1', username: 'admin', role: 'admin', isAdmin: true };
const normalUser = { id: 'user-1', username: 'user', role: 'user', isAdmin: false };

beforeEach(() => {
  vi.mocked(getWebsite).mockReset();
});

test.each([
  ['canViewEntity', canViewEntity],
  ['canUpdateEntity', canUpdateEntity],
  ['canDeleteEntity', canDeleteEntity],
])('%s requires the website owner or an admin', async (_name, check) => {
  await expect(check({}, 'w-1')).resolves.toBe(false);
  await expect(check({ shareToken: { websiteId: 'w-1' } }, 'w-1')).resolves.toBe(false);
  await expect(check({ user: adminUser }, 'w-1')).resolves.toBe(true);

  vi.mocked(getWebsite).mockResolvedValue({ userId: 'user-1' } as any);
  await expect(check({ user: normalUser }, 'w-1')).resolves.toBe(true);

  vi.mocked(getWebsite).mockResolvedValue({ userId: 'other' } as any);
  await expect(check({ user: normalUser }, 'w-1')).resolves.toBe(false);
});

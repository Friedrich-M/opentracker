import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getWebsite } from '@/queries/prisma';
import {
  canCreateWebsite,
  canDeleteWebsite,
  canUpdateWebsite,
  canViewAllWebsites,
  canViewBatchWebsites,
  canViewWebsite,
} from './website';

const { websiteFindManyMock } = vi.hoisted(() => ({
  websiteFindManyMock: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  getWebsite: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      website: {
        findMany: websiteFindManyMock,
      },
    },
  },
}));

vi.mock('@/lib/auth', async () => {
  const { ROLE_PERMISSIONS } = await import('@/lib/constants');

  return {
    hasPermission: (role: string, permission: string | string[]) =>
      (Array.isArray(permission) ? permission : [permission]).some(p =>
        ROLE_PERMISSIONS[role]?.includes(p),
      ),
  };
});

const adminUser = { id: 'admin-1', username: 'admin', role: 'admin', isAdmin: true };
const normalUser = { id: 'user-1', username: 'user', role: 'user', isAdmin: false };
const viewOnlyUser = { id: 'user-2', username: 'viewer', role: 'view-only', isAdmin: false };

beforeEach(() => {
  vi.mocked(getWebsite).mockReset();
  websiteFindManyMock.mockReset();
});

describe('canViewWebsite', () => {
  test('allows admins without any lookup', async () => {
    await expect(canViewWebsite({ user: adminUser }, 'w-1')).resolves.toBe(true);
    expect(getWebsite).not.toHaveBeenCalled();
  });

  test('allows a share token for the same website', async () => {
    const shareToken = { websiteId: 'w-1' };
    await expect(canViewWebsite({ shareToken }, 'w-1')).resolves.toBe(true);
    expect(getWebsite).not.toHaveBeenCalled();
  });

  test('denies a share token for another website', async () => {
    const shareToken = { websiteId: 'w-2', websiteIds: ['w-1'] } as any;
    await expect(canViewWebsite({ shareToken }, 'w-1')).resolves.toBe(false);
  });

  test('denies when there is no user', async () => {
    await expect(canViewWebsite({}, 'w-1')).resolves.toBe(false);
  });

  test('allows the owner', async () => {
    vi.mocked(getWebsite).mockResolvedValue({ userId: 'user-1' } as any);
    await expect(canViewWebsite({ user: normalUser }, 'w-1')).resolves.toBe(true);
  });

  test('denies a non-owner', async () => {
    vi.mocked(getWebsite).mockResolvedValue({ userId: 'other' } as any);
    await expect(canViewWebsite({ user: normalUser }, 'w-1')).resolves.toBe(false);
  });

  test('denies when the website is missing or unowned', async () => {
    vi.mocked(getWebsite).mockResolvedValue(null as any);
    await expect(canViewWebsite({ user: normalUser }, 'w-1')).resolves.toBe(false);

    vi.mocked(getWebsite).mockResolvedValue({ userId: null } as any);
    await expect(canViewWebsite({ user: normalUser }, 'w-1')).resolves.toBe(false);
  });
});

describe('canViewBatchWebsites', () => {
  test('returns an empty array for empty input', async () => {
    await expect(canViewBatchWebsites({ user: normalUser }, [])).resolves.toEqual([]);
  });

  test('returns all deduped ids for admins', async () => {
    await expect(canViewBatchWebsites({ user: adminUser }, ['a', 'b', 'a'])).resolves.toEqual([
      'a',
      'b',
    ]);
    expect(websiteFindManyMock).not.toHaveBeenCalled();
  });

  test('returns only the shared website when there is no user', async () => {
    await expect(
      canViewBatchWebsites({ shareToken: { websiteId: 'a' } }, ['a', 'b']),
    ).resolves.toEqual(['a']);
  });

  test('returns owned and shared ids for a user, in request order', async () => {
    websiteFindManyMock.mockResolvedValue([{ id: 'owned' }]);

    await expect(
      canViewBatchWebsites({ user: normalUser, shareToken: { websiteId: 'shared' } }, [
        'shared',
        'foreign',
        'owned',
      ]),
    ).resolves.toEqual(['shared', 'owned']);
    expect(websiteFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
  });
});

describe('canViewAllWebsites', () => {
  test('allows admins', async () => {
    await expect(canViewAllWebsites({ user: adminUser })).resolves.toBe(true);
  });

  test('denies non-admins and anonymous requests', async () => {
    await expect(canViewAllWebsites({ user: normalUser })).resolves.toBe(false);
    await expect(canViewAllWebsites({})).resolves.toBe(false);
  });
});

describe('canCreateWebsite', () => {
  test('denies when there is no user', async () => {
    await expect(canCreateWebsite({})).resolves.toBe(false);
  });

  test('allows admins', async () => {
    await expect(canCreateWebsite({ user: adminUser })).resolves.toBe(true);
  });

  test('allows a user role', async () => {
    await expect(canCreateWebsite({ user: normalUser })).resolves.toBe(true);
  });

  test('denies a view-only role', async () => {
    await expect(canCreateWebsite({ user: viewOnlyUser })).resolves.toBe(false);
  });
});

describe.each([
  ['canUpdateWebsite', canUpdateWebsite],
  ['canDeleteWebsite', canDeleteWebsite],
])('%s', (_name, check) => {
  test('denies when there is no user', async () => {
    await expect(check({}, 'w-1')).resolves.toBe(false);
  });

  test('allows admins', async () => {
    await expect(check({ user: adminUser }, 'w-1')).resolves.toBe(true);
  });

  test('allows the owner and denies everyone else', async () => {
    vi.mocked(getWebsite).mockResolvedValue({ userId: 'user-1' } as any);
    await expect(check({ user: normalUser }, 'w-1')).resolves.toBe(true);

    vi.mocked(getWebsite).mockResolvedValue({ userId: 'other' } as any);
    await expect(check({ user: normalUser }, 'w-1')).resolves.toBe(false);
  });

  test('ignores share tokens', async () => {
    await expect(check({ shareToken: { websiteId: 'w-1' } }, 'w-1')).resolves.toBe(false);
  });
});

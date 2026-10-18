import { expect, test, vi } from 'vitest';
import { ENTITY_TYPE } from '@/lib/constants';
import { canViewSharedWebsite, canViewSharedWebsiteFilters, canViewWebsiteSection } from './share';

vi.mock('./website', () => ({
  canViewWebsite: vi.fn(),
}));

test('canViewWebsiteSection respects section flags on website shares', async () => {
  await expect(
    canViewWebsiteSection(
      {
        shareToken: {
          shareType: ENTITY_TYPE.website,
          websiteId: 'website-1',
          parameters: {
            overview: true,
            goals: false,
          },
        },
      },
      'website-1',
      'goals',
    ),
  ).resolves.toBe(false);
});

test('canViewWebsiteSection allows any requested enabled section', async () => {
  await expect(
    canViewWebsiteSection(
      {
        shareToken: {
          shareType: ENTITY_TYPE.website,
          websiteId: 'website-1',
          parameters: {
            overview: true,
            compare: false,
          },
        },
      },
      'website-1',
      ['overview', 'compare'],
    ),
  ).resolves.toBe(true);
});

test('canViewSharedWebsiteFilters requires allowFilter for share tokens', async () => {
  await expect(
    canViewSharedWebsiteFilters(
      {
        shareToken: {
          shareType: ENTITY_TYPE.website,
          websiteId: 'website-1',
          parameters: {
            allowFilter: false,
          },
        },
      },
      'website-1',
    ),
  ).resolves.toBe(false);

  await expect(
    canViewSharedWebsiteFilters(
      {
        shareToken: {
          shareType: ENTITY_TYPE.website,
          websiteId: 'website-1',
          parameters: {
            allowFilter: true,
          },
        },
      },
      'website-1',
    ),
  ).resolves.toBe(true);
});

test('share tokens only grant their own website', async () => {
  const auth = {
    shareToken: {
      shareType: ENTITY_TYPE.website,
      websiteId: 'website-1',
      websiteIds: ['website-2'],
      parameters: {},
    },
  } as any;

  await expect(canViewSharedWebsite(auth, 'website-1')).resolves.toBe(true);
  await expect(canViewSharedWebsite(auth, 'website-2')).resolves.toBe(false);
  await expect(canViewWebsiteSection(auth, 'website-2', 'overview')).resolves.toBe(false);
});

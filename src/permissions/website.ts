import { hasPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/constants';
import prisma from '@/lib/prisma';
import type { Auth } from '@/lib/types';
import { getWebsite } from '@/queries/prisma';

// A website belongs to its owner (website.userId); admins may access every
// website and a share token grants read access to its own website.
async function isOwner(userId: string, websiteId: string) {
  const website = await getWebsite(websiteId);

  return !!website?.userId && website.userId === userId;
}

export async function canViewWebsite({ user, shareToken }: Auth, websiteId: string) {
  if (user?.isAdmin) {
    return true;
  }

  if (shareToken?.websiteId && shareToken.websiteId === websiteId) {
    return true;
  }

  if (!user) {
    return false;
  }

  return isOwner(user.id, websiteId);
}

export async function canViewBatchWebsites({ user, shareToken }: Auth, websiteIds: string[]) {
  if (!websiteIds.length) {
    return [];
  }

  const requestedIds = Array.from(new Set(websiteIds));

  if (user?.isAdmin) {
    return requestedIds;
  }

  if (!user) {
    return requestedIds.filter(id => !!shareToken?.websiteId && id === shareToken.websiteId);
  }

  const websites = await prisma.client.website.findMany({
    where: {
      id: {
        in: requestedIds,
      },
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  const ownedIds = new Set(websites.map(website => website.id));

  return requestedIds.filter(
    id => ownedIds.has(id) || (!!shareToken?.websiteId && id === shareToken.websiteId),
  );
}

export async function canViewAllWebsites({ user }: Auth) {
  return user?.isAdmin ?? false;
}

export async function canCreateWebsite({ user }: Auth) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  return hasPermission(user.role, PERMISSIONS.websiteCreate);
}

export async function canUpdateWebsite({ user }: Auth, websiteId: string) {
  if (!user) {
    return false;
  }

  return user.isAdmin || isOwner(user.id, websiteId);
}

export async function canDeleteWebsite({ user }: Auth, websiteId: string) {
  if (!user) {
    return false;
  }

  return user.isAdmin || isOwner(user.id, websiteId);
}

import debug from 'debug';
import {
  API_KEY_LAST_USED_INTERVAL,
  hashApiKey,
  isApiKey,
  isApiKeyBlockedPath,
} from '@/lib/api-key';
import {
  PARTIAL_AUTH_TOKEN_TYPE,
  ROLE_PERMISSIONS,
  ROLES,
  SHARE_CONTEXT_HEADER,
  SHARE_TOKEN_HEADER,
  SHARE_TOKEN_TYPE,
} from '@/lib/constants';
import { hash, secret } from '@/lib/crypto';
import { parseSecureToken, parseToken } from '@/lib/jwt';
import { ensureArray } from '@/lib/utils';
import { getApiKeyByHash, updateApiKeyLastUsed } from '@/queries/prisma/apiKey';
import { getShare } from '@/queries/prisma/share';
import { getUser } from '@/queries/prisma/user';
import { getWebsite } from '@/queries/prisma/website';

const log = debug('tracker:auth');

export function getBearerToken(request: Request) {
  const auth = request.headers.get('authorization');

  return auth?.split(' ')[1];
}

async function checkApiKeyAuth(request: Request, token: string) {
  const { pathname } = new URL(request.url);

  if (isApiKeyBlockedPath(pathname)) {
    log('API key not allowed for path', pathname);
    return null;
  }

  const apiKey = await getApiKeyByHash(hashApiKey(token));

  if (!apiKey) {
    log('API key not found');
    return null;
  }

  const user: any = await getUser(apiKey.userId);

  if (!user?.id) {
    log('API key user not found');
    return null;
  }

  const lastUsedAt = apiKey.lastUsedAt?.getTime() ?? 0;

  if (Date.now() - lastUsedAt > API_KEY_LAST_USED_INTERVAL) {
    updateApiKeyLastUsed(apiKey.id).catch(e => log(e));
  }

  delete user.password;
  user.isAdmin = user.role === ROLES.admin;

  return {
    token,
    user,
    authType: 'api-key' as const,
    apiKey: { id: apiKey.id, name: apiKey.name },
  };
}

export async function checkAuth(request: Request) {
  const token = getBearerToken(request);

  if (isApiKey(token)) {
    return checkApiKeyAuth(request, token);
  }

  const payload = parseSecureToken(token, secret());

  // The partial token issued after the password step of a 2FA login only proves
  // knowledge of the password. It must never be accepted as a session; it is
  // only valid for completing the challenge at /api/2fa/verify.
  if (payload?.type === PARTIAL_AUTH_TOKEN_TYPE) {
    log('Partial auth token rejected');
    return null;
  }

  let shareToken = await parseShareToken(request);

  let user = null;
  const { userId } = payload || {};

  if (userId) {
    user = await getUser(userId, { includePassword: true });

    // Every login token carries a fingerprint of the password it was issued
    // under (auth/login, 2fa/verify); reject tokens without one or from
    // before a password change.
    if (user && (!payload.pwd || hash(user.password) !== payload.pwd)) {
      user = null;
    }
  }

  // A signed-in user on a share page sends both tokens. Never combine them:
  // a user who owns the shared website (or an admin) keeps full access, and
  // anyone else sees exactly what the share link shows, with no network data.
  if (user && shareToken) {
    const website = await getWebsite(shareToken.websiteId);

    if (user.role === ROLES.admin || (!!website?.userId && website.userId === user.id)) {
      shareToken = null;
    } else {
      user = null;
    }
  }

  log({
    hasToken: !!token,
    hasPayload: !!payload,
    hasShareToken: !!shareToken,
    userId: user?.id,
  });

  if (!user?.id && !shareToken) {
    log('User not authorized');
    return null;
  }

  if (!user?.id && shareToken) {
    const shareContext = request.headers.get(SHARE_CONTEXT_HEADER);
    if (!shareContext) {
      log('Share token used outside share context');
      return null;
    }
  }

  if (user) {
    delete user.password;
    user.isAdmin = user.role === ROLES.admin;
  }

  return {
    token,
    shareToken,
    user,
    authType: user ? ('session' as const) : ('share' as const),
  };
}

export async function hasPermission(role: string, permission: string | string[]) {
  return ensureArray(permission).some(e => ROLE_PERMISSIONS[role]?.includes(e));
}

export async function parseShareToken(request: Request) {
  try {
    const token: any = parseToken(request.headers.get(SHARE_TOKEN_HEADER), secret());

    // Only accept tokens explicitly minted as share tokens. This prevents other
    // tokens signed with the same secret (e.g. the cache token from /api/send)
    // from being replayed as share tokens to gain analytics access.
    if (token?.type !== SHARE_TOKEN_TYPE) {
      return null;
    }

    // A deleted share stops working at once, and edited section settings
    // apply to tokens already issued: read both from the share itself.
    const share = token.shareId ? await getShare(token.shareId) : null;

    if (!share || share.entityId !== token.websiteId) {
      return null;
    }

    return { ...token, parameters: share.parameters };
  } catch (e) {
    log(e);
    return null;
  }
}

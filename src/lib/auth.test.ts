import { beforeEach, describe, expect, test, vi } from 'vitest';
import { hash } from '@/lib/crypto';
import { parseSecureToken, parseToken } from '@/lib/jwt';
import { getApiKeyByHash, updateApiKeyLastUsed } from '@/queries/prisma/apiKey';
import { getShare } from '@/queries/prisma/share';
import { getUser } from '@/queries/prisma/user';
import { getWebsite } from '@/queries/prisma/website';
import { hashApiKey } from './api-key';
import { checkAuth, parseShareToken } from './auth';

vi.mock('@/lib/jwt', () => ({
  parseSecureToken: vi.fn(),
  parseToken: vi.fn(() => null),
}));

vi.mock('@/queries/prisma/user', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/queries/prisma/share', () => ({
  getShare: vi.fn(),
}));

vi.mock('@/queries/prisma/website', () => ({
  getWebsite: vi.fn(),
}));

vi.mock('@/queries/prisma/apiKey', () => ({
  getApiKeyByHash: vi.fn(),
  updateApiKeyLastUsed: vi.fn(() => Promise.resolve()),
}));

const parseSecureTokenMock = vi.mocked(parseSecureToken);
const getUserMock = vi.mocked(getUser);
const getApiKeyByHashMock = vi.mocked(getApiKeyByHash);
const updateApiKeyLastUsedMock = vi.mocked(updateApiKeyLastUsed);

const PASSWORD_HASH = '$2b$10$currentpasswordhashvalue';

function authedRequest() {
  return new Request('http://localhost/api/test', {
    headers: { authorization: 'Bearer secure-token' },
  });
}

function mockUser() {
  getUserMock.mockResolvedValue({
    id: 'user-1',
    username: 'bob',
    role: 'user',
    password: PASSWORD_HASH,
  } as any);
}

beforeEach(() => {
  vi.unstubAllEnvs();
  parseSecureTokenMock.mockReset();
  getUserMock.mockReset();
  getApiKeyByHashMock.mockReset();
  updateApiKeyLastUsedMock.mockClear();
});

describe('checkAuth api keys', () => {
  const API_KEY = 'tracker_abcdefghijklmnopqrstuvwxyz012345';

  function apiKeyRequest(path = '/api/websites') {
    return new Request(`http://localhost${path}`, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
  }

  function mockApiKey(lastUsedAt: Date | null = null) {
    getApiKeyByHashMock.mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
      name: 'CI',
      keyHash: hashApiKey(API_KEY),
      keyPrefix: 'tracker_abcdefgh',
      lastUsedAt,
      createdAt: new Date(),
    } as any);
  }

  test('authorizes a valid api key and looks it up by hash', async () => {
    mockApiKey();
    mockUser();

    const result: any = await checkAuth(apiKeyRequest());

    expect(getApiKeyByHashMock).toHaveBeenCalledWith(hashApiKey(API_KEY));
    expect(result?.user?.id).toBe('user-1');
    expect(result?.user).not.toHaveProperty('password');
    expect(result?.apiKey).toEqual({ id: 'key-1', name: 'CI' });
    expect(parseSecureTokenMock).not.toHaveBeenCalled();
  });

  test('rejects an unknown api key', async () => {
    getApiKeyByHashMock.mockResolvedValue(null);

    const result = await checkAuth(apiKeyRequest());

    expect(result).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  test('rejects an api key whose user no longer exists', async () => {
    mockApiKey();
    getUserMock.mockResolvedValue(null as any);

    const result = await checkAuth(apiKeyRequest());

    expect(result).toBeNull();
  });

  test('rejects api keys on sensitive routes', async () => {
    mockApiKey();
    mockUser();

    for (const path of [
      '/api/me/password',
      '/api/me/api-keys',
      '/api/me/api-keys/key-1',
      '/api/2fa/status',
      '/api/auth/logout',
      '/api/users',
      '/api/admin/users',
    ]) {
      expect(await checkAuth(apiKeyRequest(path))).toBeNull();
    }

    expect(getApiKeyByHashMock).not.toHaveBeenCalled();
  });

  test('updates lastUsedAt when stale', async () => {
    mockApiKey(new Date(Date.now() - 60 * 60 * 1000));
    mockUser();

    await checkAuth(apiKeyRequest());

    expect(updateApiKeyLastUsedMock).toHaveBeenCalledWith('key-1');
  });

  test('does not update lastUsedAt when recently used', async () => {
    mockApiKey(new Date());
    mockUser();

    await checkAuth(apiKeyRequest());

    expect(updateApiKeyLastUsedMock).not.toHaveBeenCalled();
  });

  test('does not treat a jwt as an api key', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user?.id).toBe('user-1');
    expect(getApiKeyByHashMock).not.toHaveBeenCalled();
  });
});

describe('checkAuth 2FA partial token', () => {
  // GHSA-vj8c-fvjv-rpg2: the partial token issued after the password step of a
  // 2FA login must not be usable as a session on protected routes.
  test('rejects a partial-auth token on a protected route', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', type: 'partial-auth' } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  test('rejects a partial-auth token even when it carries a matching password fingerprint', async () => {
    parseSecureTokenMock.mockReturnValue({
      userId: 'user-1',
      type: 'partial-auth',
      pwd: hash(PASSWORD_HASH),
    } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result).toBeNull();
  });
});

describe('checkAuth password fingerprint', () => {
  test('authorizes a stateless token whose fingerprint matches the current password', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user?.id).toBe('user-1');
  });

  test('rejects a stateless token whose fingerprint predates a password change', async () => {
    // Token minted against the old password must stop working once the password changes.
    parseSecureTokenMock.mockReturnValue({
      userId: 'user-1',
      pwd: hash('old-password-hash'),
    } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result).toBeNull();
  });

  test('rejects a stateless token without a password fingerprint', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1' } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result).toBeNull();
  });

  test('does not expose the password hash on the returned user', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user).not.toHaveProperty('password');
  });
});

describe('parseShareToken', () => {
  const request = () =>
    new Request('http://localhost/api/websites/w-1/stats', {
      headers: { 'x-tracker-share-token': 'token' },
    });
  const token = {
    type: 'share',
    shareId: 'share-1',
    websiteId: 'w-1',
    parameters: { overview: true },
  };

  test("returns the token with the share's current parameters", async () => {
    vi.mocked(parseToken).mockReturnValueOnce(token as any);
    vi.mocked(getShare).mockResolvedValueOnce({
      id: 'share-1',
      entityId: 'w-1',
      parameters: { overview: true, sessions: false },
    } as any);

    await expect(parseShareToken(request())).resolves.toMatchObject({
      websiteId: 'w-1',
      parameters: { overview: true, sessions: false },
    });
  });

  test('rejects a token whose share was deleted', async () => {
    vi.mocked(parseToken).mockReturnValueOnce(token as any);
    vi.mocked(getShare).mockResolvedValueOnce(null);

    await expect(parseShareToken(request())).resolves.toBeNull();
  });

  test('rejects a token for a different website than its share', async () => {
    vi.mocked(parseToken).mockReturnValueOnce(token as any);
    vi.mocked(getShare).mockResolvedValueOnce({ id: 'share-1', entityId: 'w-2' } as any);

    await expect(parseShareToken(request())).resolves.toBeNull();
  });
});

describe('checkAuth with a session and a share token', () => {
  // A signed-in user on a share page sends both. The share must not lend its
  // website to the account, nor the account its network access to the share.
  const request = () =>
    new Request('http://localhost/api/websites/w-1/sessions', {
      headers: {
        authorization: 'Bearer secure-token',
        'x-tracker-share-token': 'token',
        'x-tracker-share-context': '1',
      },
    });

  beforeEach(() => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) } as any);
    mockUser();
    vi.mocked(parseToken).mockReturnValue({
      type: 'share',
      shareId: 'share-1',
      websiteId: 'w-1',
    } as any);
    vi.mocked(getShare).mockResolvedValue({
      id: 'share-1',
      entityId: 'w-1',
      parameters: {},
    } as any);
  });

  test("another account's user sees only the share", async () => {
    vi.mocked(getWebsite).mockResolvedValueOnce({ id: 'w-1', userId: 'user-2' } as any);

    const result: any = await checkAuth(request());

    expect(result.user).toBeNull();
    expect(result.shareToken).toMatchObject({ websiteId: 'w-1' });
  });

  test('the owner keeps full access without the share', async () => {
    vi.mocked(getWebsite).mockResolvedValueOnce({ id: 'w-1', userId: 'user-1' } as any);

    const result: any = await checkAuth(request());

    expect(result.user?.id).toBe('user-1');
    expect(result.shareToken).toBeNull();
  });
});

import { LOGIN_TOKEN_TTL, PARTIAL_AUTH_TOKEN_TYPE, ROLES } from '@/lib/constants';
import { hash, secret } from '@/lib/crypto';
import { getIpAddress, getTrustedIpHeader } from '@/lib/ip';
import { createSecureToken } from '@/lib/jwt';
import { clearLoginFailures, loginRetryAfter, recordLoginFailure } from '@/lib/login-limit';
import { checkPassword } from '@/lib/password';
import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { json, serviceUnavailable, tooManyRequests, unauthorized } from '@/lib/response';
import { getTwoFactorConfigurationError, isTwoFactorConfigured } from '@/lib/two-factor/crypto';
import { getUserByUsername } from '@/queries/prisma';
import { loginRequestSchema } from './schema';

export async function POST(request: Request) {
  const { body, error } = await parseRequest(request, loginRequestSchema, { skipAuth: true });

  if (error) {
    return error();
  }

  const { username, password } = body;
  // Without a trusted proxy header the address is the client's choice, so the
  // limit falls back to counting per username (src/lib/login-limit.ts).
  const ip = getTrustedIpHeader() ? getIpAddress(request.headers) : undefined;
  const retryAfter = loginRetryAfter(ip, username);

  if (retryAfter) {
    return tooManyRequests(retryAfter, { code: 'too-many-login-attempts' });
  }

  const user = await getUserByUsername(username, { includePassword: true });

  if (!user || !checkPassword(password, user.password)) {
    recordLoginFailure(ip, username);
    return unauthorized({ code: 'incorrect-username-password' });
  }

  clearLoginFailures(ip, username);

  const { id, role, createdAt } = user;
  // Check if 2FA is enabled for this user
  const twoFactor = await prisma.client.twoFactorAuth.findUnique({ where: { userId: id } });

  if (twoFactor?.isEnabled) {
    if (!isTwoFactorConfigured()) {
      return serviceUnavailable(getTwoFactorConfigurationError());
    }

    const partialToken = createSecureToken(
      { userId: id, type: PARTIAL_AUTH_TOKEN_TYPE },
      secret(),
      {
        expiresIn: '5m',
      },
    );
    return json({ requiresTwoFactor: true, partialToken });
  }
  // Bind token to password hash so a password change invalidates old tokens.
  const pwd = hash(user.password);

  const token = createSecureToken({ userId: user.id, role, pwd }, secret(), {
    expiresIn: LOGIN_TOKEN_TTL,
  });

  return json({
    token,
    user: { id, username, role, createdAt, isAdmin: role === ROLES.admin },
  });
}

import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/response', () => ({
  ok: () => new Response(null, { status: 200 }),
}));

const parseRequestMock = vi.mocked(parseRequest);

beforeEach(() => {
  parseRequestMock.mockReset();
});

test('POST succeeds for an authenticated request', async () => {
  parseRequestMock.mockResolvedValue({ auth: { user: { id: 'user-1' } }, error: undefined } as any);

  const response = await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }));

  expect(response.status).toBe(200);
});

test('POST returns the auth error when the request is not authenticated', async () => {
  parseRequestMock.mockResolvedValue({
    auth: null,
    error: () => new Response(null, { status: 401 }),
  } as any);

  const response = await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }));

  expect(response.status).toBe(401);
});

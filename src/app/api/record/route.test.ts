import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getLocation } from '@/lib/detect';
import { parseToken } from '@/lib/jwt';
import { parseRequest } from '@/lib/request';
import { getWebsite } from '@/queries/prisma';
import { saveRecording } from '@/queries/sql';
import { OPTIONS, POST } from './route';

vi.mock('@/lib/detect', () => ({
  getLocation: vi.fn(),
  hasBlockedIp: vi.fn(),
}));

vi.mock('@/lib/jwt', () => ({
  parseToken: vi.fn(),
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  getWebsite: vi.fn(),
}));

vi.mock('@/queries/sql', () => ({
  saveRecording: vi.fn(),
}));

vi.mock('@/queries/sql/heatmap/saveHeatmapEvents', () => ({
  saveHeatmapEvents: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('record route CORS', () => {
  test('handles preflight requests', async () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('x-tracker-cache');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  test('includes CORS headers on post responses', async () => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'record',
        payload: {
          website: '11111111-1111-4111-8111-111111111111',
          events: [],
        },
      },
      error: undefined,
    });

    const response = await POST(
      new Request('http://localhost/api/record', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('replay countries', () => {
  const record = () =>
    POST(
      new Request('http://localhost/api/record', {
        method: 'POST',
        headers: { 'x-tracker-cache': 'token', 'user-agent': 'Mozilla/5.0 Chrome/130' },
      }),
    );

  beforeEach(() => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'record',
        payload: {
          website: '11111111-1111-4111-8111-111111111111',
          events: [{ type: 3, timestamp: 1781553116151 }],
        },
      },
      error: undefined,
    });
    vi.mocked(parseToken).mockResolvedValue({
      sessionId: '22222222-2222-4222-8222-222222222222',
      visitId: '33333333-3333-4333-8333-333333333333',
    });
    vi.mocked(getWebsite).mockResolvedValue({
      recorderEnabled: true,
      replayConfig: { replayEnabled: true },
    } as any);
  });

  test.each(['US', 'CN', 'HK', 'SG'])('records a visitor from %s', async country => {
    vi.mocked(getLocation).mockResolvedValue({ country, region: '', city: '' });

    expect(await (await record()).json()).toEqual({ ok: true });
    expect(saveRecording).toHaveBeenCalledOnce();
  });

  test('stores the page tag with the chunk', async () => {
    vi.mocked(getLocation).mockResolvedValue({ country: 'US', region: '', city: '' });
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'record',
        payload: {
          website: '11111111-1111-4111-8111-111111111111',
          tag: 'hobbies',
          events: [{ type: 3, timestamp: 1781553116151 }],
        },
      },
      error: undefined,
    });

    await record();
    expect(saveRecording).toHaveBeenCalledWith(expect.objectContaining({ tag: 'hobbies' }));
  });

  test('drops a replay from another country', async () => {
    vi.mocked(getLocation).mockResolvedValue({ country: 'DE', region: '', city: '' });

    expect(await (await record()).json()).toEqual({ ok: false, reason: 'replay_country' });
    expect(saveRecording).not.toHaveBeenCalled();
  });

  test('drops a replay with an unknown country', async () => {
    vi.mocked(getLocation).mockResolvedValue(undefined);

    expect((await (await record()).json()).reason).toBe('replay_country');
    expect(saveRecording).not.toHaveBeenCalled();
  });
});

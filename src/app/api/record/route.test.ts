import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getLocation } from '@/lib/detect';
import { parseToken } from '@/lib/jwt';
import { parseRequest } from '@/lib/request';
import { getWebsite } from '@/queries/prisma';
import { countReplayChunks, saveRecording } from '@/queries/sql';
import { saveHeatmapEvents } from '@/queries/sql/heatmap/saveHeatmapEvents';
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
  countReplayChunks: vi.fn(),
  saveRecording: vi.fn(),
}));

vi.mock('@/queries/sql/heatmap/saveHeatmapEvents', () => ({
  saveHeatmapEvents: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.mocked(countReplayChunks).mockResolvedValue(0);
});

const WEBSITE = '11111111-1111-4111-8111-111111111111';
const cacheToken = (overrides: Record<string, any> = {}) => ({
  type: 'cache',
  websiteId: WEBSITE,
  sessionId: '22222222-2222-4222-8222-222222222222',
  visitId: '33333333-3333-4333-8333-333333333333',
  ...overrides,
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
    vi.mocked(parseToken).mockResolvedValue(cacheToken());
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

describe('replay tokens and limits', () => {
  const record = (headers: Record<string, string> = {}) =>
    POST(
      new Request('http://localhost/api/record', {
        method: 'POST',
        headers: { 'x-tracker-cache': 'token', 'user-agent': 'Mozilla/5.0 Chrome/130', ...headers },
      }),
    );

  beforeEach(() => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'record',
        payload: { website: WEBSITE, events: [{ type: 3, timestamp: 1781553116151 }] },
      },
      error: undefined,
    });
    vi.mocked(getWebsite).mockResolvedValue({
      recorderEnabled: true,
      replayConfig: { replayEnabled: true },
    } as any);
    vi.mocked(getLocation).mockResolvedValue({ country: 'US', region: '', city: '' });
  });

  test.each([
    ['another website', { websiteId: '44444444-4444-4444-8444-444444444444' }],
    ['another kind of token', { type: 'share' }],
    ['no type', { type: undefined }],
  ])('refuses a token for %s', async (_, overrides) => {
    vi.mocked(parseToken).mockResolvedValue(cacheToken(overrides));

    expect((await record()).status).toBe(400);
    expect(saveRecording).not.toHaveBeenCalled();
  });

  test('stops storing chunks for a visit at its cap', async () => {
    vi.mocked(parseToken).mockResolvedValue(cacheToken());
    vi.stubEnv('REPLAY_MAX_CHUNKS_PER_VISIT', '3');
    vi.mocked(countReplayChunks).mockResolvedValue(3);

    expect(await (await record()).json()).toEqual({ ok: false, reason: 'replay_limit' });
    expect(saveRecording).not.toHaveBeenCalled();
  });

  test('records every country when REPLAY_COUNTRIES is *', async () => {
    vi.mocked(parseToken).mockResolvedValue(cacheToken());
    vi.stubEnv('REPLAY_COUNTRIES', '*');
    vi.mocked(getLocation).mockResolvedValue({ country: 'DE', region: '', city: '' });

    expect(await (await record()).json()).toEqual({ ok: true });
  });

  test('a local address is recorded in production only behind a trusted IP header', async () => {
    vi.mocked(parseToken).mockResolvedValue(cacheToken());
    vi.mocked(getLocation).mockResolvedValue(null);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('CLIENT_IP_HEADER', '');

    expect((await (await record()).json()).reason).toBe('replay_country');

    vi.stubEnv('CLIENT_IP_HEADER', 'x-real-ip');
    expect(await (await record({ 'x-real-ip': '127.0.0.1' })).json()).toEqual({ ok: true });
    // A request that bypassed the proxy carries no trusted address at all.
    expect((await (await record()).json()).reason).toBe('replay_country');
  });
});

describe('heatmap page paths', () => {
  test.each([
    ['//evil.example/login', '/evil.example/login'],
    ['/\\evil.example/x', '/evil.example/x'],
    ['https://example.com//x?y=1', '/x'],
    ['/docs/a?b=1#c', '/docs/a'],
    ['javascript:alert(1)', '/alert(1)'],
  ])('stores %s as %s', async (url, expected) => {
    vi.mocked(parseToken).mockResolvedValue(cacheToken());
    vi.mocked(getWebsite).mockResolvedValue({
      recorderEnabled: true,
      replayConfig: { heatmapEnabled: true },
    } as any);
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'heatmap',
        payload: { website: WEBSITE, events: [{ type: 'click', x: 1, y: 2, url }] },
      },
      error: undefined,
    });

    await POST(
      new Request('http://localhost/api/record', {
        method: 'POST',
        headers: { 'x-tracker-cache': 'token', 'user-agent': 'Mozilla/5.0 Chrome/130' },
      }),
    );

    expect(saveHeatmapEvents).toHaveBeenCalledWith([
      expect.objectContaining({ urlPath: expected }),
    ]);
  });
});

describe('gzipped bodies', () => {
  const gzip = (text: string) =>
    new Response(
      (new Response(text).body as ReadableStream).pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer();
  const post = (body: BodyInit, headers: Record<string, string> = {}) =>
    POST(new Request('http://localhost/api/record', { method: 'POST', body, headers }));

  beforeEach(() => {
    parseRequestMock.mockResolvedValue({
      body: { type: 'record', payload: { website: WEBSITE, events: [] } },
      error: undefined,
    });
  });

  test('inflates a gzipped body before parsing it', async () => {
    const text = JSON.stringify({ type: 'record', payload: { website: WEBSITE, events: [] } });

    await post(await gzip(text), { 'content-encoding': 'gzip' });

    const parsed = parseRequestMock.mock.calls[0][0] as Request;
    expect(await parsed.text()).toBe(text);
    expect(parsed.headers.get('content-encoding')).toBeNull();
  });

  test('reads a body a proxy already inflated as it is', async () => {
    await post('{"type":"record"}', { 'content-encoding': 'gzip' });

    expect(await (parseRequestMock.mock.calls[0][0] as Request).text()).toBe('{"type":"record"}');
  });

  test('refuses a body that inflates past the cap', async () => {
    const response = await post(await gzip(' '.repeat(1_000_001)), { 'content-encoding': 'gzip' });

    expect(response.status).toBe(413);
    expect(parseRequestMock).not.toHaveBeenCalled();
  });

  test('refuses a corrupt gzip body', async () => {
    const response = await post(new Uint8Array([0x1f, 0x8b, 1, 2, 3]), {
      'content-encoding': 'gzip',
    });

    expect(response.status).toBe(400);
    expect(parseRequestMock).not.toHaveBeenCalled();
  });
});

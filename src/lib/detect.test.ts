import { beforeEach, expect, test, vi } from 'vitest';
import { getClientInfo, getLocation, getNetwork, hasBlockedIp } from './detect';
import { getIpAddress } from './ip';

const IP = '127.0.0.1';

const isLocalhost = vi.mocked(await import('is-localhost-ip'));

vi.mock('is-localhost-ip', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();

  delete process.env.IGNORE_IP;
});

test('getIpAddress: x-forwarded-for uses the leftmost IP in the chain', () => {
  expect(getIpAddress(new Headers({ 'x-forwarded-for': `${IP}, 10.0.0.1, 10.0.0.2` }))).toEqual(IP);
});

test('getIpAddress: CloudFlare header', () => {
  expect(getIpAddress(new Headers({ 'cf-connecting-ip': IP }))).toEqual(IP);
});

test('getIpAddress: Standard header', () => {
  expect(getIpAddress(new Headers({ 'x-forwarded-for': IP }))).toEqual(IP);
});

test('getIpAddress: No header', () => {
  expect(getIpAddress(new Headers())).toEqual(undefined);
});

// With CLIENT_IP_HEADER set, only the location headers of the platform that
// sets that IP header are read; the others could come from the client.
test('getLocation: honours only the trusted platform location headers', async () => {
  isLocalhost.default.mockResolvedValue(false);
  const headers = new Headers({
    'cf-ipcountry': 'DE',
    'cf-ipcity': 'Berlin',
    'x-vercel-ip-country': 'US',
    'x-vercel-ip-country-region': 'CA',
    'x-vercel-ip-city': 'Los Angeles',
  });

  vi.stubEnv('CLIENT_IP_HEADER', 'x-forwarded-for');
  await expect(getLocation('8.8.8.8', headers, false)).resolves.toEqual({
    country: 'US',
    region: 'US-CA',
    city: 'Los Angeles',
  });

  vi.stubEnv('CLIENT_IP_HEADER', 'cf-connecting-ip');
  await expect(getLocation('8.8.8.8', headers, false)).resolves.toEqual({
    country: 'DE',
    region: undefined,
    city: 'Berlin',
  });
  vi.unstubAllEnvs();
});

// Without a trusted IP header a client could send cf-ipcountry itself, so no
// provider's location header is believed.
test('getLocation: ignores location headers without a trusted IP header', async () => {
  isLocalhost.default.mockResolvedValue(false);
  vi.stubEnv('CLIENT_IP_HEADER', '');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('GEOLITE_DB_PATH', '/nonexistent/GeoLite2-City.mmdb');
  const headers = new Headers({ 'cf-ipcountry': 'US', 'cf-ipcity': 'Los Angeles' });

  delete globalThis['maxmind'];

  // No trusted header: the client's cf-ipcountry is ignored, and without the
  // GeoLite database the visit has no location instead of failing.
  await expect(getLocation('8.8.8.8', headers, false)).resolves.toBeUndefined();
  vi.unstubAllEnvs();
});

test('getLocation: returns null for malformed ip', async () => {
  await expect(
    getLocation(
      'not-an-ip',
      new Headers({
        'cf-ipcountry': 'US',
        'cf-region-code': 'CA',
        'cf-ipcity': 'Los Angeles',
      }),
      false,
    ),
  ).resolves.toEqual(null);
});

test('getLocation: treats localhost check errors as non-local', async () => {
  isLocalhost.default.mockRejectedValue(new Error('DNS Lookup failed.'));
  // Location headers count only behind the platform's trusted IP header.
  vi.stubEnv('CLIENT_IP_HEADER', 'cf-connecting-ip');

  await expect(
    getLocation(
      '8.8.8.8',
      new Headers({
        'cf-ipcountry': 'US',
        'cf-region-code': 'CA',
        'cf-ipcity': 'Los Angeles',
      }),
      false,
    ),
  ).resolves.toEqual({
    country: 'US',
    region: 'US-CA',
    city: 'Los Angeles',
  });
  vi.unstubAllEnvs();
});

test('hasBlockedIp: returns false for malformed client ip with cidr block', () => {
  process.env.IGNORE_IP = '10.0.0.0/8';

  expect(hasBlockedIp('not-an-ip')).toBe(false);
});

test('getNetwork: returns null for local and malformed ips', async () => {
  isLocalhost.default.mockResolvedValue(true as never);
  await expect(getNetwork('127.0.0.1')).resolves.toBeNull();

  await expect(getNetwork('not-an-ip')).resolves.toBeNull();
  await expect(getNetwork('')).resolves.toBeNull();
});

test('getNetwork: returns null when the ASN database is missing', async () => {
  const previous = process.env.GEOLITE_ASN_DB_PATH;
  process.env.GEOLITE_ASN_DB_PATH = '/nonexistent/GeoLite2-ASN.mmdb';
  delete globalThis['maxmind-asn'];
  isLocalhost.default.mockResolvedValue(false as never);

  await expect(getNetwork('192.0.2.10')).resolves.toBeNull();

  delete globalThis['maxmind-asn'];
  if (previous === undefined) {
    delete process.env.GEOLITE_ASN_DB_PATH;
  } else {
    process.env.GEOLITE_ASN_DB_PATH = previous;
  }
});

// Synthetic user agents exercise the device classes used by analytics filters.
test.each([
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    '390x844',
    'mobile',
  ],
  [
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    '1024x768',
    'tablet',
  ],
  [
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    '412x915',
    'mobile',
  ],
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    '2560x1440',
    'desktop',
  ],
  [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    '1440x900',
    'laptop',
  ],
  ['', '', 'desktop'],
])('getClientInfo: classifies device for %s', async (userAgent, screen, device) => {
  isLocalhost.default.mockResolvedValue(true);
  const result = await getClientInfo(
    new Request('http://localhost/api/send', { headers: { 'user-agent': userAgent } }),
    { ip: '127.0.0.1', screen },
  );
  expect(result.device).toBe(device);
});

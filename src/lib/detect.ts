import path from 'node:path';
import { browserName, detectOS } from 'detect-browser';
import ipaddr from 'ipaddr.js';
import isLocalhost from 'is-localhost-ip';
import maxmind from 'maxmind';
import UAParser from 'ua-parser-js';
import { getIpAddress, getTrustedIpHeader, stripPort } from '@/lib/ip';
import { safeDecodeURIComponent } from '@/lib/url';

const MAXMIND = 'maxmind';
const MAXMIND_ASN = 'maxmind-asn';

// Location headers set by hosting platforms. `ipHeaders` are the headers the
// same platform sets for the client address: when CLIENT_IP_HEADER names one
// of them, only that platform's location headers are read, since any other
// platform's headers could then come from the client.
const PROVIDER_HEADERS = [
  // Cloudflare headers
  {
    ipHeaders: ['cf-connecting-ip', 'true-client-ip'],
    countryHeader: 'cf-ipcountry',
    regionHeader: 'cf-region-code',
    cityHeader: 'cf-ipcity',
  },
  // Vercel headers
  {
    ipHeaders: ['x-forwarded-for', 'x-real-ip', 'x-vercel-forwarded-for'],
    countryHeader: 'x-vercel-ip-country',
    regionHeader: 'x-vercel-ip-country-region',
    cityHeader: 'x-vercel-ip-city',
  },
  // CloudFront headers
  {
    ipHeaders: ['cloudfront-viewer-address'],
    countryHeader: 'cloudfront-viewer-country',
    regionHeader: 'cloudfront-viewer-country-region',
    cityHeader: 'cloudfront-viewer-city',
  },
  // EdgeOne headers (requires custom request headers in Rule Priorities, see: https://edgeone.ai/document/46151)
  {
    ipHeaders: ['eo-connecting-ip'],
    countryHeader: 'eo-ipcountry',
    regionHeader: 'eo-region-code',
    cityHeader: 'eo-ipcity',
  },
];

function getDevice(userAgent: string, screen: string = '') {
  const { device } = UAParser(userAgent);

  const [width] = screen.split('x');

  const type = device?.type || 'desktop';

  if (type === 'desktop' && screen && +width <= 1920) {
    return 'laptop';
  }

  return type;
}

function getRegionCode(country: string, region: string) {
  if (!country || !region) {
    return undefined;
  }

  return region.includes('-') ? region : `${country}-${region}`;
}

function decodeHeader(s: string | undefined | null): string | undefined | null {
  if (s === undefined || s === null) {
    return s;
  }

  return Buffer.from(s, 'latin1').toString('utf-8');
}

async function isLocalIp(ip: string) {
  try {
    return await isLocalhost(ip);
  } catch {
    return false;
  }
}

export async function getLocation(ip: string = '', headers: Headers, skipHeaders: boolean) {
  const cleanIp = stripPort(ip);

  // Ignore local or invalid ips
  if (!cleanIp || !ipaddr.isValid(cleanIp) || (await isLocalIp(cleanIp))) {
    return null;
  }

  // A provider's location headers are believed only when its IP header is the
  // trusted one: without CLIENT_IP_HEADER a client could send cf-ipcountry
  // itself, so the location comes from the GeoLite database instead.
  const trusted = getTrustedIpHeader();

  if (!skipHeaders && trusted) {
    for (const provider of PROVIDER_HEADERS) {
      if (!provider.ipHeaders.includes(trusted)) {
        continue;
      }

      const countryHeader = headers.get(provider.countryHeader);
      if (countryHeader) {
        const country = decodeHeader(countryHeader);
        const region = decodeHeader(headers.get(provider.regionHeader));
        const city = decodeHeader(headers.get(provider.cityHeader));

        return {
          country,
          region: getRegionCode(country, region),
          city,
        };
      }
    }
  }

  // Database lookup. Without the database (SKIP_BUILD_GEO) the visit is
  // still collected, with no location, rather than failing the request.
  if (!globalThis[MAXMIND]) {
    const dir = path.join(process.cwd(), 'geo');

    try {
      globalThis[MAXMIND] = await maxmind.open(
        process.env.GEOLITE_DB_PATH || path.resolve(dir, 'GeoLite2-City.mmdb'),
      );
    } catch {
      return undefined;
    }
  }

  const result = globalThis[MAXMIND]?.get(cleanIp);

  if (result) {
    const country = result.country?.iso_code ?? result?.registered_country?.iso_code;
    const region = result.subdivisions?.[0]?.iso_code;
    const city = result.city?.names?.en;

    return {
      country,
      region: getRegionCode(country, region),
      city,
    };
  }
}

// Approximate coordinates of an IP from GeoLite2-City, for the visitor map:
// the city's centre and MaxMind's accuracy radius in kilometres. Null when the
// database is missing or knows no location for the address.
export async function getCoordinates(ip: string = '') {
  const cleanIp = stripPort(ip);

  if (!cleanIp || !ipaddr.isValid(cleanIp) || (await isLocalIp(cleanIp))) {
    return null;
  }

  if (!globalThis[MAXMIND]) {
    try {
      globalThis[MAXMIND] = await maxmind.open(
        process.env.GEOLITE_DB_PATH || path.resolve(process.cwd(), 'geo', 'GeoLite2-City.mmdb'),
      );
    } catch {
      return null;
    }
  }

  const location = globalThis[MAXMIND]?.get(cleanIp)?.location;

  if (typeof location?.latitude !== 'number' || typeof location?.longitude !== 'number') {
    return null;
  }

  return {
    latitude: location.latitude as number,
    longitude: location.longitude as number,
    accuracyRadius: (location.accuracy_radius as number | undefined) ?? null,
  };
}

// The autonomous system announcing the IP: its number and organisation name,
// which identifies the ISP or the institution (e.g. "EXAMPLE-UNIVERSITY"). Hosting
// headers carry no such field, so this always reads GeoLite2-ASN; without the
// database file it returns null and the session simply has no network.
export async function getNetwork(ip: string = '') {
  const cleanIp = stripPort(ip);

  if (!cleanIp || !ipaddr.isValid(cleanIp) || (await isLocalIp(cleanIp))) {
    return null;
  }

  if (globalThis[MAXMIND_ASN] === undefined) {
    const file =
      process.env.GEOLITE_ASN_DB_PATH || path.resolve(process.cwd(), 'geo', 'GeoLite2-ASN.mmdb');

    try {
      globalThis[MAXMIND_ASN] = await maxmind.open(file);
    } catch {
      globalThis[MAXMIND_ASN] = null;
    }
  }

  const result = globalThis[MAXMIND_ASN]?.get(cleanIp);

  if (!result) {
    return null;
  }

  return {
    asn: result.autonomous_system_number ?? null,
    org: result.autonomous_system_organization ?? null,
  };
}

export async function getClientInfo(request: Request, payload: Record<string, any>) {
  const userAgent = payload?.userAgent || request.headers.get('user-agent');
  const ip = payload?.ip || getIpAddress(request.headers);
  const location = await getLocation(ip, request.headers, !!payload?.ip);
  const country = safeDecodeURIComponent(location?.country);
  const region = safeDecodeURIComponent(location?.region);
  const city = safeDecodeURIComponent(location?.city);
  const browser = payload?.browser ?? browserName(userAgent);
  const os = payload?.os ?? (detectOS(userAgent) as string);
  const device = payload?.device ?? getDevice(userAgent, payload?.screen);
  const network = await getNetwork(ip);

  return {
    userAgent,
    browser,
    os,
    ip,
    country,
    region,
    city,
    device,
    asn: network?.asn ?? null,
    org: network?.org ?? null,
  };
}

export function hasBlockedIp(clientIp: string) {
  const ignoreIps = process.env.IGNORE_IP;

  if (!clientIp || !ignoreIps) {
    return false;
  }

  const ips = ignoreIps.split(',').map(n => n.trim());

  return ips.some(ip => {
    if (ip === clientIp) {
      return true;
    }

    // CIDR notation
    if (ip.indexOf('/') > 0) {
      try {
        const addr = ipaddr.parse(clientIp);
        const range = ipaddr.parseCIDR(ip);

        if (addr.kind() === range[0].kind() && addr.match(range)) {
          return true;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    return false;
  });
}

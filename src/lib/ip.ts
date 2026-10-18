import ipaddr from 'ipaddr.js';

const IP_ADDRESS_HEADERS = [
  'true-client-ip', // CDN
  'cf-connecting-ip', // Cloudflare
  'fastly-client-ip', // Fastly
  'x-nf-client-connection-ip', // Netlify
  'do-connecting-ip', // Digital Ocean
  'x-real-ip', // Reverse proxy
  'x-appengine-user-ip', // Google App Engine
  'x-forwarded-for',
  'forwarded',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-forwarded',
];

function normalizeIp(ip?: string | null) {
  if (!ip) return ip;

  try {
    const parsed = ipaddr.parse(ip);

    if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
      return (parsed as ipaddr.IPv6).toIPv4Address().toString();
    }

    return parsed.toString();
  } catch {
    // Fallback: return original if parsing fails
    return ip;
  }
}

function resolveIp(ip?: string | null) {
  if (!ip) return ip;

  // First, try as-is
  const normalized = normalizeIp(ip);
  try {
    ipaddr.parse(normalized);
    return normalized;
  } catch {
    // try stripping port (handles IPv4:port; leaves IPv6 intact)
    const stripped = stripPort(ip);
    if (stripped !== ip) {
      const normalizedStripped = normalizeIp(stripped);
      try {
        ipaddr.parse(normalizedStripped);
        return normalizedStripped;
      } catch {
        return normalizedStripped;
      }
    }

    return normalized;
  }
}

function parseHeaderValue(header: string, value: string) {
  if (header === 'x-forwarded-for') {
    return resolveIp(value?.split(',')?.[0]?.trim());
  }

  if (header === 'forwarded') {
    const match = value.match(/for=(\[?[0-9a-fA-F:.]+]?)/);

    return match ? resolveIp(match[1]) : undefined;
  }

  return resolveIp(value);
}

/**
 * The one proxy header the operator trusts for the visitor's address
 * (CLIENT_IP_HEADER, docs/deployment.md), lower-cased; undefined when unset.
 * Without it every header below is read, which is only safe behind a proxy
 * that strips the ones it does not set itself.
 */
export function getTrustedIpHeader() {
  return process.env.CLIENT_IP_HEADER?.trim().toLowerCase() || undefined;
}

export function getIpAddress(headers: Headers) {
  const trusted = getTrustedIpHeader();

  if (trusted) {
    const value = headers.get(trusted);

    return value ? parseHeaderValue(trusted, value) : undefined;
  }

  const header = IP_ADDRESS_HEADERS.find(name => headers.get(name));
  if (!header) {
    return undefined;
  }

  return parseHeaderValue(header, headers.get(header));
}

export function stripPort(ip?: string | null) {
  if (!ip) {
    return ip;
  }

  if (ip.startsWith('[')) {
    const endBracket = ip.indexOf(']');
    if (endBracket !== -1) {
      return ip.slice(0, endBracket + 1);
    }
  }

  const idx = ip.lastIndexOf(':');
  if (idx !== -1) {
    if (ip.includes('.') || /^[a-zA-Z0-9.-]+$/.test(ip.slice(0, idx))) {
      return ip.slice(0, idx);
    }
  }

  return ip;
}

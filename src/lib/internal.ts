import { timingSafeEqual } from 'node:crypto';
import ipaddr from 'ipaddr.js';

const LOCAL_NAMES = new Set(['localhost', '0.0.0.0']);
const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal'];
const LOCAL_RANGES = new Set(['loopback', 'private', 'linkLocal', 'uniqueLocal', 'unspecified']);

/**
 * True for pages served from the owner's machine or network: localhost,
 * *.local names and loopback/private/link-local addresses, with or without a
 * port. Such visits are local previews of the site, not readers.
 */
export function isLocalHostname(hostname?: string | null) {
  if (!hostname) {
    return false;
  }

  let host = hostname.trim().toLowerCase();

  if (host.startsWith('[')) {
    host = host.slice(1, host.indexOf(']'));
  } else if (host.split(':').length === 2) {
    host = host.split(':')[0];
  }

  if (LOCAL_NAMES.has(host) || LOCAL_SUFFIXES.some(suffix => host.endsWith(suffix))) {
    return true;
  }

  if (!ipaddr.isValid(host)) {
    return false;
  }

  const addr = ipaddr.process(host);

  return LOCAL_RANGES.has(addr.range());
}

/**
 * True when `mark` equals the server's OWNER_MARK secret. The owner sets it in
 * a browser once with `?tracker=<OWNER_MARK>`; the tracker script then sends it
 * as `owner` with every event. Without OWNER_MARK no browser can be marked.
 */
export function isOwnerMark(mark?: string | null) {
  const secret = process.env.OWNER_MARK;

  if (!secret || !mark) {
    return false;
  }

  const a = Buffer.from(String(mark));
  const b = Buffer.from(secret);

  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * A visit is internal when it comes from the owner's marked browser or from a
 * local preview. Internal visits are stored and hidden by default.
 */
export function isInternalVisit(payload: { owner?: string | null; hostname?: string | null }) {
  return isOwnerMark(payload.owner) || isLocalHostname(payload.hostname);
}

/** Cookie that carries the owner mark from the dashboard to the tracked site. */
const OWNER_COOKIE = 'tracker_me';

/**
 * The domain the owner cookie is set on: OWNER_COOKIE_DOMAIN, else the parent
 * of the dashboard's host (stats.example.com → example.com), so pages on
 * the tracked site can read it. Null for localhost, bare IPs and two-label
 * hosts, which have no shared parent to set it on.
 */
export function getOwnerCookieDomain(host?: string | null) {
  if (process.env.OWNER_COOKIE_DOMAIN) {
    return process.env.OWNER_COOKIE_DOMAIN;
  }

  const name = host?.split(':')[0]?.toLowerCase();

  if (!name || isLocalHostname(name) || ipaddr.isValid(name)) {
    return null;
  }

  const labels = name.split('.');

  return labels.length >= 3 ? labels.slice(1).join('.') : null;
}

/**
 * Set-Cookie value that marks the signed-in owner's device: every browser
 * where the owner opens the dashboard gets the mark on the tracked site's
 * domain, and the tracker script copies it into that browser's storage
 * (src/tracker/index.ts). It is readable by script by design; the mark only
 * hides visits, it grants no access.
 */
export function getOwnerMarkCookie(host?: string | null) {
  const mark = process.env.OWNER_MARK;
  const domain = getOwnerCookieDomain(host);

  if (!mark || !domain) {
    return null;
  }

  return `${OWNER_COOKIE}=${encodeURIComponent(mark)}; Domain=${domain}; Path=/; Max-Age=34560000; Secure; SameSite=Lax`;
}

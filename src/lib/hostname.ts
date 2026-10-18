import { reverse } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

const LOOKUP_TIMEOUT_MS = 1500;

/**
 * The IP's reverse-DNS name (StatCounter's "Host Name"), e.g.
 * `ool-18e477b7.dyn.optonline.net`, or null when there is none or the lookup
 * is slow. Owner-only, like the IP itself.
 */
export async function getHostName(ip?: string | null) {
  if (!ip || !ipaddr.isValid(ip)) {
    return null;
  }

  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS));
  const lookup = reverse(ip)
    .then(names => names[0] ?? null)
    .catch(() => null);

  return Promise.race([lookup, timeout]);
}

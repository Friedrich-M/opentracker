/**
 * Session fields that identify a visitor's network, or are derived from it
 * (sessions from the same IP, the owner's label for that IP); owner-only.
 */
const NETWORK_FIELDS = ['ip', 'asn', 'org', 'ipSessions', 'ipViews', 'label'] as const;

/**
 * Removes the visitor's IP, ASN and organisation from a session row. Routes
 * that a share token can reach call this when the request has no logged-in
 * user, so share links never expose network data (AGENTS.md, Rules).
 */
export function withoutNetwork<T extends Record<string, any>>(row: T): T {
  if (!row) {
    return row;
  }

  const copy: Record<string, any> = { ...row };

  for (const field of NETWORK_FIELDS) {
    delete copy[field];
  }

  return copy as T;
}

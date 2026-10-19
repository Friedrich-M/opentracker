/**
 * Failed sign-ins, counted in this process's memory: after too many from one
 * address (for one username, or overall), or for one username from anywhere,
 * further attempts are refused until the window passes. The address counts
 * only when it comes from the trusted proxy header (CLIENT_IP_HEADER): any
 * other header is the client's to choose, so the caller passes none and only
 * the looser per-username limit applies. It slows password guessing against one instance; it is
 * not shared between serverless instances or restarts, so a reverse-proxy or
 * firewall limit remains the real defence (docs/deployment.md). Two-factor
 * codes have their own limit, kept in the database.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 10;
const MAX_PER_ADDRESS = 50;
const MAX_PER_USERNAME = 100;
const MAX_KEYS = 10_000;

const failures = new Map<string, { count: number; resetAt: number }>();

function keys(ip: string | undefined, username: string): [string, number][] {
  const name = username.toLowerCase();
  const byName: [string, number] = [`user ${name}`, MAX_PER_USERNAME];

  if (!ip) {
    return [byName];
  }

  return [[`${ip} ${name}`, MAX_PER_ACCOUNT], [`ip ${ip}`, MAX_PER_ADDRESS], byName];
}

function current(key: string, now: number) {
  const entry = failures.get(key);

  if (entry && entry.resetAt <= now) {
    failures.delete(key);
    return undefined;
  }

  return entry;
}

/** Seconds until another attempt is allowed, or 0 when one is allowed now. */
export function loginRetryAfter(ip: string | undefined, username: string, now = Date.now()) {
  for (const [key, max] of keys(ip, username)) {
    const entry = current(key, now);

    if (entry && entry.count >= max) {
      return Math.ceil((entry.resetAt - now) / 1000);
    }
  }

  return 0;
}

export function recordLoginFailure(ip: string | undefined, username: string, now = Date.now()) {
  if (failures.size >= MAX_KEYS) {
    for (const [key, entry] of failures) {
      if (entry.resetAt <= now) {
        failures.delete(key);
      }
    }
  }

  for (const [key] of keys(ip, username)) {
    const entry = current(key, now);

    if (entry) {
      entry.count += 1;
    } else if (failures.size < MAX_KEYS) {
      failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
    }
  }
}

// A successful sign-in clears its own address's count for that username only;
// the per-username count keeps running so a correct guess elsewhere cannot
// reset an attacker's budget.
export function clearLoginFailures(ip: string | undefined, username: string) {
  if (ip) {
    failures.delete(keys(ip, username)[0][0]);
  }
}

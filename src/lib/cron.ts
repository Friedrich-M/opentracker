import { timingSafeEqual } from 'node:crypto';

const DEFAULT_RETENTION_DAYS = 14;

/** True when the request carries `Authorization: Bearer <CRON_SECRET>`. */
export function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');

  if (!secret || !header) {
    return false;
  }

  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);

  return a.length === b.length && timingSafeEqual(a, b);
}

export function getRetentionDays() {
  const days = Number(process.env.REPLAY_RETENTION_DAYS);

  return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
}

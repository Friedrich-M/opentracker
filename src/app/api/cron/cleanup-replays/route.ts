import { getRetentionDays, isCronRequest } from '@/lib/cron';
import { json, unauthorized } from '@/lib/response';
import { deleteExpiredReplays } from '@/queries/prisma';

// Daily Vercel cron (vercel.json): replays are the bulk of the database, so
// unsaved ones are kept for REPLAY_RETENTION_DAYS (14 by default). Vercel
// sends CRON_SECRET as a bearer token; nothing else may trigger it.
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return unauthorized();
  }

  const days = getRetentionDays();
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const deleted = await deleteExpiredReplays(before);

  console.log(`cleanup-replays: deleted ${deleted} chunks older than ${days} days`);

  return json({ deleted, before: before.toISOString() });
}

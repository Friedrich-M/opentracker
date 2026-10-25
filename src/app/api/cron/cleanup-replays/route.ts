import { getHeatmapRetentionDays, getRetentionDays, isCronRequest } from '@/lib/cron';
import { json, unauthorized } from '@/lib/response';
import { deleteExpiredHeatmapEvents, deleteExpiredReplays } from '@/queries/prisma';

const DAY_MS = 24 * 60 * 60 * 1000;

// Daily cron (vercel.json on Vercel, the cron trigger in wrangler.jsonc on
// Cloudflare, a systemd timer on a server): replays are the bulk of the
// database, so unsaved ones are kept for REPLAY_RETENTION_DAYS (14 by
// default); heatmap events for HEATMAP_RETENTION_DAYS when it is set. Each
// sends CRON_SECRET as a bearer token; nothing else may trigger it.
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return unauthorized();
  }

  const days = getRetentionDays();
  const before = new Date(Date.now() - days * DAY_MS);
  const deleted = await deleteExpiredReplays(before);

  console.log(`cleanup-replays: deleted ${deleted} chunks older than ${days} days`);

  const heatmapDays = getHeatmapRetentionDays();
  let heatmapDeleted = 0;

  if (heatmapDays) {
    heatmapDeleted = await deleteExpiredHeatmapEvents(new Date(Date.now() - heatmapDays * DAY_MS));
    console.log(
      `cleanup-replays: deleted ${heatmapDeleted} heatmap events older than ${heatmapDays} days`,
    );
  }

  return json({ deleted, heatmapDeleted, before: before.toISOString() });
}

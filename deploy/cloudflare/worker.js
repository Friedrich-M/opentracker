// Cloudflare Worker entry (wrangler.jsonc `main`): the OpenNext worker for
// requests, plus the daily replay cleanup that vercel.json's cron runs on
// Vercel. The cron calls the route in-process with CRON_SECRET, as Vercel does.
import openNext from '../../.open-next/worker.js';

export default {
  fetch: openNext.fetch,

  async scheduled(_controller, env, ctx) {
    const request = new Request('https://worker.internal/api/cron/cleanup-replays', {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });

    // A 401 means CRON_SECRET is missing or differs; log it rather than
    // failing silently every day.
    ctx.waitUntil(
      openNext.fetch(request, env, ctx).then(response => {
        if (!response.ok) {
          console.error(`cleanup-replays cron: HTTP ${response.status}`);
        }
      }),
    );
  },
};

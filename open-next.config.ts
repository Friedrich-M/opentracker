import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// No incremental cache: every page is dynamic. scripts/build/cloudflare.js
// prepares the Prisma client and scripts before this Next build runs.
export default {
  ...defineCloudflareConfig({}),
  buildCommand: 'npx next build --turbo',
};

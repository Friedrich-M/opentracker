/* eslint-disable no-console */
/**
 * Throwaway PostgreSQL for local development and screenshots, no system
 * install: `pnpm db:local`. Data lives in .local-db/ (git-ignored) and the
 * server runs in UTC like Neon, so date-range queries behave as in production.
 * Stop with Ctrl-C; delete .local-db/ to start from an empty database.
 */
import fs from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const port = Number(process.env.LOCAL_DB_PORT || 55432);
const dataDir = path.resolve(process.cwd(), '.local-db');
const fresh = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'tracker',
  password: 'tracker',
  port,
  persistent: true,
  postgresFlags: ['-c', 'timezone=UTC'],
});

if (fresh) {
  await pg.initialise();
}

await pg.start();

if (fresh) {
  await pg.createDatabase('tracker');
}

console.log(
  `PostgreSQL ready. Use:\n  DATABASE_URL=postgresql://tracker:tracker@localhost:${port}/tracker`,
);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);

/* eslint-disable no-console */
// The Cloudflare Worker build (`pnpm build:cloudflare` runs it last, after the
// database check, tracker, recorder and OpenAPI steps). The Worker needs a
// Prisma client generated for workerd: the Node client compiles its query
// engine from bytes at run time, which Workers forbid. The workerd client is
// generated from a copy of the schema, the OpenNext build bundles it, and the
// Node client is restored afterwards so dev and tests keep working.
import { execSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const SCHEMA = 'prisma/schema.prisma';
const WORKERD_SCHEMA = 'prisma/schema.workerd.prisma';
const GENERATOR_LINE = 'engineType = "client"';

const run = (command, env = {}) =>
  execSync(command, { stdio: 'inherit', env: { ...process.env, ...env } });

const schema = readFileSync(SCHEMA, 'utf8');

if (!schema.includes(GENERATOR_LINE)) {
  console.error(`${SCHEMA}: generator line "${GENERATOR_LINE}" not found.`);
  process.exit(1);
}

writeFileSync(
  WORKERD_SCHEMA,
  schema.replace(GENERATOR_LINE, `${GENERATOR_LINE}\n  runtime    = "workerd"`),
);

try {
  run(`npx prisma generate --schema ${WORKERD_SCHEMA}`);
  run('npx opennextjs-cloudflare build', {
    OPENTRACKER_TARGET: 'cloudflare',
    NODE_ENV: 'production',
  });
} finally {
  rmSync(WORKERD_SCHEMA, { force: true });
  run('npx prisma generate');
}

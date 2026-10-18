#!/usr/bin/env node
// A narrow repository guard, not a comprehensive secret or personal-data scanner.
// Never print matching content: reports contain only paths and categories.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--staged')) {
  console.error('Usage: node scripts/checks/repository.mjs [--staged]');
  process.exit(2);
}
const staged = args.includes('--staged');
const git = (...args) => {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Git command failed: ${args[0]}`);
  return result.stdout;
};
const root = git('rev-parse', '--show-toplevel').trim();
process.chdir(root);
const paths = [
  ...new Set(
    git('ls-files', '-z', '--cached', ...(staged ? [] : ['--others', '--exclude-standard']))
      .split('\0')
      .filter(Boolean),
  ),
];
const ignored = spawnSync('git', ['check-ignore', '--no-index', '-z', '--stdin'], {
  input: `${paths.join('\0')}\0`,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (ignored.status !== 0 && ignored.status !== 1) throw new Error('Cannot check ignore rules');
const ignoredPaths = new Set(ignored.stdout.split('\0').filter(Boolean));
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  [
    'provider token',
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|sk_live_[A-Za-z0-9]{20,})\b/,
  ],
  [
    'remote database credentials',
    /postgres(?:ql)?:\/\/[^\s"'`:@]+:[^\s"'`@]+@(?!(?:localhost|127\.0\.0\.1|\[::1\])(?=[:/\s]))[^\s"'`]+/,
  ],
];
const privatePath =
  /(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.mcp(?:\.local)?\.json|\.vercel|\.wrangler|\.local(?:-db)?|\.auth)(?:\/|$)|^(?:private|secrets|backups|dumps|exports|artifacts|screenshots|replays)\/|\.(?:csv|har|dump|backup|pem|key|p12|pfx|sqlite3?|db)(?:$|-)|(?:storage-state|storageState).*\.json$/;
const templates = new Set(['.env.example', '.mcp.example.json']);
let checked = 0;
const failures = [];
for (const path of paths) {
  if (!staged && !existsSync(resolve(root, path))) continue;
  if (ignoredPaths.has(path) || (!templates.has(path) && privatePath.test(path))) {
    failures.push([path, 'private/generated path in source selection']);
    continue;
  }
  const bytes = staged
    ? spawnSync('git', ['show', `:${path}`], { maxBuffer: 32 * 1024 * 1024 })
    : { status: 0, stdout: readFileSync(path) };
  if (bytes.status !== 0) throw new Error(`Cannot read selected file: ${path}`);
  checked++;
  if (bytes.stdout.includes(0)) continue;
  const content = bytes.stdout.toString('utf8');
  for (const [label, pattern] of patterns) {
    if (pattern.test(content)) failures.push([path, label]);
  }
}
for (const [path, label] of failures) console.error(`${path}: ${label}`);
console.log(
  `Checked ${checked} ${staged ? 'index' : 'working-tree'} files; ${failures.length} findings. No secret values printed.`,
);
process.exitCode = failures.length ? 1 : 0;

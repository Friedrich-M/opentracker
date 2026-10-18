import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const guard = fileURLToPath(new URL('./repository.mjs', import.meta.url));

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'opentracker-guard-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  const write = (name, content) => {
    const path = join(cwd, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  };
  const check = (...args) =>
    spawnSync(process.execPath, [guard, ...args], { cwd, encoding: 'utf8' });
  git('init', '--quiet');
  write('.gitignore', '.env\n*.sql\n!prisma/migrations/**/*.sql\n');
  git('add', '.gitignore');
  return { git, write, check };
}

test('keeps local configuration out while accepting public templates and migrations', t => {
  const { git, write, check } = fixture(t);
  write('.env', 'APP_SECRET=local-only');
  write('.env.example', 'APP_SECRET=');
  write('prisma/migrations/01_init/migration.sql', 'SELECT 1;');
  git('add', '.env.example', 'prisma/migrations/01_init/migration.sql');
  assert.equal(check().status, 0);
  assert.equal(check('--staged').status, 0);
});

test('rejects a force-added private file without printing its contents', t => {
  const { git, write, check } = fixture(t);
  const secret = 'private-fixture-value';
  write('.env', `APP_SECRET=${secret}`);
  git('add', '--force', '.env');
  const result = check('--staged');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.env: private/);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(secret));
});

test('checks staged content even after the working file is redacted', t => {
  const { git, write, check } = fixture(t);
  const secret = `gh${'p_'}${'a'.repeat(36)}`;
  write('config.txt', secret);
  git('add', 'config.txt');
  write('config.txt', 'redacted');
  assert.equal(check().status, 0);
  const result = check('--staged');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /provider token/);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(secret));
});

test('rejects credentials for a remote database but accepts disposable localhost credentials', t => {
  const { write, check } = fixture(t);
  write('config.txt', 'postgresql://demo:demo@localhost:5432/demo');
  assert.equal(check().status, 0);
  const secret = ['postgresql://', 'demo:private-fixture', '@db.example.com/demo'].join('');
  write('config.txt', secret);
  const result = check();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /remote database credentials/);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(secret));
});

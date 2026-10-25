#!/bin/sh
# Production deploy to Cloudflare Workers from the committed tree:
# `sh scripts/deploy/cloudflare.sh` (or `pnpm deploy:cloudflare`). It needs
# Node, git, tar and a Wrangler login (`npx wrangler login`) for the account
# that owns the Worker. Unlike Vercel, the build runs here: `git archive HEAD`
# (never local .env files, which OpenNext would embed in the Worker) is built
# in a temporary folder, then `wrangler deploy` uploads it with wrangler.jsonc.
# The build applies migrations, so DATABASE_URL must be set in this shell;
# NEXT_PUBLIC_* settings are read at build time too. Run-time secrets are
# set once with `npx wrangler secret put NAME`.
set -eu

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit or stash your changes first: only committed code is deployed." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL: the build applies migrations to it." >&2
  exit 1
fi

node scripts/checks/repository.mjs --staged

PNPM="npx --yes pnpm@12.3.4"

dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
git archive HEAD | tar -x -C "$dir"
cd "$dir"
$PNPM install --frozen-lockfile
$PNPM build:cloudflare
npx wrangler deploy

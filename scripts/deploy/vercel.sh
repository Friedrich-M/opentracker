#!/bin/sh
# Production deploy from the committed tree: `sh scripts/deploy/vercel.sh`
# (or `pnpm deploy:vercel` in a copy with node_modules). It needs Node, git,
# tar and the Vercel CLI; no app dependency installation is required.
# Uploads `git archive HEAD` (never local .env files or build output) to the
# Vercel project this folder is linked to (.vercel/project.json, from
# `vercel link`). The build runs migrations against the configured PostgreSQL database.
# Once the Vercel GitHub integration is connected, a push to main deploys too.
set -eu

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit or stash your changes first: only committed code is deployed." >&2
  exit 1
fi

if [ ! -f .vercel/project.json ]; then
  echo "Not linked to Vercel. Run: vercel link" >&2
  exit 1
fi

node scripts/checks/repository.mjs --staged

# The Vercel CLI from PATH or node_modules/.bin, else a one-off npx copy.
if command -v vercel >/dev/null 2>&1; then
  VERCEL=vercel
else
  VERCEL="npx --yes vercel"
fi

dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
git archive HEAD | tar -x -C "$dir"
mkdir -p "$dir/.vercel"
cp .vercel/project.json "$dir/.vercel/"
(cd "$dir" && $VERCEL deploy --prod --yes)

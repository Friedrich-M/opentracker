---
name: opentracker-deploy
description: Deploy a requested OpenTracker instance, verify application and storage health, or roll back its application release using the operator's own hosting accounts.
---

# Deploying OpenTracker

Read `AGENTS.md`, `docs/deployment.md` and `docs/repository-data.md` first. Deployment changes a live service; perform it only when explicitly requested. Do not assume the maintainer's accounts, domain, project or database.

## Prepare

1. Identify the intended instance and provider from the request and its local ignored configuration. Ask for the target only if it is still ambiguous. Private operational notes, if needed, live under `.local/`; never copy their contents into shared documentation or tool output.
2. Run repository, type, test, unused-code and lint checks outside cloud-synced directories. Try new migrations on a disposable PostgreSQL database.
3. Ensure the intended changes are committed before using the archive-based deploy script. Commit/push only if the request authorizes those actions.
4. Confirm the CLI account and local `.vercel/project.json` select the target. If authentication is missing, have the operator sign in; never start an unattended browser-auth flow.
5. Review the database backup and migration plan. Builds apply migrations; an application rollback cannot undo them.

## Deploy and verify

For Vercel, `sh scripts/deploy/vercel.sh` uploads `git archive HEAD` and the ignored local project link. It does not upload local environment files. For Cloudflare Workers, `sh scripts/deploy/cloudflare.sh` builds `git archive HEAD` in a temporary folder (DATABASE_URL in the shell; the build applies migrations) and runs `wrangler deploy` with the current Wrangler login; confirm that account first. For other hosts, follow their approved build/release procedure from `docs/deployment.md`. Do not assume a push automatically deploys.

Check the instance's `/api/heartbeat`, `/script.js` and `/recorder.js`. A heartbeat does not test the database: verify a controlled visit reaches storage, or use a read-only count through the operator's approved database connection. Restrict inspection to what the task needs. Never print connection strings, tokens, visitor rows or replay content. Redact logs before reporting. Dashboard verification uses operator authentication; never ask for a password in chat. Use synthetic data for public screenshots.

The optional replay Worker deploys separately from `workers/replay-store/`. Configure its bearer secret and the app's matching secret through provider secret tools; names and required variables are in `README.md`. Do not capture secret values in checked-in scripts, screenshots or shell tracing.

## Rollback

Use the provider's deployment list to identify the last known-good release for the requested project, then its rollback command if authorized. Verify collection again. Restore/migrate the database only as a separately reviewed operation; rollback of application files leaves schema changes in place.

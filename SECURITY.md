# Security

Please do not publish credentials, visitor data, replay recordings, session cookies or a live exploit in an issue or pull request.

Use the repository's **Security → Report a vulnerability** option when it is available. If private reporting is not enabled, open a minimal issue asking for a private reporting channel, without vulnerability details or sensitive attachments. There is no published response-time guarantee.

A useful private report describes the affected version, prerequisites, impact and reproduction using a disposable instance and synthetic data.

If credentials have been committed, revoke or rotate them with the provider first. Removing a file or adding it to `.gitignore` does not remove it from Git history, forks, caches or existing clones. Coordinate any history rewrite with the repository owner; never force-push a cleanup unilaterally.

Operators are responsible for their deployment's credentials, access, backups, collection settings and data retention. See [deployment](docs/deployment.md) and [repository data policy](docs/repository-data.md).

## Supported code

Security fixes target the current `main` branch. Older commits and upstream Umami releases are not maintained by this project. Include the exact commit in a report; the inherited package version is not a promise of a separately supported OpenTracker release.

## Dependency review

CI checks production dependencies with `pnpm audit --prod --audit-level high`. Run `pnpm audit` as well when reviewing development-tool updates; a production-only pass does not cover the build and test toolchain.

As of 2026-10-18, the development-only `knip → fast-glob → micromatch → braces` chain has an [upstream denial-of-service advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) with no published patched version. It is not a production dependency. The finding remains visible in the full audit; do not suppress it or treat a clean production audit as a clean full audit. Recheck it when updating Knip or its dependency chain.

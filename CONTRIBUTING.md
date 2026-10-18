# Contributing to OpenTracker

Start with [README.md](README.md) for a local setup and [AGENTS.md](AGENTS.md) for project constraints. See [development](docs/development.md) for checks and troubleshooting. Use a disposable PostgreSQL database with the synthetic seed data; do not copy production data into a development checkout.

## Changes and checks

Keep changes focused and explain the problem, resulting behavior and checks in your pull request. Retain upstream copyright and license notices.

```sh
node scripts/checks/repository.mjs
pnpm verify
pnpm check:quality
```

`verify` runs the repository guard, generates Prisma/OpenAPI artifacts, checks types and runs tests. Use `DATABASE_URL=postgresql://x:x@localhost/x` for generation and unit checks when no database connection is needed. Schema changes require a new numbered migration tested against the disposable database; never edit an applied one.

UI changes need a browser check in both themes, both languages and at phone width. Put captures under ignored `artifacts/`. Describe synthetic examples as such. API changes need permission checks, tests and current OpenAPI contracts. See [test conventions](src/test/README.md).

## Before sharing

Review `git diff` and the exact staged diff. Run `node scripts/checks/repository.mjs --staged` before a commit. The check flags ignored tracked files, common private-data paths and a limited set of secret patterns without printing their values; it is not a comprehensive secret or personal-data scanner.

Use reserved example domains and synthetic identifiers in documentation and tests. Never attach live analytics exports, visitor IPs, session recordings, login cookies, tokens, database dumps or unredacted screenshots. An ignored file can still be force-added, so review remains necessary. Details are in [the repository data policy](docs/repository-data.md).

Security reports follow [SECURITY.md](SECURITY.md); do not open a public issue containing exploit credentials or visitor data.

## Working together

Use the issue forms for reproducible bugs and feature proposals. Keep discussions respectful, explain tradeoffs, and do not include personal or operational data. Maintainers may remove abusive or privacy-invasive content.

Use the pull-request template to describe the problem, behavior and verification. Keep changes focused, preserve license notices and update the affected docs. Write Markdown paragraphs and list items on single source lines; do not hard-wrap prose. `CHANGELOG.md` is local and ignored.

CI must pass before a change is ready for review. Passing checks does not replace a review of permissions, migrations or UI behavior. Review timing is best effort; there is no guaranteed response window.

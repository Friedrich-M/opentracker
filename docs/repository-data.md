# Repository data policy

The public repository contains source code, migrations, lockfiles, shared agent instructions and synthetic fixtures. Operational data belongs outside Git, even when the repository is currently private.

## What stays local

| Content                                                              | Location or handling                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Credentials and connection strings                                   | Provider settings, secret manager, ignored `.env*` or `.dev.vars*`   |
| Local MCP connections                                                | Ignored `.mcp.json`; copy the reviewed `.mcp.example.json` if needed |
| Account/project IDs, instance domains, website IDs, deployment notes | Ignored `.local/`                                                    |
| Maintainer changelog                                                 | Ignored root `CHANGELOG.md`; contribution summaries belong in PRs    |
| PostgreSQL data and backups                                          | `.local-db/`, `backups/`, `dumps/`; never migration folders          |
| Visitor exports, replay chunks and logs                              | `exports/`, `replays/`, `artifacts/`; never test fixtures            |
| Dashboard screenshots and browser traces                             | `artifacts/`, `screenshots/`, `test-results/`                        |
| Browser authentication state                                         | `playwright/.auth/`, `.auth/`; never a fixture                       |
| Hosting-provider state                                               | `.vercel/`, `.wrangler/`                                             |

`.env.example` is an explicitly allowed root template containing only blank secrets and disposable localhost credentials. `.mcp.example.json` contains a public OAuth endpoint, without account credentials. Review templates as carefully as source files. SQL files are ignored except the migrations under `prisma/migrations/`. Do not blanket-ignore JSON or images: source contracts and product assets must remain versioned. Add a narrowly scoped exception only for a reviewed, synthetic fixture or source file.

## Review before a commit

Run `node scripts/checks/repository.mjs` for the working tree and `node scripts/checks/repository.mjs --staged` for the exact index. The script also flags tracked files matching ignore rules, since `.gitignore` does not untrack them. It reports paths and categories, never matching secret values. Its content patterns are limited to private keys, selected token formats and remote database URLs containing credentials. They cannot identify every visitor record, arbitrary API secret or personal detail.

Use `git rm --cached -- <path>` to stop tracking a local file while keeping its working copy. A deletion must be committed before it changes the remote tree. Never force-add operational files to bypass the check.

Before turning a private repository public, review **all Git history and refs**, release attachments, issues, CI logs and screenshots. Use a dedicated secret scanner in addition to manual review. A clean current tree or a passing check does not establish that historical data is safe to publish. Rotate leaked credentials before coordinating any history cleanup. Changing visibility, rewriting history and force-pushing require the owner's explicit request; preparing the source for open source does not perform those actions.

## Local operational notes

Maintainer-specific notes may be kept under `.local/private-notes/`, including original deployment instructions. They are not part of a contributor's setup and are excluded from source archives. Do not copy them into prompts, public docs, issue comments or pull-request descriptions. Read them only for an explicitly requested operation on that instance, and never print credentials.

Use `example.com`, `example.org`, documentation IP ranges and fabricated IDs for examples. Real network addresses may be needed for a local geolocation check; document that distinction and never reuse visitor data as a fixture.

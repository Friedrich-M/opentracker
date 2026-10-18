# Working on OpenTracker

OpenTracker is a self-hosted analytics application derived from Umami. Keep it usable without the maintainer’s website, cloud accounts or operational data.

## Before changing anything

- Inspect `git status` and preserve unrelated work. This is an independent Git repository, even when nested inside another checkout.
- Read the relevant reference below before editing. Inspect source and package scripts for current structure, versions and commands; do not duplicate that inventory in this guide.
- Install, test and preview outside cloud-synced folders. The local-preview skill describes a source-only scratch copy.
- Do not commit, push, deploy, change visibility or rewrite history unless requested. Preparing source for publication does not itself publish it.
- Keep `CHANGELOG.md` local and ignored. Describe a contribution in its PR and update the affected documentation instead.

## Protect data

- Keep credentials, visitor data, account/project IDs and deployment notes out of source, prompts, screenshots and tool output.
- Use ignored `.local/` for operational notes; never copy it into previews or source archives.
- Only reviewed root `.env.example` and `.mcp.example.json` templates are shared. Do not force-add populated configuration or generated artifacts.
- Use synthetic fixtures and reserved example domains. Production analytics are not test data.
- Run the repository guard for the working tree and its `--staged` mode for the exact index before committing. Passing it does not establish that Git history or every secret is safe.
- Keep the deployment workflow based on the committed tree. Do not upload a working directory that may contain ignored files.

## Product and access contracts

- PostgreSQL is the only database. Replay chunk bodies may use Cloudflare R2 behind the replay-store Worker (owner, 2026-10-16).
- Websites are the ownership boundary: a website owner or admin can access it; a share token reads only its website.
- Visitor network data is for authenticated users only. Share-reachable routes must remove it with `withoutNetwork` and must not search on it.
- Collection payload overrides for IP, user agent, browser, OS and device are trusted only for authenticated senders.
- Preserve token expiry and password-fingerprint validation; a share token must be checked against its current share record on every request.
- Replay collection is limited to the US, mainland China, Hong Kong and Singapore, with the existing local-development exception (owner, 2026-10-16). Heatmaps are not restricted by this rule.
- Keep per-page tags attached to replay chunks so project views never expose another project’s pages from the same visit.
- The product name is OpenTracker. Existing `tracker` browser APIs, script attributes, cookies/storage keys, headers and query parameters are integration contracts; renaming the product does not rename those contracts.

## Implementation decisions

- Never edit an applied migration. Add a new migration and check it against a disposable database before deployment.
- A production build applies migrations; an application rollback does not roll back the database.
- Do not edit generated assets. Inspect their generating package scripts and source files instead.
- API changes need permission tests and current OpenAPI contracts. Do not weaken tests or access checks to make a build pass.
- Dashboard styling extends the existing opencode-derived theme. Keep the vendored stylesheet intact and make scoped adaptations in the app stylesheet.
- Write Chinese UI text naturally for 你 and keep established product terms consistent. Verify changed text in context, not just in a translation file.
- Add tests for meaningful behavior changes, particularly permissions, collection and storage. Avoid tests that merely repeat implementation details.
- Preserve upstream license headers and the font OFL notice. Review dependency licenses when updating or replacing packages.
- Keep device parsing on the MIT-licensed UAParser 1.x line unless a deliberate licensing decision accompanies an upgrade.

## Verification

- Run the checks documented in `docs/development.md`; the CI workflow is the executable source for its gates.
- A unit-test pass does not verify SQL migrations, a production build, browser layout or production storage.
- Verify UI changes in both themes, both languages and at phone width using synthetic data.
- For query or schema changes, verify against a disposable PostgreSQL database; never sample production rows to populate fixtures.
- Store temporary captures under ignored `artifacts/`. Only deliberately reviewed, synthetic product screenshots belong in `docs/images/`.
- Report what was run, what passed and what remains unverified. Do not call a local check a completed GitHub Actions run.

## Documentation

- Keep this guide around 100 lines and focused on decisions, constraints and non-obvious pitfalls. Move procedural detail to `docs/`.
- Do not record file inventories, dependency versions, endpoint lists or counts that can be obtained by scanning the repository.
- Keep each Markdown paragraph and list item on one source line; do not insert hard wraps. Preserve structural line breaks in code, tables and lists (owner, 2026-10-18).
- Edit `AGENTS.md`; `CLAUDE.md` is a shim. Keep the generated Next.js block below intact.
- Update docs when behavior changes. Do not add status claims, badges, support guarantees or deployment claims without evidence.
- Public docs describe reusable setup. Instance-specific instructions belong in ignored local notes.

## References

| Need                                     | Reference                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Contributor setup, checks and debugging  | `docs/development.md`; `CONTRIBUTING.md`                                                 |
| Data flow and permission boundaries      | `docs/architecture.md`                                                                   |
| Styling and UI verification              | `docs/design.md`                                                                         |
| Website installation and collection      | `docs/site-integration.md`                                                               |
| Server deployment, upgrades and rollback | `docs/deployment.md`                                                                     |
| Private data and source review           | `docs/repository-data.md`; `SECURITY.md`                                                 |
| Licensing and external assets            | `THIRD_PARTY_NOTICES.md`                                                                 |
| Hosting PostgreSQL on Neon (optional)    | Vendored `.claude/skills/neon*/`, pinned by `skills-lock.json`; not a product dependency |
| Feature implementation and refactoring   | `.claude/skills/opentracker-development/SKILL.md`                                        |
| Local preview and screenshots            | `.claude/skills/opentracker-local-preview/SKILL.md`                                      |
| A requested deployment                   | `.claude/skills/opentracker-deploy/SKILL.md`                                             |

## Next.js guidance

The following block is maintained by the framework. Read its installed documentation before making framework-specific changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Development

Start with the [README quick start](../README.md#quick-start), then read [AGENTS.md](../AGENTS.md) for project decisions. The Node runtime is selected by `.node-version`; `package.json` pins pnpm. Use the committed lockfile and install with `pnpm install --frozen-lockfile`.

## Isolated local setup

Use a normal local filesystem, outside iCloud or another sync service. If your source checkout is synced, follow the [local-preview workflow](../.claude/skills/opentracker-local-preview/SKILL.md) to create a source-only scratch checkout. Never copy production environment files, database directories, browser state or `.local/` into it.

`pnpm db:local` starts a persistent, disposable PostgreSQL instance. Leave it running while developing. Its credentials match `.env.example`; `LOCAL_DB_PORT` selects a different port, and the matching `DATABASE_URL` must use that port. Stop the process before deleting its local data directory to reset it. If the embedded server reports a missing ICU library, rebuild its platform package as described in the local-preview workflow.

The first migration seeds `admin` / `umami`. The demo seed generates fictitious websites and visits; run it only against a disposable database. A database URL used for static checks must never point to production.

## Checks

```sh
pnpm verify
pnpm check:quality
pnpm build
pnpm audit --prod --audit-level high
```

`verify` runs the source guard, generates Prisma/OpenAPI artifacts, checks API contracts and types, and runs unit/component tests plus repository-guard regression tests. `check:quality` runs unused-code, lint and translation checks. Generation and unit tests can use `DATABASE_URL=postgresql://x:x@localhost/x` without a database server. `build` requires a real disposable database and applies migrations before building scripts and the app.

The [CI workflow](../.github/workflows/ci.yml) runs these gates on pull requests and pushes to `main` with disposable PostgreSQL and generated test secrets. Actions are pinned by commit, the token is read-only, and fork code runs without deployment credentials. CI skips the geolocation download to avoid coupling source checks to an external dataset; it does not validate geolocation lookup, a production deployment or UI screenshots. A dependency advisory lookup also requires the registry to be available. Run a full `pnpm audit` when updating tooling and consult [SECURITY.md](../SECURITY.md#dependency-review) for the currently unresolved development dependency.

`pnpm build:tracker:types` regenerates the committed tracker declarations; a clean result must not introduce unexplained source drift. Before committing, inspect the exact diff and run `node scripts/checks/repository.mjs --staged`.

## Behavior changes

- API changes require permission tests, a colocated contract and current generated OpenAPI output. Follow the [API contract guide](../src/openapi/README.md).
- Schema changes require a new numbered migration, matching Prisma/query updates and a migration run on a disposable database. Test both the new behavior and access restrictions.
- UI changes require English and Chinese strings and browser checks in both themes and at phone width. Follow the [design guide](design.md).
- Tracker changes must preserve installed integrations. Rebuild scripts and declarations, then test collection using a controlled synthetic visit.
- Dependency changes require a lockfile update, advisory review and a license check. Keep notices for bundled or redistributed code.

See [test conventions](../src/test/README.md) for mocks and fixtures. Choose tests that exercise behavior rather than duplicate the implementation.

## Screenshots and troubleshooting

Generate screenshots from a fresh demo database with the local-preview workflow. Temporary captures go in `artifacts/`. Before deliberately adding an image to `docs/images/`, inspect it for personal data, browser chrome, credentials, instance identifiers and misleading feature claims. Document that the data is synthetic and describe the relevant screen in alt text.

Missing `geo/` data can make collection fail even when the dashboard renders. Run `pnpm build:geo` before testing actual visits. A heartbeat verifies the application process, not persistence or the replay store. A passing unit suite does not prove a migration or browser interaction works.

## Documentation changes

Use one source line per Markdown paragraph or list item. Preserve code fences, tables and structural lists. Keep `AGENTS.md` short and focused on decisions that cannot be recovered by scanning source; put explanations and workflows in reference docs. `CHANGELOG.md` is an ignored local notebook, not a contribution requirement.

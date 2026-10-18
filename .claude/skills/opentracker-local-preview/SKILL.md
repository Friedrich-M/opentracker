---
name: opentracker-local-preview
description: Run the OpenTracker dashboard locally against a throwaway PostgreSQL with demo data, and screenshot pages to check visual or behavioural changes. Use before committing dashboard, styling, query or migration changes, or when asked to "look at", "preview" or "screenshot" the tracker.
---

# Local preview

Nothing here touches production; never point these steps at the Neon database or use the owner's password. Use `npx --yes pnpm@12.3.4` if pnpm is not installed.

## 0. A source-only copy outside cloud sync

Read `docs/repository-data.md`. If the working checkout is cloud-synced, create a scratch copy from Git-managed source and reviewed new source files. Do not copy `.env*`, `.mcp.json`, `.local/`, `.local-db/`, provider state, logs, exports, authentication state or captures. Copy `.env.example` explicitly to a new `.env` and generate local secrets there as in README.md. Review `git ls-files --cached --others --exclude-standard` before copying; Git still lists a sensitive file until its untracking is staged.

Install with `pnpm install --frozen-lockfile` in the scratch copy. Edit the working checkout and sync only changed source files before each check; copy formatting fixes back deliberately. Run the commands below in the scratch checkout, with a disposable database.

## 1. Database

```sh
pnpm db:local            # keep running in its own terminal / background job
export DATABASE_URL=postgresql://tracker:tracker@localhost:55432/tracker
pnpm build:db                    # Prisma client; check-db imports it
pnpm check:db                    # applies migrations; the first seeds the admin user
pnpm db:seed --days 30   # two demo websites with ~15k sessions
```

- `pnpm db:local` starts embedded PostgreSQL in `.local-db/` (git-ignored), in UTC like Neon. Delete `.local-db/` for an empty database.
- If it fails with `Library not loaded: libicudata`, the platform package's postinstall did not run: `pnpm rebuild @embedded-postgres/<platform>`.
- Seeded sessions have no `org`/`ip`; set some by SQL if the Organizations panel or Visitor Activity needs data, and say in your report that the values are fake. The visitor map needs a public IP the GeoLite database knows (e.g. `8.8.8.8`); documentation ranges such as 198.51.100.x have none.
- Seeded events have no `tag`; set one by SQL to see the project tabs.

## 2. Dev server

```sh
pnpm build:geo       # once: geo/*.mmdb, needed by /api/send and the visitor map
pnpm build:tracker && pnpm build:recorder
pnpm dev       # http://localhost:3000
```

`/api/send` returns 500 without `geo/GeoLite2-City.mmdb`. User agents containing words like "preview" or "bot" are dropped as bots (`beep: boop`).

## 3. Screenshots

```sh
pnpm screenshot --path /websites --out artifacts/list.png
pnpm screenshot --path "/websites/<id>?date=30day" --theme light --out artifacts/overview-light.png
pnpm screenshot --path "/websites/<id>?date=30day" --width 390 --height 1800 --out artifacts/phone.png
pnpm screenshot --path "/websites/<id>/sessions?date=30day" --click "li button[aria-expanded]" --out artifacts/expanded.png
```

`--click` presses the first match of a selector before the capture; scope it (the page has hidden `aria-expanded` buttons in the navigation). Add `locale=zh-CN` to the path's query to check the Chinese UI. The first capture after starting `pnpm dev` can time out while Next compiles the page; run it again. The script logs in as `admin` with the local database's initial password (`TRACKER_PASSWORD` overrides it).

The app follows the system colour scheme, which `--theme` (default `light`) emulates. Captures are full-page.

Get a website id from `GET /api/me/websites` after logging in, or from the dashboard URL. Demo sites are named "Demo Blog"; to see a title's pixel wordmark with its muted suffix, rename one through the API (`POST /api/websites/<id>` with `{"name":"example.com"}` and the login token as `Authorization: Bearer`).

Check every visual change in light, dark and 390px width (AGENTS.md, Design).

## 4. Sending test events

```sh
curl -X POST localhost:3000/api/send -H 'content-type: application/json' \
  -H 'user-agent: Mozilla/5.0 (Macintosh) Safari/605.1.15' -H 'x-forwarded-for: 8.8.8.8' \
  -d '{"type":"event","payload":{"website":"<id>","hostname":"example.com","url":"/"}}'
```

Add `"internal":true`, or use `"hostname":"localhost:8000"`, to produce an internal visit. Stats endpoints round ranges to whole units, so query a window of a day or more around the events.

## 5. Clean up

Stop the dev server and `pnpm db:local` when done. Keep captures under ignored `artifacts/`; never check in browser authentication state or local database files.

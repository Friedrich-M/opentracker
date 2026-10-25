# Architecture

How a visit on a tracked website becomes a row in the dashboard. Read this before changing collection, identity, filtering or the schema.

## Collection

```
page on example.com
  script.js (src/tracker)    ── POST /api/send  ──▶ session + website_event (+ event_data)
  recorder.js (src/recorder) ── POST /api/record ─▶ session_replay (+ R2), heatmap_event
```

`POST /api/send` (`src/app/api/send/route.ts`) does, in order:

1. Validate the payload; `website` is required.
2. `getClientInfo` (`src/lib/detect.ts`): user agent → browser/OS/device; IP from the proxy header `CLIENT_IP_HEADER` names, or from the first known proxy header when it is unset (`src/lib/ip.ts`); location from the hosting platform's headers (`x-vercel-ip-*`, `cf-ip*`; only the platform that sets the trusted IP header when one is configured) or GeoLite2-City; network (`asn`, `org`) from GeoLite2-ASN. On a Cloudflare Worker, `request.cf` supplies location and network for the connecting client (`src/lib/cloudflare.ts`).
3. Drop bots (`isbot`) and `IGNORE_IP` addresses.
4. `internal` = the browser's owner mark, or a local hostname sent from a local `Origin` (`src/lib/internal.ts`), so a public page cannot hide its visits by claiming `localhost`. The script takes the mark from `?tracker=<mark>` (`OWNER_MARK`) or from the `tracker_me` cookie that the dashboard sets on the site's domain (`OWNER_COOKIE_DOMAIN`) whenever the owner is signed in (`POST /api/auth/verify`); `?tracker=reader` clears it. Queries add `internal = false` (`parseFilters`) unless a logged-in request sets `includeInternal=true`, the dashboard's "Include my visits".
5. Identity: `sessionId = uuid(website, ip, user agent, monthly salt, distinct id)`; `visitId = uuid(sessionId, hourly salt)`. No cookies. A signed cache token (`x-tracker-cache`) carries ids between requests.
6. Create the session row once (with `ip`, `asn`, `org`), then save the event.

The script also sends `tag` (the page's `data-tag`, its project, such as `docs` or `blog`) with every event, and automatic `outbound` (`url`, `domain`) and `download` (`url`, `file`) events for plain link clicks.

`POST /api/record` stores rrweb chunks and heatmap points only when the website has the recorder enabled (`website.recorderEnabled`, settings page "Replays & Heatmaps"); `/api/websites/<id>/recorder` serves the sampling config the recorder reads first; it samples each page load once, at the rate its `data-tag` has in `tagSampleRates` or else `sampleRate`. Each chunk keeps that tag (`session_replay.tag`; a recorder without one gets the visit's latest page view's), and the replay list and player filter chunks by the `tag` filter, so a visit crossing projects shows in each with its own pages. Saved replays open with `full=1` and play the whole visit. Replay chunks are kept only for visitors whose location (as in step 2 above) is in `REPLAY_COUNTRIES` (default US, CN, HK, SG; `*` for all); a local address records outside production, or behind a trusted IP header. A chunk needs the cache token `/api/send` issued for the same website, and a visit stops at `REPLAY_MAX_CHUNKS_PER_VISIT` chunks (default 600). The recorder gzips its bodies (`Content-Encoding: gzip`; the route inflates them under the same 1 MB cap) and stops a page's recording at the first refusal (`ok: false`, 400 or 403); until the first chunk is answered, later chunks wait, so a refused visitor uploads one chunk. Heatmap pages open only on the website's own domain, in a sandboxed frame.

## Replay store

A replay chunk's gzipped rrweb events go to Cloudflare R2 through the `tracker-replay-store` Worker (`workers/replay-store/`, bucket `tracker-replays`), keyed `<websiteId>/<visitId>/<replayId>`; its `session_replay` row keeps the metadata with `events` null. Rows written without `REPLAY_STORE_URL` and `REPLAY_STORE_SECRET` (local development) hold the bytes in `events`, and `getReplayChunks` reads either.

- Write: the body is stored first, then the row, so no row lacks a body.
- Read: bodies are fetched eight at a time; a missing one is skipped.
- Delete: the retention cron deletes bodies, then rows, so a failed run retries. Deleting a session, website or user commits the rows first, then clears the bodies (a website by its key prefix) and only logs a failure.

## Data model (PostgreSQL)

| Table                                                     | Holds                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `website`                                                 | Tracked sites, owned by `user_id`; `recorder_enabled`, `replay_config`, `reset_at`                          |
| `session`                                                 | One per visitor per salt period: device, location, `ip`, `asn`, `org`, `distinct_id`                        |
| `website_event`                                           | Page views (`event_type` 1), custom events (2), performance (5); URL, referrer, UTM, `hostname`, `internal` |
| `event_data`, `session_data`                              | Key/value properties on events and sessions                                                                 |
| `session_link`                                            | Joins anonymous sessions to an identified `distinct_id`                                                     |
| `session_replay`, `session_replay_saved`, `heatmap_event` | Recorder output; replay bodies in R2 ([Replay store](#replay-store))                                        |
| `report`, `segment`, `annotation`, `share`                | Saved funnels/goals, segments, chart notes, public share links                                              |
| `visitor_label`                                           | The owner's name and note for a visitor IP, per user                                                        |
| `user`, `api_key`, `two_factor_*`, `app_setting`          | Accounts and security                                                                                       |

Numbered SQL migrations in `prisma/migrations/` are the source of truth for the deployed schema; `schema.prisma` mirrors them for the Prisma client.

## Querying

- Analytics live in `src/queries/sql/`. Each exported function calls a `relationalQuery` that writes SQL through `prisma.rawQuery`, with `{{name}}` placeholders bound from `queryParams`.
- `prisma.parseFilters(filters)` (`src/lib/prisma.ts`) turns URL filters into SQL fragments: `filterQuery` (always starts with the internal-visit exclusion), `dateQuery`, `joinSessionQuery`, `cohortQuery`, `excludeBounceQuery`. New queries over `website_event` must include `filterQuery`, or apply `internal = false` themselves.
- API routes (`src/app/api/websites/[websiteId]/*`) parse the request with `parseRequest`, build filters with `getQueryFilters` (`src/lib/request.ts`), check permissions (`src/permissions/`) and return JSON. Each route has an OpenAPI contract next to it.

## Access

- One owner account (plus optional others); a website is visible to its `user_id` and admins.
- Dashboard requests carry a stateless signed token that expires after 30 days (`LOGIN_TOKEN_TTL`; changing the password invalidates every token) or an API key (`Authorization: Bearer`). Account routes (`/api/me/*`, `/api/2fa/*`, website creation) call `parseRequest` with `requireUser`, which turns a share token into a 401.
- Share links (`/share/<slug>`) issue a short-lived token for one website and the sections enabled on that share. `parseRequest` strips visitor network parameters (IP, ASN, organisation) from every share request, and every filter when the share disallows filters.
- Sign-in failures are limited per address and username and per address (`src/lib/login-limit.ts`, in memory per instance); past the limit `/api/auth/login` answers 429 with `Retry-After`.

## Dashboard

Next.js App Router under `src/app/(main)/`, components from the Zen component library, styled by opencode's vendored docs stylesheet (`src/app/opencode.css`) and themed by `src/app/global.css` (AGENTS.md, Design). Data fetching goes through hooks in `src/components/hooks/queries/`, which add the date range and filters from the URL (`useFilterParameters`).

- **Projects.** Each domain is one website; projects are event tags. `ProjectTabs` (All, then one tab per tag, ordered by `NEXT_PUBLIC_PROJECT_ORDER`) under the title sets or clears the `tag` URL filter, so every report can be read for the whole domain (the default) or one project. A visitor crossing projects stays one session.
- **Visitor Activity** (`sessions/VisitorActivity.tsx`) is the sessions list after StatCounter's: one line per session led by where the visitor came from and where they landed (`referrer → entry page`, in weight, the page named by its title or "Home page"), then latest view, page views with the visitor's total, place, organisation with "You" and the owner's label, and system icons. It expands to the full record: length, resolution, same-IP sessions (the magnifier searches that IP), ISP/IP, referrer, entry and latest page, page path, and a link to the visitor panel. Export downloads the listed sessions as CSV. It is the only sessions layout.
- **Visitor panel** (`SessionProfile`), after StatCounter's Magnify Visitor: label editor; a map of the IP's approximate place (`VisitorMap`: plain OpenStreetMap tiles, a point and MaxMind's accuracy circle); the facts (`VisitorFacts`: initial referrer, ISP, IP with reverse-DNS host name, location, sessions; device and resolution, system, language, first and last seen); and Navigation paths (`/sessions/<id>/paths`): every visit from the visitor's IP across the owner's websites, folded per visit, with the outside link before each page that came from one, Expand/Collapse all and CSV export. Coordinates and host name come from `/sessions/<id>/network`, derived from the stored IP on request (owner-only; it ships the GeoLite databases). Share links get the single session, no map, labels or network.
- Sessions are shown by `SessionMark`, the first six characters of the session id. `SystemIcons` draws device, OS and browser as one cell.

## External services and repository boundary

The geolocation build downloads GeoLite City/ASN (from a mirror by default, or MaxMind with a configured key). Runtime can call the configured replay Worker and perform reverse-DNS lookups. The dashboard browser requests map tiles and favicons; its own fonts are bundled. A replay loads the recorded page's fonts, stylesheets and media from their own origins, which is why the Content-Security-Policy (`src/lib/csp.ts`) allows any HTTPS origin for those three and none for scripts. Account-specific endpoints and credentials are deployment configuration, not repository fixtures.

Stored visitor data includes IPs, navigation and optional replay content. Keep it outside Git; see [repository data policy](repository-data.md). Local screenshots and diagnostics must use synthetic data and ignored output paths.

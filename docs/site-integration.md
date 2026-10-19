# Website integration

Create one website per domain in the dashboard, then use its generated website ID. Examples below use `example.com` and an independent analytics host, `analytics.example.com`; replace both with your own deployment.

## Page views and events

Place the tracking script near the end of the page body:

```html
<script defer src="https://analytics.example.com/script.js" data-website-id="YOUR_WEBSITE_ID" data-tag="research"></script>
```

`data-tag` is optional. Pages sharing a domain can use tags such as `home`, `research` and `hobbies` to appear as projects within one website. The Projects tabs filter all reports by tag; crossing tags does not create a separate visitor session. New tags appear automatically: the tags named in `NEXT_PUBLIC_PROJECT_ORDER` (read at build time) first, the rest alphabetically; `ProjectTabs.tsx` translates the common names `home`, `research` and `hobbies`.

The script collects page views and automatic outbound/download events. Its runtime API remains `window.tracker`, with `data-tracker-*` attributes. If a page uses its URL hash for in-page state rather than navigation, add `data-exclude-hash="true"` to avoid counting each state change as a page view.

| Attribute                                                | Effect                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `data-website-id`                                        | The website to record; required.                                     |
| `data-tag`                                               | The page's project.                                                  |
| `data-host-url`                                          | Send to this OpenTracker address instead of the script's own origin. |
| `data-domains`                                           | Comma-separated hostnames to record; other hosts send nothing.       |
| `data-auto-track="false"`                                | Send nothing automatically; call `window.tracker` yourself.          |
| `data-auto-pageview="false"`                             | Keep automatic events but skip automatic page views.                 |
| `data-exclude-search="true"`, `data-exclude-hash="true"` | Drop the query string or hash from recorded URLs.                    |
| `data-do-not-track="true"`                               | Honour the browser's Do Not Track setting.                           |
| `data-before-send`                                       | Name of a global function that may change or drop each payload.      |
| `data-distinct-id`                                       | Identify the visitor with your own ID.                               |
| `data-performance="true"`                                | Also send web-vital measurements.                                    |
| `data-fetch-credentials`                                 | `fetch` credentials mode for collection requests; default `omit`.    |

## Replays and heatmaps

Enable the recorder in the website's settings before adding:

```html
<script defer src="https://analytics.example.com/recorder.js" data-website-id="YOUR_WEBSITE_ID" data-tag="research"></script>
```

Use the same tag on both scripts. Recorder settings control replay and heatmap sampling separately; `tagSampleRates` overrides the replay rate for a page's tag, otherwise `sampleRate` applies. The default rate is 15% when no rate is configured. Enabling recording is a separate setting.

Each replay chunk keeps its page tag. A project view plays that project's pages; saved replays play the whole visit. Only visitors from the countries in `REPLAY_COUNTRIES` (default US, CN, HK, SG) are recorded; see [architecture](architecture.md). Choose masking, excluded selectors and retention for your own pages. Never use real recordings as repository fixtures or public bug-report attachments.

## Embedded pages and internal visits

For pages that also appear inside iframes, load scripts only when `window.self === window.top` if the parent already records the visit. Set `data-domains` when collection should be limited to specific hostnames. Without that restriction, localhost and private-network previews can be recorded; a visit whose page and request origin are both local is marked internal and hidden by default.

A browser can be marked internal through `?tracker=<OWNER_MARK>` or by signing in to the dashboard; `?tracker=reader` clears the mark. Settings → Profile provides the links. Each browser has its own mark. Treat these links as private configuration and avoid publishing them in issues or screenshots. `OWNER_COOKIE_DOMAIN` controls cookie sharing between the dashboard and the tracked site. See [architecture](architecture.md) for the fallback behavior.

## Verification

Use a disposable local database and synthetic visits. Check the page URL, tag, internal-visit filter and recorder settings in the dashboard. A script loading successfully does not prove that collection or persistence works.

Scripts may remain cached for a day; maintain compatibility with cached clients when changing collection payloads. Changing a page's tag requires a release of that website, not a deployment of OpenTracker.

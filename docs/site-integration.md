# Website integration

Create one website per domain in the dashboard, then use its generated website ID. Examples below use `example.com` and an independent analytics host, `analytics.example.com`; replace both with your own deployment.

## Page views and events

Place the tracking script near the end of the page body:

```html
<script defer src="https://analytics.example.com/script.js" data-website-id="YOUR_WEBSITE_ID" data-tag="research"></script>
```

`data-tag` is optional. Pages sharing a domain can use tags such as `home`, `research` and `hobbies` to appear as projects within one website. The Projects tabs filter all reports by tag; crossing tags does not create a separate visitor session. New tags appear automatically; `ProjectTabs.tsx` contains the order and translations for the built-in labels.

The script collects page views and automatic outbound/download events. Its runtime API remains `window.tracker`, with `data-tracker-*` attributes. If a page uses its URL hash for in-page state rather than navigation, add `data-exclude-hash="true"` to avoid counting each state change as a page view.

## Replays and heatmaps

Enable the recorder in the website's settings before adding:

```html
<script defer src="https://analytics.example.com/recorder.js" data-website-id="YOUR_WEBSITE_ID" data-tag="research"></script>
```

Use the same tag on both scripts. Recorder settings control replay and heatmap sampling separately; `tagSampleRates` overrides the replay rate for a page's tag, otherwise `sampleRate` applies. The default rate is 15% when no rate is configured. Enabling recording is a separate setting.

Each replay chunk keeps its page tag. A project view plays that project's pages; saved replays play the whole visit. The current replay country filter is documented in [architecture](architecture.md). Choose masking, excluded selectors and retention for your own pages. Never use real recordings as repository fixtures or public bug-report attachments.

## Embedded pages and internal visits

For pages that also appear inside iframes, load scripts only when `window.self === window.top` if the parent already records the visit. Set `data-domains` when collection should be limited to specific hostnames. Without that restriction, localhost and private-network previews can be recorded, but are marked internal and hidden by default.

A browser can be marked internal through `?tracker=<OWNER_MARK>` or by signing in to the dashboard; `?tracker=reader` clears the mark. Settings → Profile provides the links. Each browser has its own mark. Treat these links as private configuration and avoid publishing them in issues or screenshots. `OWNER_COOKIE_DOMAIN` controls cookie sharing between the dashboard and the tracked site. See [architecture](architecture.md) for the fallback behavior.

## Verification

Use a disposable local database and synthetic visits. Check the page URL, tag, internal-visit filter and recorder settings in the dashboard. A script loading successfully does not prove that collection or persistence works.

Scripts may remain cached for a day; maintain compatibility with cached clients when changing collection payloads. Changing a page's tag requires a release of that website, not a deployment of OpenTracker.

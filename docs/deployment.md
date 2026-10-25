# Deploy OpenTracker

You can run the application on a Linux server, Vercel or Cloudflare Workers. PostgreSQL is required; replay bodies can stay in PostgreSQL or use the optional Cloudflare R2 Worker. Use your own accounts and configuration. Keep credentials, database dumps and instance notes outside Git.

## Linux server

This example uses Ubuntu/Debian, systemd and Nginx. You need a domain pointed at the server, HTTPS, outbound access for package/geolocation downloads, and PostgreSQL available to the application. The commands assume administrator access; replace `analytics.example.com` and configure your own database credentials. Start with enough memory to run a Next.js production build; runtime-only sizing is not a build-time memory guarantee.

### 1. Prepare the host

Install the Node version in `.node-version` using your preferred [Node.js installation method](https://nodejs.org/en/download). Confirm `node --version` and the location of the executable. The service below assumes `/usr/bin/node`; change that path if Node is installed elsewhere. Do not rely on an interactive shell’s version-manager initialization for a systemd service.

```sh
sudo apt update
sudo apt install git nginx postgresql postgresql-contrib
sudo npm install --global pnpm@12.3.4
sudo systemctl enable --now postgresql nginx
sudo useradd --system --create-home --home-dir /srv/opentracker --shell /usr/sbin/nologin opentracker
sudo -u opentracker git clone https://github.com/Friedrich-M/opentracker.git /srv/opentracker/app
```

A private repository requires your own authorized Git access. Do not embed a token in a clone URL. The service account runs the app; it does not need administrator privileges.

### 2. Create PostgreSQL and configuration

For PostgreSQL on the same server:

```sh
sudo -u postgres createuser --pwprompt opentracker
sudo -u postgres createdb --owner=opentracker opentracker
sudo install -o root -g opentracker -m 640 /dev/null /etc/opentracker.env
sudoedit /etc/opentracker.env
```

Put the following variables in `/etc/opentracker.env`, replacing the database password. URL-encode special characters in the password. For a hosted database, use its connection URL and TLS settings; `DIRECT_DATABASE_URL` can hold a direct migration connection when the application uses a pooled endpoint.

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://opentracker:REPLACE_WITH_YOUR_PASSWORD@localhost:5432/opentracker
DIRECT_DATABASE_URL=
CLIENT_IP_HEADER=x-real-ip
REPLAY_RETENTION_DAYS=14
NEXT_TELEMETRY_DISABLED=1
```

`CLIENT_IP_HEADER` names the one header the application reads for the visitor's address; the Nginx template below sets `X-Real-IP` from the connection and blanks the CDN headers. Without the setting the application accepts any known proxy header, so a visitor could supply one to forge the stored IP, evade `IGNORE_IP` and pass the replay country check.

Generate fresh application, two-factor and cleanup secrets directly into the protected file. A production build (`NODE_ENV=production`) stops when `APP_SECRET` is missing, so run this before building:

```sh
sudo sh -c 'for key in APP_SECRET TWO_FACTOR_ENCRYPTION_KEY CRON_SECRET; do printf "%s=%s\n" "$key" "$(openssl rand -hex 32)"; done >> /etc/opentracker.env'
```

Run that command only during initial setup. Keep the two-factor encryption key stable and back it up securely; changing it makes existing encrypted two-factor secrets unusable. For the build commands below, keep this environment file compatible with both a POSIX shell and systemd: simple `KEY=value` assignments, no variable interpolation or shell commands. Restrict PostgreSQL and the app port to the local/private network; expose only the reverse proxy.

### 3. Install and build

```sh
sudo -u opentracker sh -c '
  cd /srv/opentracker/app
  set -a
  . /etc/opentracker.env
  set +a
  pnpm install --frozen-lockfile --prod=false
  pnpm build
'
```

Build tools are development dependencies, so do not omit them before building. `pnpm build` generates the Prisma client, **applies database migrations**, builds the tracker and recorder, downloads geolocation databases and builds Next.js. Run it against the intended database only after a backup. Do not run `db:seed` on a production instance.

If the geolocation mirror is unavailable, configure `MAXMIND_LICENSE_KEY` or your own database URLs as described by the build script. Skipping that download without providing valid databases can leave collection broken even when the dashboard loads.

### 4. Run with systemd

Install the checked-in [opentracker.service](../deploy/systemd/opentracker.service) template:

```sh
sudo install -m 644 /srv/opentracker/app/deploy/systemd/opentracker.service /etc/systemd/system/opentracker.service
sudoedit /etc/systemd/system/opentracker.service
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now opentracker
sudo systemctl status opentracker
curl --fail http://127.0.0.1:3000/api/heartbeat
```

Before opening the site publicly, use an SSH tunnel to reach `http://localhost:3000`, log in with the initial account `admin` / `umami`, and change its password:

```sh
# Run on your own computer; replace the SSH target.
ssh -L 3000:127.0.0.1:3000 user@your-server
```

### 5. Configure Nginx and HTTPS

Install the checked-in [opentracker.conf](../deploy/nginx/opentracker.conf) template:

```sh
sudo install -m 644 /srv/opentracker/app/deploy/nginx/opentracker.conf /etc/nginx/sites-available/opentracker
sudoedit /etc/nginx/sites-available/opentracker
```

```sh
sudo ln -s /etc/nginx/sites-available/opentracker /etc/nginx/sites-enabled/opentracker
sudo nginx -t
sudo systemctl reload nginx
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d analytics.example.com
```

The proxy example assumes Nginx directly receives public traffic. If a trusted CDN or load balancer is in front, configure Nginx’s real-IP module with that provider’s actual trusted networks before forwarding addresses; never trust arbitrary client headers. Test TLS renewal for the certificate setup you choose.

### 6. Schedule replay cleanup

Saved replays, and chunks from pages tagged in `REPLAY_KEEP_TAGS`, are retained; other chunks expire after `REPLAY_RETENTION_DAYS`. On a server, schedule the authenticated cleanup endpoint yourself. Install the checked-in [cleanup service](../deploy/systemd/opentracker-cleanup.service):

```sh
sudo install -m 644 /srv/opentracker/app/deploy/systemd/opentracker-cleanup.service /etc/systemd/system/opentracker-cleanup.service
sudoedit /etc/systemd/system/opentracker-cleanup.service
```

Install the checked-in [opentracker-cleanup.timer](../deploy/systemd/opentracker-cleanup.timer) template:

```sh
sudo install -m 644 /srv/opentracker/app/deploy/systemd/opentracker-cleanup.timer /etc/systemd/system/opentracker-cleanup.timer
sudoedit /etc/systemd/system/opentracker-cleanup.timer
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now opentracker-cleanup.timer
sudo systemctl start opentracker-cleanup.service
sudo systemctl list-timers opentracker-cleanup.timer
```

This timer does not delete saved replays or other visitor analytics; it deletes heatmap points only when `HEATMAP_RETENTION_DAYS` is set. Plan retention and backups for the other tables separately.

## Abuse protection

The collection endpoints (`/api/send`, `/api/record`) accept anonymous requests by design. Sign-in failures are limited per instance, and a visit's replay stops after `REPLAY_MAX_CHUNKS_PER_VISIT` chunks, but nothing caps request volume: put a rate limit or WAF rule in front of the application (Nginx `limit_req`, Cloudflare or Vercel firewall rules), and watch database growth.

## Verify the deployment

Check `/api/heartbeat`, `/script.js` and `/recorder.js`. Add a test website, install its script and verify a controlled visit appears in the dashboard. If recording is enabled, verify a synthetic replay can be recorded and played. A heartbeat alone does not test PostgreSQL, geolocation or external replay storage.

Use `journalctl -u opentracker` and `journalctl -u opentracker-cleanup` for service errors. Logs may contain sensitive information; redact before sharing. Monitor disk/database growth, backup completion, cleanup failures and HTTP errors.

## Upgrades, backups and rollback

Back up PostgreSQL and the protected environment file before an upgrade. For example, create a custom-format dump with `pg_dump --format=custom --file=/path/outside/repo/backup.dump <database>` using your approved database authentication. Restrict backup permissions, store a copy off-server and test restoration into a disposable database with `pg_restore`. Do not commit backups or credentials.

For this single-directory example, plan downtime: record the current Git commit, stop the service, update source with `git pull --ff-only`, repeat the locked install and build as the service user, then restart and run the verification above. Building in the directory of a running instance can replace files it is serving, so do not skip the stop step. Larger deployments should use separate release directories and switch traffic only after a release is healthy.

An application rollback restores the prior commit’s code and rebuilds it; it does not undo migrations. Check schema compatibility first. Restore a database backup only as a separately planned operation, with the associated data-loss window understood. Preserve the application and encryption secrets through upgrades and restores.

## Vercel

1. Import your fork as a Vercel project, or link a local checkout with `vercel link` (`.vercel/` stays local).
2. Add a PostgreSQL 14+ database and set `DATABASE_URL`, plus `DIRECT_DATABASE_URL` when the provider gives a pooled application URL.
3. Set `APP_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` and `CRON_SECRET` to fresh values (`openssl rand -hex 32`), and `BUILD_GEO=1`.
4. Deploy. The build applies migrations; the checked-in configuration schedules daily replay cleanup.
5. Sign in as `admin` / `umami` and change the password at once.

On Vercel the visitor's address is read from `x-real-ip`, which Vercel sets itself, and location from Vercel's own headers; `CLIENT_IP_HEADER` overrides the header.

`sh scripts/deploy/vercel.sh` uploads an archive of the committed tree using the local project link. It refuses a dirty tree and checks staged source before upload. Confirm the intended CLI account and project before invoking it. A Git push deploys only if you configure the provider integration.

## Cloudflare Workers

The app runs as one Worker through the OpenNext adapter (`wrangler.jsonc`, `open-next.config.ts`, entry `deploy/cloudflare/worker.js`). The Worker is about 7 MB compressed, over the free plan's 3 MB limit, so the account needs the Workers Paid plan. Data transfer is not billed.

1. Sign in with `npx wrangler login`. Copy `wrangler.jsonc` to the ignored `wrangler.local.jsonc`, set `name` there and add your domain under `routes` (`custom_domain: true` needs the domain's DNS zone in the same Cloudflare account); the deploy script uses it instead of the committed file.
2. Store run-time secrets with `npx wrangler secret put NAME`: `DATABASE_URL`, `APP_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` and `CRON_SECRET` (fresh values from `openssl rand -hex 32`), plus `REPLAY_STORE_URL` and `REPLAY_STORE_SECRET` with R2. Other settings go under `vars`.
3. Export `DATABASE_URL` (and any `NEXT_PUBLIC_*` settings) in your shell and run `sh scripts/deploy/cloudflare.sh`. It builds `git archive HEAD` in a temporary folder, applies migrations and runs `wrangler deploy`; it refuses a dirty tree.
4. Sign in as `admin` / `umami` and change the password at once.

Differences from the other hosts:

- `CLIENT_IP_HEADER` is `cf-connecting-ip` (set in `vars`), and location and network (`asn`, `org`) come from Cloudflare's `request.cf`. The GeoLite databases are not used, so the visitor map has no coordinates.
- A Worker cannot reuse a database connection across requests, so each request opens its own. To pool them, create a Hyperdrive config for the database and bind it as `HYPERDRIVE` (commented in `wrangler.jsonc`); it then replaces `DATABASE_URL` at run time.
- The cron trigger in `wrangler.jsonc` runs the daily replay cleanup with `CRON_SECRET`.
- The build generates a Prisma client for workerd and restores the Node client afterwards (`scripts/build/cloudflare.js`). OpenNext embeds `.env` files in the Worker, which is why the deploy builds from a clean archive.
- `wrangler tail` shows run-time logs; `npx wrangler rollback` restores an earlier upload without undoing migrations.

## Optional Cloudflare R2 replay storage

Without external storage, replay bodies occupy PostgreSQL. To use R2:

1. In `workers/replay-store/`, create a bucket with `npx wrangler r2 bucket create <name>` and set `bucket_name` in `wrangler.toml` to it (adjust the Worker `name` too if you like).
2. Deploy with `npx wrangler deploy`; it prints the Worker's URL.
3. Generate a secret (`openssl rand -hex 32`) and store it with `npx wrangler secret put REPLAY_STORE_SECRET`.
4. Set `REPLAY_STORE_URL` to the Worker's URL and `REPLAY_STORE_SECRET` to the same secret on the application; both must be configured together.

Names are not access controls. Never commit account tokens, real replay objects or provider state. Existing database-backed replay bodies remain readable; deploying the Worker does not migrate them automatically. Include both the database metadata and external objects in your backup/recovery plan.

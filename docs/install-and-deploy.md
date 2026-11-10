# Install And Deploy

## Requirements

- Go `1.26.10+`
- Node.js `22+`
- `npm`
- PostgreSQL `15+`
- PostGIS
- Optional for local infra: Docker + Docker Compose

## Local Install

### 1. Start infrastructure

```bash
make dev-up
```

### 2. Export environment

```bash
export DATABASE_URL='postgres://postgres:postgres@127.0.0.1:54329/wifiyka?sslmode=disable'
export BASE_URL='http://localhost:8098'
export LISTEN_ADDR='127.0.0.1:8098'
export STATIC_DIR="$(pwd)/web/dist"
export LEGAL_DOCS_DIR="$(pwd)/deploy/legal"
export OFFLINE_PACKS_DIR="$(pwd)/deploy/offline-packs"
export OFFLINE_PACKS_BASE_URL='/offline-packs'
```

Optional SMTP variables for email magic links:

```bash
export SMTP_HOST='smtp.example.com'
export SMTP_PORT='465'
export SMTP_USERNAME='ceo@example.com'
export SMTP_PASSWORD='replace_me'
export SMTP_FROM='ceo@example.com'
export SMTP_FROM_NAME='Wifiyka'
```

### 3. Add legal documents as standalone text files

Create your own runtime legal texts outside the source tree history:

```bash
mkdir -p deploy/legal
$EDITOR deploy/legal/privacy.txt
$EDITOR deploy/legal/consent-personal-data-email.txt
```

The app serves only these two files from `LEGAL_DOCS_DIR`. Nothing is hardcoded in the frontend anymore.

### 4. Apply database migrations

```bash
make migrate
```

### 5. Install frontend and run checks

```bash
make web-install
cd web && npm test -- --run
cd web && npm run build
```

### 6. Run backend checks and start the app

```bash
cd backend && /usr/local/go/bin/go test ./...
make run-backend
```

## Production Build

Release script:

```bash
cd deploy
./build-release.sh
```

The script syncs `docs/openapi.yaml` into `web/public/openapi.yaml` before the release build.

Manual build flow:

```bash
cd web && npm test -- --run
cd web && npm run build
cd backend && /usr/local/go/bin/go test ./...
make prepare-static
cd backend && /usr/local/go/bin/go build -o ../dist/wifiyka-server ./cmd/server
```

## Generic Deploy

1. Copy the project to the target host.
2. Copy `deploy/.env.example` to `deploy/.env` and fill real values.
3. Create `deploy/legal/privacy.txt` and `deploy/legal/consent-personal-data-email.txt` on the target host with your own legal text.
4. Create PostgreSQL database with PostGIS enabled.
5. Apply migrations.
6. Build the release on the server or upload `dist/` plus static assets.
7. Install `deploy/systemd/wifiyka.service`.
8. Configure `nginx` using `deploy/nginx/wifi.eval.su.conf` as the reference template.
9. Restart `systemd` unit and `nginx`.
10. Check:

```bash
curl -fsS https://your-domain.example/healthz
curl -fsS https://your-domain.example/openapi.yaml
```

Then open the browser docs UI:

```text
https://your-domain.example/swagger
```

## Current Production Shape

- Host: `185.225.32.121`
- User: `hellor8g`
- Path: `/var/www/sergey/wifiyka/current`
- Service: `wifiyka.service`
- Health endpoint: `https://wifi.eval.su/healthz`

Typical update flow on the current server:

```bash
cd /var/www/sergey/wifiyka/current
mkdir -p deploy/legal
$EDITOR deploy/legal/privacy.txt
$EDITOR deploy/legal/consent-personal-data-email.txt
./deploy/build-release.sh
sudo systemctl restart wifiyka.service
curl -fsS https://wifi.eval.su/healthz
```

## Release safety (2026-11)

Use Node 22.12+ and Go 1.26.10. `deploy/build-release.sh` builds the full PWA,
embeds it in the Go binary and versions the service worker from the build output.
The MapLibre module worker is part of the manifest, not an external CDN dependency.
Do not deploy source `web/public/sw.js` directly: deploy the generated `dist/sw.js`.

Before updating: preserve the running binary, matching static assets, source tree,
external legal documents, packs and a PostgreSQL dump. Keep credentials in a
mode-0600 environment file outside Git. Build and test before restarting the
application. Apply migrations from `backend/` with the same environment as the
service. Migration 005 only adds a nullable receipt fingerprint; it is compatible
with the previous binary for rollback. No manual rewrite of existing receipts is
needed. Do not drop the database or recreate anonymous accounts during upgrades.

After restart verify `/healthz`, `/readyz`, `/tech`, `/openapi.yaml`, the manifest,
service worker and an actual Range request to a PMTiles file. Check that API
responses are `no-store`, HTML is `no-cache`, and hashed assets are immutable.
Verify that the service is enabled and remains active without restart loops.

For rollback restore the previous binary and matching assets, then restart only
`wifiyka.service`. Keep the additive schema column. Database restore is a separate
recovery action; it can discard user writes and must not be part of ordinary code
rollback. A stale client can keep the previous shell until reopening; one previous
asset cache is deliberately retained. Users should not need to clear device data.

Tests that use a real database require `WIFI_TEST_DATABASE_URL` pointing to a
**disposable migrated PostGIS database**, never production. The suite intentionally
installs a temporary failing trigger to prove transactional rollback. Create a separate local PostGIS service. GitHub Actions is intentionally
disabled: this repository stores source only; run checks locally. For browser checks use `npx playwright install chromium`
and `npx playwright test` after building; local installations can set
`PLAYWRIGHT_CHROME_PATH` to their Chrome executable.

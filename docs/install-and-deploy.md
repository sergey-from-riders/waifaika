# Install And Deploy

## Requirements

- Go `1.25.8+`
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

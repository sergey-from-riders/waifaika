# Wifiyka

Wifiyka is a mobile-first map/PWA for crowdsourced Wi-Fi discovery. The repo is structured as a monorepo with a React/Vite frontend, a Go API, PostgreSQL/PostGIS storage, offline pack support via PMTiles, and production deployment templates for `nginx + systemd`.

This repository can also be used as a base for other location-heavy applications: city guides, field collection tools, offline map viewers, place directories, local review maps, and similar products where map interaction, sync, and resilient mobile UX matter.

## Screenshots

Captured locally with headless Google Chrome against the built app.

| Discovery map | Place card |
| --- | --- |
| ![Map home](docs/screenshots/map-home.png) | ![Place sheet](docs/screenshots/place-sheet.png) |
| Nearby hint, offline shell, mobile controls, and bottom navigation. | Share CTA, coordinates copy, direction card, and voting states. |

| Add flow | Activity feed |
| --- | --- |
| ![Add flow](docs/screenshots/add-flow.png) | ![Activity](docs/screenshots/activity.png) |
| Address lookup, add form, and promo field in the create flow. | User-owned places and actions collected in one mobile-first screen. |

| About and API links | Self-hosted API docs |
| --- | --- |
| ![About page](docs/screenshots/about.png) | ![API docs](docs/screenshots/api-docs.png) |
| Install hints, account actions, legal links, and API entry points. | Swagger-style UI served from the app domain without CDN dependencies. |

## What is inside

- React + TypeScript frontend optimized for mobile and installable as a PWA
- Go backend with JSON API, session auth, sync endpoints, static serving, and SMTP-based email flows
- PostgreSQL/PostGIS schema with versioned entities and offline-first sync semantics
- Demo offline map assets and deployment templates for the current production shape
- Install-time legal documents served from external `deploy/legal/*.txt` files instead of hardcoded page content
- Public OpenAPI spec served from `/openapi.yaml`
- Self-hosted Swagger-like API docs UI served from `/api-docs.html` with aliases `/api-docs` and `/swagger`

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, MapLibre GL JS, Dexie, Playwright, Vitest
- Backend: Go 1.25.8, chi, pgx, goose-compatible SQL migrations
- Data: PostgreSQL, PostGIS, PMTiles
- Deploy: `nginx`, `systemd`, Docker Compose for local infra

## Docs

- [Install and deploy guide](docs/install-and-deploy.md)
- [Stack and reuse guide](docs/stack-and-reuse.md)
- [Architecture overview](docs/architecture.md)
- [OpenAPI source](docs/openapi.yaml)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Quick Start

1. Start local services:

```bash
make dev-up
```

2. Export backend environment:

```bash
export DATABASE_URL='postgres://postgres:postgres@127.0.0.1:54329/wifiyka?sslmode=disable'
export BASE_URL='http://localhost:8098'
export LISTEN_ADDR='127.0.0.1:8098'
export STATIC_DIR="$(pwd)/web/dist"
export LEGAL_DOCS_DIR="$(pwd)/deploy/legal"
export OFFLINE_PACKS_DIR="$(pwd)/deploy/offline-packs"
export OFFLINE_PACKS_BASE_URL='/offline-packs'
```

3. Create install-time legal text files:

```bash
mkdir -p deploy/legal
$EDITOR deploy/legal/privacy.txt
$EDITOR deploy/legal/consent-personal-data-email.txt
```

4. Apply migrations:

```bash
make migrate
```

5. Install frontend dependencies and build the app:

```bash
make web-install
cd web && npm test -- --run
cd web && npm run build
```

6. Run backend checks and start the server:

```bash
cd backend && /usr/local/go/bin/go test ./...
make run-backend
```

App URL: `http://localhost:8098`

## Quality Gates

- Frontend tests: `cd web && npm test -- --run`
- Frontend build: `cd web && npm run build`
- Backend tests: `cd backend && /usr/local/go/bin/go test ./...`
- Keep `docs/openapi.yaml` and `web/public/openapi.yaml` in sync

## Repository Notes

- `deploy/offline-packs/sochi.pmtiles` is a demo/offline asset kept in the repo intentionally.
- `backend/internal/static/webdist/` contains embedded frontend artifacts needed for backend fallback serving.
- `deploy/legal/*.txt` is intentionally externalized and gitignored so every installation can inject its own legal text without leaving it in repository history.
- The current deployment templates target `wifi.eval.su`, but the app UI now derives API/OpenAPI links from the active origin so the codebase is easier to reuse.
- API docs are available both as raw spec (`/openapi.yaml`) and as a browser UI (`/api-docs.html`, `/swagger`).

For detailed setup, production release flow, and how to adapt this project into your own map product, use the docs listed above.

# Stack And Reuse

## What this project already solves

- Mobile-first map UX
- Installable PWA shell
- Offline caching for map data and nearby places
- Crowdsourced place creation and voting
- Email-based account recovery and login
- One-domain deployment with API, static assets, offline packs, and OpenAPI

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- MapLibre GL JS
- Dexie / IndexedDB
- Playwright
- Vitest

### Backend

- Go 1.25.8
- chi router
- pgx
- structured JSON API
- migration-driven schema

### Data And Infra

- PostgreSQL
- PostGIS
- PMTiles offline packs
- `nginx`
- `systemd`

## Why it is a good base for map products

- The frontend already understands map center, viewport refresh, offline state, and user-driven geolocation flow.
- The backend already exposes core CRUD plus sync endpoints that fit unstable mobile networks.
- The project keeps OpenAPI in the repo and serves the public copy from the running app.
- The project also exposes a Swagger-like browser UI for API exploration without extra infrastructure.
- The UI structure is already separated into map, activity/history, and about/legal/account areas.

## What to replace for your own app

- Branding, logos, app name
- Legal texts supplied as external `deploy/legal/*.txt` files at install time
- Base URL and production domain
- SMTP settings
- Offline packs and demo data
- Copywriting for place types, voting, and onboarding
- Nominatim strategy if you want a dedicated geocoding provider

## Good product directions on top of this base

- Local business map
- Field audit / inspection map
- Neighborhood guide
- Community-maintained accessibility map
- Events or temporary venue map
- Delivery / pickup / hotspot locator

## Project Layout

- `backend/` API, auth, sync, mail, static serving
- `web/` frontend and tests
- `migrations/` schema and seed data
- `docs/` architecture, OpenAPI, install/deploy docs
- `deploy/` release helpers and production templates

## Practical Reuse Advice

- Keep API contracts in `docs/openapi.yaml` and sync the public copy before every release.
- Treat offline assets and embedded frontend artifacts as generated or deploy-time data, not hand-edited source files.
- Split large files by responsibility early. In this repo the large map-style config and place domain logic are already separated to keep the codebase maintainable.

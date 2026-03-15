# Wifiyka Architecture

## Runtime shape

- `web/` builds a static PWA bundle with Vite.
- `backend/` serves JSON API plus static assets and offline pack files behind one Go HTTP server.
- `nginx` terminates TLS and proxies `wifi.eval.su` to `127.0.0.1:8098`.
- PostgreSQL + PostGIS stores users, sessions, places, votes, reports and sync operations.

## Offline-first model

- The browser receives an anonymous account on first bootstrap and immediately requests geolocation.
- UI shell works from service worker cache even without network.
- User mutations are written into Dexie tables and queued into `outbox`.
- On `online`, `focus`, app start or manual sync, queued operations are POSTed to `/api/v1/sync/outbox`.
- Offline pack metadata comes from `/api/v1/offline/manifest`; pack files are cached on device automatically.

## Versioning and conflict handling

- Mutable tables use `version BIGINT`.
- `PATCH` and `DELETE` operations require the client version.
- Server writes JSON snapshots into `*_versions` tables on insert/update/delete.
- Vote changes also update place aggregates and increment `places.version`.
- Sync responses mark entities as `applied`, `failed` or `conflict`.

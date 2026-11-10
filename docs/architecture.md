# Geographic PWA architecture

The production example is a Wi-Fi map. The reusable foundation is a geographic
PWA: a map, place records, local edits and reconciliation with an authoritative
server. `/tech` explains hotel, campus and park adaptations without presenting
indoor routing or floor detection as existing features.

## Boundaries and deployment

- `web/src/features`: map renderer, places and account UI. `app/` coordinates
  application state; `lib/` owns transport, geolocation and offline helpers;
  `db/` owns the IndexedDB schema. `/tech` is a separate lazy entry: opening it
  does not create an anonymous session or ask for location.
- `backend/internal/httpapi`: HTTP validation, same-origin write boundary,
  request size, cookie transport, health and JSON errors.
- `backend/internal/app`: session, place, vote and sync rules. The small database
  interface accepts a connection pool or a transaction; nested mutations use
  savepoints so sync receipts and effects share one outer transaction.
- PostgreSQL/PostGIS: authoritative entities, spatial queries, versions and
  delivery receipts. PMTiles files: separately provisioned immutable map data.
- One Go process behind local nginx, one database, one origin. The current
  deployment is a single node. It is not advertised as an HA cluster. systemd
  restarts the process; `/readyz` checks the database; shutdown drains requests.

A modular monolith avoids distributed transactions for this workload. A separate
queue or microservice is not needed to deliver a local edit reliably. Multiple
Go instances would require shared rate limiting, centrally stored packs and
operational load testing; the current limiter deliberately lives in one process.

## Local data and offline operation

1. First online visit establishes an anonymous session and saves its public
   profile to IndexedDB. The credential remains in an HttpOnly cookie.
2. The versioned service worker precaches the complete build manifest, including
   lazy routes, the MapLibre module worker and local API documentation. Navigation
   and scripts use the same release. One previous shell is retained for open tabs.
3. A map download is accepted only after length, PMTiles version and SHA-256
   checks. A failed replacement never overwrites the existing cached bytes.
4. A local edit and its outbox operation are committed in one Dexie transaction.
   Personal entities and the queue are selected by the active user ID. Switching
   accounts does not submit another account's pending edits. Logout removes the
   active profile; it preserves device drafts for their original owner.
5. Start, focus, online and manual actions trigger reconciliation. Requests have
   a deadline; local writes and delivery are serialized across tabs with Web Locks (with a
   per-tab promise fallback for older browsers).
   Before delivery the current server user is checked against the queue owner.
6. `/sync/outbox` processes up to 100 operations sequentially. Each operation has
   a durable UUID and a PostgreSQL transaction lock scoped to user + UUID. The
   entity mutation and receipt commit together. A lost response may be retried;
   the receipt prevents a second mutation across tabs or processes.
7. A new receipt fingerprints the entity type, target, operation type and canonical
   JSON payload. Reusing the UUID with different input returns a conflict. Legacy
   receipts predating migration 005 retain their original payload comparison;
   unfinished legacy receipts require operator reconciliation, never blind replay.
8. Permanent validation/version conflicts stay visible and are not automatically
   retried. Transient server failures roll back the current operation. Earlier
   operations in that batch may already have committed, so retry the same IDs.
9. Bootstrap reconciles complete personal lists and bounded nearby coverage,
   preserves unsent drafts and removes synchronized records absent on the server.
   The legacy timestamp changes endpoint is explicitly advisory and deprecated:
   it cannot represent commit order or all deletions and requires bootstrap.

The API is excluded from service-worker caching. This avoids URL-only caches
returning one account's private response after an account switch. Public map
snapshots remain available locally; personal local state is not a substitute for
server authorization. Browser storage is device-local and accessible to someone
with access to that browser profile.

## Security boundaries

Writes validate the session, ownership, enum values, lengths, finite coordinates
and optimistic entity version. Browser cross-origin writes are rejected; body
size is bounded to 1 MiB. Only a loopback reverse proxy may supply the real client
address. All JSON responses use `no-store`. SQL is parameterized. Rate-limit
memory is bounded. Email delivery has connection/deadline limits and rejects
header injection; missing SMTP in production returns an error, not false success.

Secrets stay in external environment files. Install-specific legal texts and map
packages are deployment inputs. Dependency audits run alongside unit, database
integration and browser checks. These controls reduce known risks; they do not
constitute a claim that future defects or vulnerabilities are impossible.

## Product and platform limits

- First visit, address search and email login need a connection. Offline use needs
  a previously saved region. Browser eviction or clearing data can remove it.
- The manifest currently lists all packages in a deployment; it is not a worldwide
  spatial catalogue. Nearby results are bounded to 250 and general lists to 300.
- GPS and compass precision depend on the device and environment. Permission
  prompts require browser support and user action. Chromium device emulation does
  not replace physical Safari/Android testing or an indoor positioning survey.
- Current domain categories and votes are Wi-Fi specific. A hotel adaptation adds
  content/categories and a territory plan; floor routing additionally needs a
  building/route graph and QR, beacon or other positioning strategy.
- Tenant isolation, admin content workflows and multi-site routing are new product
  capabilities, not hidden features of this release.

## Verification and recovery

See [release notes](release-2026-11-10.md), [OpenAPI](openapi.yaml), and
[deployment guide](install-and-deploy.md). Database regression tests run against
real PostGIS and verify concurrent delivery, replay-target rejection and rollback
when receipt persistence fails. Browser tests include a real service worker,
offline reload, local voting and reconnection. Keep database backups and the
previous binary/assets before deployment. Migration 005 is additive; an older
binary can run with the added nullable column for code rollback.

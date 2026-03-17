# Wifiyka

[English version](README.en.md)

Wifiyka это mobile-first карта и PWA для поиска и обмена рабочими Wi-Fi точками. Репозиторий устроен как monorepo: React/Vite frontend, Go API, PostgreSQL/PostGIS, offline pack support через PMTiles и production-шаблоны под `nginx + systemd`.

Этот проект можно использовать не только как карту Wi-Fi, но и как основу для других location-heavy приложений: городских гидов, полевых сервисов, офлайн-карт, каталогов мест, review-карт и любых продуктов, где важны карта, синхронизация и устойчивый mobile UX.

## Скриншоты

Снято локально через headless Google Chrome на собранной версии приложения.

| Карта | Карточка точки |
| --- | --- |
| ![Map home](docs/screenshots/map-home.png) | ![Place sheet](docs/screenshots/place-sheet.png) |
| Nearby hint, офлайн-shell, mobile controls и нижняя навигация. | Share CTA, копирование координат, карточка направления и голосование. |

| Add flow | Активность |
| --- | --- |
| ![Add flow](docs/screenshots/add-flow.png) | ![Activity](docs/screenshots/activity.png) |
| Поиск адреса, форма добавления и promo field в create-flow. | Личные точки и действия в одном mobile-first экране. |

| О приложении и API | Self-hosted API docs |
| --- | --- |
| ![About page](docs/screenshots/about.png) | ![API docs](docs/screenshots/api-docs.png) |
| Установка, аккаунт, legal links и входные точки в API. | Swagger-style UI, который обслуживается с домена приложения без CDN. |

## Что внутри

- React + TypeScript frontend, оптимизированный под mobile и installable PWA
- Go backend с JSON API, session auth, sync endpoints, static serving и SMTP email flows
- PostgreSQL/PostGIS схема с versioned entities и offline-first синхронизацией
- Demo offline map assets и deploy templates под текущую production-форму
- Install-time legal documents через внешние `deploy/legal/*.txt`, а не зашитые тексты в коде
- Публичная OpenAPI-спецификация по `/openapi.yaml`
- Self-hosted Swagger-like API docs UI по `/api-docs.html` с alias-маршрутами `/api-docs` и `/swagger`

## Стек

- Frontend: React, TypeScript, Vite, Tailwind CSS, MapLibre GL JS, Dexie, Playwright, Vitest
- Backend: Go 1.25.8, chi, pgx, goose-compatible SQL migrations
- Data: PostgreSQL, PostGIS, PMTiles
- Deploy: `nginx`, `systemd`, Docker Compose для локальной infra

## Документация

- [English README](README.en.md)
- [Install and deploy guide](docs/install-and-deploy.md)
- [Stack and reuse guide](docs/stack-and-reuse.md)
- [Architecture overview](docs/architecture.md)
- [Community post templates](docs/community-posts.md)
- [OpenAPI source](docs/openapi.yaml)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Быстрый старт

1. Поднимите локальную инфраструктуру:

```bash
make dev-up
```

2. Экспортируйте backend environment:

```bash
export DATABASE_URL='postgres://postgres:postgres@127.0.0.1:54329/wifiyka?sslmode=disable'
export BASE_URL='http://localhost:8098'
export LISTEN_ADDR='127.0.0.1:8098'
export STATIC_DIR="$(pwd)/web/dist"
export LEGAL_DOCS_DIR="$(pwd)/deploy/legal"
export OFFLINE_PACKS_DIR="$(pwd)/deploy/offline-packs"
export OFFLINE_PACKS_BASE_URL='/offline-packs'
```

3. Создайте install-time legal text files:

```bash
mkdir -p deploy/legal
$EDITOR deploy/legal/privacy.txt
$EDITOR deploy/legal/consent-personal-data-email.txt
```

4. Примените миграции:

```bash
make migrate
```

5. Установите frontend dependencies и соберите приложение:

```bash
make web-install
cd web && npm test -- --run
cd web && npm run build
```

6. Прогоните backend checks и запустите сервер:

```bash
cd backend && /usr/local/go/bin/go test ./...
make run-backend
```

URL приложения: `http://localhost:8098`

## Контроль качества

- Frontend tests: `cd web && npm test -- --run`
- Frontend build: `cd web && npm run build`
- Backend tests: `cd backend && /usr/local/go/bin/go test ./...`
- Держите `docs/openapi.yaml` и `web/public/openapi.yaml` синхронизированными

## Что важно про репозиторий

- `deploy/offline-packs/sochi.pmtiles` это намеренно оставленный demo/offline asset.
- `backend/internal/static/webdist/` содержит embedded frontend artifacts для backend fallback serving.
- `deploy/legal/*.txt` намеренно вынесены наружу и игнорируются git, чтобы каждая установка могла подложить свои legal texts без следов в истории репозитория.
- Текущие deploy templates ориентированы на `wifi.eval.su`, но UI теперь выводит API/OpenAPI links от активного origin, поэтому код легче переиспользовать.
- API docs доступны и как raw spec (`/openapi.yaml`), и как browser UI (`/api-docs.html`, `/swagger`).

Для установки, production release flow и адаптации проекта под собственный map product используйте документы выше.

# Вайфайка

Вайфайка — mobile-first web app / PWA для crowdsourced-карты бесплатных Wi‑Fi точек. Проект построен как monorepo: статический React/Vite frontend, Go backend, PostgreSQL/PostGIS, офлайн-first sync через Dexie/outbox, legal pages и деплой под `nginx + systemd`.

## Стек

- Frontend: React, TypeScript, Vite, Tailwind CSS, Radix Icons/Dialog, MapLibre GL JS, Dexie, service worker, web manifest
- Backend: Go 1.24, chi, pgx, goose-compatible SQL migrations, structured logging
- DB: PostgreSQL + PostGIS, UUID-only PK/FK, `version BIGINT` on mutable tables, snapshot version tables
- Deploy: `nginx`, `systemd`, local docker compose for PostGIS + Mailpit

## Структура

- `backend/` — Go API, auth/session, sync, SMTP, static serving
- `web/` — React PWA
- `migrations/` — goose SQL migrations + seed
- `docs/` — architecture и OpenAPI
- `deploy/` — env templates, compose, nginx/systemd templates, release script

## Быстрый старт локально

1. Поднять локальную инфраструктуру:

```bash
make dev-up
```

2. Экспортировать окружение для backend:

```bash
export DATABASE_URL='postgres://postgres:postgres@127.0.0.1:54329/wifiyka?sslmode=disable'
export BASE_URL='http://localhost:8098'
export LISTEN_ADDR='127.0.0.1:8098'
export STATIC_DIR='/home/sergei/wifiyka/web/dist'
export OFFLINE_PACKS_DIR='/home/sergei/wifiyka/offline-packs'
export OFFLINE_PACKS_BASE_URL='/offline-packs'
```

3. Применить миграции:

```bash
make migrate
```

4. Установить frontend зависимости, прогнать тесты и собрать `dist`:

```bash
make web-install
make web-test
make web-build
```

5. Прогнать backend тесты и запустить API:

```bash
make backend-test
make run-backend
```

После этого приложение будет доступно на `http://localhost:8098`.

## Тесты

```bash
make backend-test
make web-test
```

Frontend тестирует outbox/offline helpers и geolocation fallback. Backend тестирует токены и HTTP error/cookie contract.

## PWA и офлайн

- `web/public/manifest.webmanifest` и `web/public/sw.js` делают приложение installable
- shell кэшируется service worker'ом
- при bootstrap приложение сразу просит геолокацию
- при разрешении геопозиции приложение запрашивает nearby точки и автоматически пробует скачать офлайн-пакеты в радиусе 100 км
- пользовательские изменения пишутся в Dexie (`my_places`, `my_votes`, `outbox`, `regions`)
- при `online`, `focus` и ручном sync outbox отправляется на `/api/v1/sync/outbox`

## Миграции и БД

Основные таблицы:

- `users`, `user_emails`, `sessions`, `email_magic_links`
- `places`, `place_votes`, `place_reports`
- `sync_operations`
- version tables: `users_versions`, `user_emails_versions`, `places_versions`, `place_votes_versions`

Все PK/FK — UUID. Для `places.geom` используется `GEOGRAPHY(POINT, 4326)`.

## Офлайн-паки

- backend читает pack metadata из `OFFLINE_PACKS_DIR`
- endpoint `/api/v1/offline/manifest` отдаёт список `.pmtiles`
- сами pack files доступны по `/offline-packs/*`
- публичная OpenAPI-спецификация должна лежать в `web/public/openapi.yaml` и раздаваться по `/openapi.yaml`
- release flow может либо использовать `STATIC_DIR`, либо запекать frontend в Go через копирование `web/dist` в `backend/internal/static/webdist`

## Legal pages

- `/privacy` — политика конфиденциальности
- `/consent/personal-data-email` — отдельное согласие на обработку email

В текстах стоят placeholders для наименования, адреса и email оператора. Их нужно заменить перед окончательным legal sign-off.

## Прод-сборка

```bash
cd deploy
./build-release.sh
```

`build-release.sh` перед сборкой синхронизирует `docs/openapi.yaml` -> `web/public/openapi.yaml`.

Или пошагово:

```bash
make web-build
make prepare-static
cd backend && /usr/local/go/bin/go build -o ../dist/wifiyka-server ./cmd/server
```

## Прод-деплой под `wifi.eval.su`

1. Разложить проект в `/var/www/sergey/wifiyka/current`
2. Скопировать `deploy/.env.example` в `deploy/.env` и подставить реальные значения
3. Создать БД `wifiyka`, применить миграции
4. Скопировать `deploy/systemd/wifiyka.service` в `/etc/systemd/system/`
5. Скопировать `deploy/nginx/wifi.eval.su.conf` в `/etc/nginx/vhosts/sergei/`
6. Выпустить сертификат:

```bash
sudo certbot --nginx -d wifi.eval.su
```

7. Перезагрузить `nginx` и `systemd` unit

Актуальные публичные URL после деплоя:

- `https://wifi.eval.su/api/v1`
- `https://wifi.eval.su/openapi.yaml`

## Переменные окружения

См. `deploy/.env.example`.

Ключевые:

- `DATABASE_URL`
- `BASE_URL`
- `LISTEN_ADDR`
- `STATIC_DIR`
- `OFFLINE_PACKS_DIR`
- `OFFLINE_PACKS_BASE_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_FROM_NAME`

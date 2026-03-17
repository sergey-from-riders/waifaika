# Contributing

## Перед началом

- Проверьте [README.md](README.md), [docs/install-and-deploy.md](docs/install-and-deploy.md) и [docs/stack-and-reuse.md](docs/stack-and-reuse.md).
- Для backend нужен Go `1.25.8+` и PostgreSQL/PostGIS.
- Для frontend нужен Node.js `22+` и `npm`.

## Локальный цикл разработки

1. Поднимите инфраструктуру: `make dev-up`
2. Примените миграции: `make migrate`
3. Установите frontend-зависимости: `make web-install`
4. Запускайте backend и frontend по отдельности либо через проектные `make`-цели.

## Обязательные проверки

- Frontend: `cd web && npm test -- --run`
- Frontend build: `cd web && npm run build`
- Backend: `cd backend && /usr/local/go/bin/go test ./...`
- Если менялся API contract или `docs/openapi.yaml`, синхронизируйте `web/public/openapi.yaml` до сборки и деплоя.

## Что считать хорошим PR

- Нет секретов, локальных путей и временных артефактов в diff.
- Документация и примеры окружения обновлены вместе с кодом.
- Крупные изменения разбиты по ответственности, без разрастания файлов без причины.
- Если меняется поведение API, обновлены тесты и OpenAPI.

## Деплой

- Production flow описан в [docs/install-and-deploy.md](docs/install-and-deploy.md).
- Systemd template лежит в [deploy/systemd/wifiyka.service](deploy/systemd/wifiyka.service).

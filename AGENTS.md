# Iteration Rule

После каждой законченной итерации обязательно:

1. Прогнать релевантные проверки.
   Для frontend: `cd web && npm test -- --run` и `npm run build`.
   Для backend: `cd backend && /usr/local/go/bin/go test ./...`.
   Если менялся e2e-слой: дополнительно прогнать Playwright smoke.
2. Обновить [docs/iteration-log.md](/home/sergei/wifayka/docs/iteration-log.md):
   зафиксировать `done`, `next`, `risks`, дату и краткий результат прогонов.
3. В отчёте явно перечислить изменённые файлы.
4. Если менялся API contract или `docs/openapi.yaml`, синхронизировать публичную копию `web/public/openapi.yaml` перед сборкой/деплоем.
5. Не оставлять сломанный build или failing tests между итерациями.
6. Если задача не помечена как локальная-only и все проверки зелёные, сразу выкатывать на прод:
   `hellor8g@185.225.32.121:/var/www/sergey/wifiyka/current`.
   После выката обязательно пересобрать релиз на сервере, обновить процесс `wifiyka.service` и проверить `https://wifi.eval.su/healthz`.

# Repo Notes

- Источник требований на пакет от `2026-03-15`: [docs/2026-03-15-remaining-work-spec.md](/home/sergei/wifayka/docs/2026-03-15-remaining-work-spec.md)
- Публичная OpenAPI-копия должна обслуживаться по `/openapi.yaml`
- Актуальный systemd template в репозитории: `deploy/systemd/wifiyka.service`

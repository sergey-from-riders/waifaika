# Iteration Log

## 2026-03-15

### Done
- Создан файл для обязательной фиксации итераций.

### Next
- Заполнять запись после каждого завершённого пакета изменений.

### Risks
- Без ручного обновления лог быстро теряет ценность, поэтому правило продублировано в `AGENTS.md`.

## 2026-03-15 11:42 MSK

### Done
- Исправлен `BottomSheet`: drag работает только с grip-зоны, кнопка закрытия снова кликабельна.
- Добавлен регрессионный тест на `BottomSheet` и тесты на offline pack selection + vote overlay.
- Офлайн-карта теперь выбирает актуальный PMTiles pack по bounds, умеет переключаться на новый pack при смещении центра карты и сохраняет bounds у скачанных pack'ов.
- Добавлена кнопка очистки офлайн-кэша с подтверждением и показом объёма кэша.
- Публичная OpenAPI-копия синхронизирована в `web/public/openapi.yaml`, service worker её кэширует, release script копирует spec перед сборкой.
- Репозиторий приведён в порядок: добавлен проектный `AGENTS.md`, актуализирован `README.md`, исправлен systemd template `deploy/systemd/wifiyka.service`.

### Next
- Если откроется доступ на установку npm dev dependency без `EPERM`, добавить и реально прогнать Playwright smoke из ТЗ на headless Chrome.
- После следующего пакета снова обновить этот лог и перечислить новые файлы/прогоны.

### Risks
- Полноценный browser e2e через Playwright в этой среде пока не был прогнан: `npm install` внешней зависимости упирается в `EPERM` на registry fetch.
- Backend integration tests по delete vote пока ограничены router-level проверками; транзакционные сценарии БД стоит усилить отдельными integration tests при следующем пакете.

## 2026-03-15 12:11 MSK

### Done
- Add-flow дополнен редактируемым полем `Адрес / ориентир`; адрес из reverse geocoding теперь переносится в форму и сохраняется в `description`.
- Исходный spec `docs/2026-03-15-remaining-work-spec.md` актуализирован и расширен дополнительным пакетом UX/offline требований, которые пришли после первичной фиксации ТЗ.
- Карточка точки доведена до целевого порядка: адрес под заголовком, сразу затем `Скопировать координаты`, затем блок направления, затем голосование и промо; текстовые подписи `Добавлено пользователем` и `Поделитесь точкой с друзьями` не возвращены.
- Viewport-aware офлайн покрытие доведено: при смещении/масштабировании карта подгружает данные для текущего viewport, ранее сохранённые точки внутри того же pack больше не затираются, а восстановление из кэша выбирает релевантный регион под текущий центр карты.
- E2E smoke переведён в self-contained режим без `vite preview`: Playwright-конфиг теперь работает через `http://wifiyka.test` и раздачу собранного `dist` из `route.fulfill`, чтобы не зависеть от запрещённого в этой среде локального HTTP-сервера.
- Добавлены/усилены проверки на порядок карточки, адрес точки и базовые smoke-сценарии deep link / add-flow / offline clear / API block.

### Next
- При первом доступе к среде без ограничений на headless Chromium прогнать полный `npx playwright test` по четырём мобильным профилям и зафиксировать итоговый smoke.
- Если понадобится release-gate уровня ТЗ, отдельно снять Lighthouse `Accessibility / Best Practices / SEO` на целевой mobile matrix.

### Risks
- Browser e2e здесь упирается не в код, а в системное ограничение среды: запуск Chromium падает с `FATAL:content/browser/sandbox_host_linux.cc:41` и `Operation not permitted`.
- Manual QA и Lighthouse из ТЗ в этой CLI-среде не заменены полноценным реальным прогоном на Safari/Android-устройствах.

## 2026-03-15 12:23 MSK

### Done
- Playwright smoke-контур окончательно переведён на реальный preview-server `http://127.0.0.1:4173` вместо фиктивного `wifiyka.test`; mock API теперь корректно перехватывает `session/bootstrap`, `sync/bootstrap`, votes и add-flow.
- Добавлен guard в `registerServiceWorker()`: приложение больше не падает, если `navigator.serviceWorker` объявлен, но реализации `register/controller` нет.
- Viewport-aware офлайн-логика и выбор pack'ов остались в силе, но теперь подтверждены реальным browser smoke на мобильной матрице.
- Прогнаны и успешно завершены:
  - `cd backend && /usr/local/go/bin/go test ./...`
  - `cd web && npm test -- --run`
  - `cd web && npm run build`
  - `cd web && npm run test:e2e`
- Итог smoke: `12/12` сценариев зелёные на `iPhone 13 light/dark` и `Pixel 7 light/dark`.

### Next
- Если нужен release-gate строго по ТЗ, отдельно снять Lighthouse `Accessibility / Best Practices / SEO` на целевой mobile matrix.
- Отдельно прогнать manual QA на реальных Safari / Android устройствах с проверкой гео-permission reset и installed PWA.

### Risks
- В `git` всё ещё нет старой истории проекта: текущее состояние можно зафиксировать коммитом, но полноценного change history за предыдущие итерации нет.
- Manual QA и Lighthouse остаются внешними к этой CLI-среде задачами; автоматические smoke их не заменяют.

## 2026-03-15 13:47 MSK

### Done
- Локальный пакет изменений выкачен на `hellor8g@185.225.32.121:/var/www/sergey/wifiyka/current`.
- На сервере выполнен `./deploy/build-release.sh`, пересобраны frontend assets, embedded static и `dist/wifiyka-server`.
- Продовый процесс обновлён через `systemd`: `wifiyka.service` поднялся с новым `MainPID`.
- Post-deploy проверка успешна:
  - `https://wifi.eval.su/healthz` -> `200 {"status":"ok"}`
  - `https://wifi.eval.su/openapi.yaml` -> `200`
  - `https://wifi.eval.su/` -> новый `index` и свежий asset bundle.

### Next
- Отдельно прогнать manual QA на реальном мобильном устройстве по карте, add-flow, шарингу и очистке офлайна.
- Если нужен строгий release-gate из ТЗ, снять Lighthouse `Accessibility / Best Practices / SEO`.

### Risks
- Первый внешний запрос к `openapi.yaml` попал в короткое окно рестарта и дал `404`, после стабилизации процесса endpoint отвечает штатно.
- Предыдущая история проекта в git отсутствовала до этого дня; prod теперь выровнен по текущему локальному baseline, но старые изменения не восстановлены как commits.

## 2026-03-15 14:29 MSK

### Done
- Добавлен прямой адресный поиск через Nominatim `search`: в add-flow появился отдельный input `Найти адрес на карте`, который переносит draft-координаты и центр карты к найденной точке без отказа от существующего сценария с ручным перемещением карты.
- Viewport/offline поток теперь явно сигнализирует о фоновой докачке: вокруг компактной кнопки кэша на карте появился animated status ring со статусами `caching / cached / error`, а сохранение точек и pack'ов продолжает происходить на каждом успешном refresh покрытия.
- Усилен nearest hint: карточка получила более стабильную ширину, дополнительный фон и больше не обрезает название одной строкой.
- Компас усилен в двух местах:
  - авто-повтор инициализации сенсоров не прекращается после первой неудачной попытки;
  - для iPhone запрашиваются и `DeviceOrientation`, и `DeviceMotion`, а heading дополнительно нормализуется с учётом `screen.orientation.angle`.
- Прогнаны и успешно завершены:
  - `cd backend && /usr/local/go/bin/go test ./...`
  - `cd web && npm test -- --run`
  - `cd web && npm run build`
  - `cd web && npm run test:e2e`
- Итог smoke снова зелёный: `12/12` на `iPhone 13 light/dark` и `Pixel 7 light/dark`.

### Next
- Проверить compass-flow на реальном устройстве с живыми sensor events, потому что эмуляторы и Playwright не отдают реальную телеметрию гироскопа.
- Если потребуется, вынести адресный search из form-step ещё и в pick-step как отдельный floating control поверх карты.

### Risks
- Даже после усиления кодовой ветки компас на отдельных браузерах зависит от реальной выдачи sensor events устройством; это нельзя полностью верифицировать внутри headless/e2e окружения.
- Фоновая индикция кэша показывает lifecycle сохранения покрытия, но не отражает процент скачивания pack-файла, потому что текущий pipeline загружает файл целиком одним запросом.

## 2026-03-17 21:58 MSK

### Done
- Репозиторий подготовлен под публичный GitHub: добавлены `README`, `CONTRIBUTING`, `SECURITY`, отдельные docs по установке/деплою и стеку, `CI`, `Dependabot`, `.gitattributes`, `.npmrc`, очищены tracked `*.tsbuildinfo`.
- Для API добавлен Swagger-like UI: статическая страница `web/public/api-docs.html`, alias-маршруты `/api-docs` и `/swagger`, ссылка на UI выведена в раздел API внутри приложения.
- Усилен security baseline: строгий JSON decode с запретом неизвестных полей, базовые security headers, серверные timeout’ы, более строгие права на offline dir, chi обновлён до `v5.2.2`.
- Крупные файлы разнесены по ответственности:
  - backend `places.go` разделён на query / mutation / votes / sync файлы;
  - map style-конфигурация вынесена из `MapCanvas` в отдельный модуль.
- Go toolchain baseline поднят до `go1.25.8` через `toolchain` directive, `Makefile`, CI и release script; `govulncheck` на этом toolchain стал зелёным.
- Пакет выкачен на `hellor8g@185.225.32.121:/var/www/sergey/wifiyka/current`, на сервере выполнен `./deploy/build-release.sh`, процесс `wifiyka.service` перевыпущен через `Restart=always` с новым `MainPID`.
- Проверки завершены успешно:
  - `cd backend && GOTOOLCHAIN=go1.25.8+auto /usr/local/go/bin/go test ./...`
  - `cd backend && GOTOOLCHAIN=go1.25.8+auto ../tmp/bin/govulncheck ./...`
  - `cd backend && ../tmp/bin/gosec ./...`
  - `cd web && npm_config_registry=https://registry.npmjs.org/ npm audit --json`
  - `cd web && npm test -- --run`
  - `cd web && npm run build`
  - `cd web && npm run test:e2e`
- Post-deploy проверка успешна:
  - `https://wifi.eval.su/healthz` -> `200 {"status":"ok"}`
  - `https://wifi.eval.su/openapi.yaml` -> `200`
  - `https://wifi.eval.su/api-docs.html` -> новая API docs page
  - `https://wifi.eval.su/swagger` -> `307 /api-docs.html`

### Next
- Если потребуется убрать внешнюю зависимость от CDN, зафиксировать локальную/self-hosted поставку `swagger-ui-dist` вместо загрузки с `jsdelivr`.
- Отдельно прогнать manual QA на мобильном устройстве по `/api-docs.html`, add-flow и картографическим сценариям уже на проде.

### Risks
- Текущий Swagger-like UI загружает `swagger-ui-dist` с CDN во время открытия страницы; при блокировке внешних CDN raw-spec `/openapi.yaml` останется доступен, но визуальный UI может не отрисоваться.
- Первый серверный build на новой версии Go toolchain скачивает `go1.25.8`; для изолированных окружений без внешнего доступа этот toolchain стоит предустановить отдельно.

## 2026-03-17 22:32 MSK

### Done
- Swagger UI переведён на self-hosted поставку: `swagger-ui-dist` теперь копируется локальным build-скриптом в `web/public/swagger-ui`, страница `/api-docs.html` больше не зависит от CDN.
- Place sheet дочищен по UI: убран видимый grip-блок сверху, drag-зона стала невидимой, share-action переработан из маленькой icon-only кнопки в полноценный CTA.
- Legal-тексты вынесены из hardcoded React-страниц в отдельные install-time файлы `deploy/legal/privacy.txt` и `deploy/legal/consent-personal-data-email.txt`, backend теперь отдаёт их как raw `text/plain` через `/legal/...`.
- Обновлены install/deploy инструкции и `.env.example`: добавлен `LEGAL_DOCS_DIR`, legal-файлы теперь описаны как обязательный шаг инсталляции и не хранятся в git history.
- Локальный `backend/internal/static/webdist` пересинхронизирован с актуальным `web/dist`, чтобы embedded shell не отставал от публичной сборки.
- Пакет выкачен на `hellor8g@185.225.32.121:/var/www/sergey/wifiyka/current`, на сервере выполнен `./deploy/build-release.sh`, `wifiyka.service` перезапущен с новым `MainPID`, а runtime `.env` дополнен `LEGAL_DOCS_DIR=/var/www/sergey/wifiyka/current/deploy/legal`.
- Проверки завершены успешно:
  - `cd backend && GOTOOLCHAIN=go1.25.8+auto /usr/local/go/bin/go test ./...`
  - `cd web && npm test -- --run`
  - `cd web && npm run build`
  - `cd web && npm run test:e2e`
- Post-deploy проверка успешна:
  - `https://wifi.eval.su/healthz` -> `200 {"status":"ok"}`
  - `https://wifi.eval.su/api-docs.html` -> self-hosted Swagger UI
  - `https://wifi.eval.su/swagger` -> `307 /api-docs.html`
  - `https://wifi.eval.su/legal/privacy.txt` -> `200 text/plain`
  - `https://wifi.eval.su/legal/consent-personal-data-email.txt` -> `200 text/plain`

### Next
- Снять локальные headless-скриншоты основных сценариев и встроить их в `README`, чтобы репозиторий выглядел как готовый showcase.
- После скриншотов зафиксировать финальный docs/README commit.

### Risks
- На проде сейчас лежат install-time placeholder legal files; перед публичным запуском их нужно заменить на реальные тексты оператора.
- Legal docs не попадают в build-артефакты намеренно и зависят от runtime `LEGAL_DOCS_DIR`; если каталог не создан, UI покажет состояние `Документ не установлен`.

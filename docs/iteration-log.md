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

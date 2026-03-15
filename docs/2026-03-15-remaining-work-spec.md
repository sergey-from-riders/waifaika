# ТЗ на оставшийся пакет доработок `wifiyka`

Дата фиксации требований: `2026-03-15`  
Статус документа: `рабочее ТЗ на следующий пакет реализации`  
Основание: текущее состояние `https://wifi.eval.su` и невыполненный остаток после последних UI/PWA/карточек/роутов.

## 1. Цель документа

Этот документ фиксирует:

1. Что уже реализовано и не должно быть сломано.
2. Что именно осталось доделать в следующем пакете.
3. Какие есть жесткие платформенные ограничения на Web/PWA в марте 2026 года.
4. Какие требования обязательны к автоматическим и ручным тестам.
5. Какие критерии приёмки считаются обязательными до выката.

Документ составлен после проверки актуальных официальных источников по состоянию на `15 марта 2026 года`.

## 2. Что уже есть в продукте и считается базой

Ниже перечислено текущее поведение, которое считается уже принятым и не должно регрессировать:

- URL продукта: `https://wifi.eval.su`
- Основной экран: полноэкранная карта.
- Верхняя ненавязчивая подпись: `Карта Wi-Fi`.
- Нижняя навигация: `Карта`, `Мои точки и голоса`, `О нас`.
- Deep link на место уже переведён на роут вида `/place/:placeId`.
- Шаринг места уже ориентирован на ссылку, а не на копирование названия.
- Поле `Промо` уже переведено в `textarea`.
- Под карточкой направления уже убрана надпись вида `Ваш голос: ...`.
- Карточка точки открывается как bottom sheet.
- Ближайшая точка показывается подсказкой на карте.
- Есть тёмная/светлая тема.
- Есть PWA shell, service worker, offline packs, встроенная статика через Go backend.

## 3. Жёсткие платформенные ограничения, подтверждённые по официальным источникам

### 3.1 Геолокация

Подтверждено по MDN и Chrome Lighthouse:

- Geolocation API работает только в `secure context`, то есть по HTTPS.
- Браузер показывает permission prompt только когда реально вызывается `getCurrentPosition()` или `watchPosition()`.
- Доступ может быть дополнительно ограничен заголовком `Permissions-Policy`.
- В актуальных рекомендациях Chrome geolocation **нельзя считать корректным UX**, если запрос вызывается на page load.
- Lighthouse Best Practices отдельно штрафует страницу, если геолокация запрашивается при загрузке.

Практический вывод для продукта:

- Релизный flow должен оставаться **через явное действие пользователя**.
- Текст CTA должен прямо объяснять, что действие запросит геопозицию.
- Автозапрос гео "сразу при открытии" не может считаться гарантированным и не должен быть критерием приёмки, потому что это конфликтует и с браузерными ограничениями, и с Lighthouse.

### 3.2 Device Orientation / Compass

Подтверждено по MDN:

- Некоторые user agents требуют отдельное разрешение на orientation/motion.
- `DeviceOrientationEvent.requestPermission()` и `DeviceMotionEvent.requestPermission()` должны вызываться из user gesture, например внутри `click`.

Практический вывод:

- Любая логика компаса/стрелки должна запускаться только после явного действия пользователя.
- Нельзя считать поведение компаса идентичным на Safari, Chrome Android и любых WebView.

### 3.3 Web Share API

Подтверждено по MDN:

- `navigator.share()` доступен только в `secure context`.
- Для вызова нужна `transient activation`, то есть фактический пользовательский клик.
- API не является Baseline на всех браузерах.

Практический вывод:

- Релизный шаринг обязан иметь fallback на `clipboard.writeText()`.
- В share payload для места должен использоваться прежде всего `url`.
- Нельзя строить критический UX на предположении, что native share всегда доступен.

### 3.4 PWA install prompt

Подтверждено по web.dev:

- `beforeinstallprompt` поддерживается не везде.
- На iOS установка идёт через Safari и Add to Home Screen, а не через Chromium install prompt.
- `prompt()` у сохранённого install event можно вызвать только один раз.

Практический вывод:

- Install UX должен оставаться прогрессивным улучшением, а не обязательной частью пользовательского пути.

### 3.5 Service worker / offline

Подтверждено по web.dev:

- Service worker не контролирует самый первый load до активации.
- Нельзя привязывать core-функциональность только к service worker.
- При обновлении service worker необходимо аккуратно управлять кэшем и не ломать текущую сессию.

Практический вывод:

- Core карта и данные должны продолжать работать и без предположения, что SW уже активировался на самом первом визите.
- Любые новые офлайн-фичи должны иметь fallback через IndexedDB / Cache Storage / уже прогретые данные.

### 3.6 Lighthouse / mobile usability

Подтверждено по Chrome Lighthouse:

- Tap targets считаются проблемой, если они меньше `48x48 px`.
- Наложение интерактивных элементов ухудшает mobile-friendly и SEO score.
- Accessibility score считается как weighted average pass/fail аудитoв.

Практический вывод:

- Все интерактивные элементы в нижней навигации, карточке, CTA и picker-flow должны иметь безопасный mobile hit area.
- Нельзя добавлять новый UI, который ухудшит `Accessibility`, `Best Practices` или `SEO`.

### 3.7 Новое состояние платформы в 2026 году

Подтверждено по Chrome for Developers:

- В Chrome `144` появился новый `<geolocation>` HTML element, опубликованный `13 января 2026 года`.
- Он улучшает permission flows и recovery, но это **Chrome-specific modern capability**, а не кросс-браузерная база.

Практический вывод:

- В текущий продовый релиз `wifiyka` **не закладывать зависимость** на `<geolocation>` как на основной production-путь.
- Разрешено только как отдельный future spike / progressive enhancement за feature detection.
- Основной релизный путь остаётся через `navigator.geolocation` + fallback UX.

## 4. Приоритетный scope следующего пакета

Ниже перечислено всё, что должно быть реализовано в следующем заходе.

## 5. Пакет A. Переименование add-flow и UI-копирайта

### 5.1 Цель

Убрать в UI формулировку `Добавить точку` и заменить её на продуктовую формулировку, которую пользователь просил.

### 5.2 Обязательные изменения

Нужно заменить:

- floating action `+`
- `aria-label`
- доступные имена кнопок для screen readers
- любые подписи в тестах
- тексты sheet / form / CTA / empty states

### 5.3 Целевые тексты

Нужно использовать:

- Основной action label: `Добавить Wi-Fi`
- Русская формулировка внутри модалок/описаний: `Добавить Вайфай`

### 5.4 Где это должно измениться

- Нижний floating action button
- `aria-label` floating action button
- Тексты в add-flow
- Заголовок формы
- UI-тесты на кнопки и навигацию
- Любые snapshot/assertion строки

### 5.5 Критерии приёмки

- На проде больше не встречается строка `Добавить точку`.
- В DOM-accessibility tree у кнопки корректное имя.
- UI-тесты обновлены и проходят.

## 5A. Пакет A2. Полный редизайн нижней навигации

### 5A.1 Цель

Полностью переверстать нижнюю навигацию так, чтобы она визуально выглядела не как обычная таб-панель, а как более дорогой mobile-first блок с отдельными крупными кнопками.

Основание:

- текущие кнопки слишком плотные;
- иконки читаются слабо;
- визуально кнопки воспринимаются как один общий массив, а не как отдельные действия;
- пользователь отдельно запросил стиль ближе к `Liquid Glass`, но без перегруза и без потери контраста.

### 5A.2 Обязательная композиция

Нижняя навигация должна остаться из трех основных маршрутов:

- `Карта`
- `Мои точки и голоса`
- `О нас`

Floating action для добавления Wi-Fi остаётся отдельным action-элементом, не смешивается с route tabs.

### 5A.3 Обязательные визуальные требования

Нужно сделать:

- кнопки заметно крупнее по высоте и ширине;
- у каждой кнопки свой собственный полупрозрачный фон;
- между кнопками должны быть ощутимые расстояния;
- иконки должны стать крупнее;
- текст должен остаться читаемым на одном взгляде;
- active state должен быть заметен без агрессивных теней;
- фон каждой кнопки должен быть отдельным, а не как будто это просто текст внутри единой полосы.

### 5A.4 Стиль и материалы

Визуальное направление:

- аккуратный `liquid glass` / `frosted translucent` feel;
- не использовать тяжелые блюры, которые жрут батарею и контраст;
- не допускать мутного серого месива;
- на светлой теме прозрачность должна быть лёгкой и чистой;
- на тёмной теме прозрачность должна оставаться контрастной.

Допустимая реализация:

- полупрозрачные индивидуальные карточки-кнопки;
- тонкая граница;
- мягкий внутренний или внешний контраст;
- минимальный blur либо вообще без blur, если контраст лучше без него.

Запрещено:

- делать навигацию слишком плоской;
- делать все три кнопки слитыми в один контейнер без внутренних зазоров;
- использовать тяжёлые drop shadow как основной способ отделения.

### 5A.5 Иконки

Для вкладки `Карта` нельзя использовать иконку дома.

Нужно:

- заменить текущую иконку дома на иконку карты;
- использовать либо готовую подходящую SVG, либо собственную SVG-иконку карты;
- иконка должна быть крупной и визуально понятной на мобильном экране.

Для остальных:

- `Мои точки и голоса` должна остаться визуально читаемой даже с длинной подписью;
- `О нас` должно иметь крупную и спокойную info-иконку.

### 5A.6 Размеры и ergonomics

Нужно ориентироваться на mobile touch guidelines:

- каждая интерактивная зона не меньше `48x48 px`;
- фактическая высота кнопок должна быть заметно больше минимального порога;
- расстояние между кнопками должно исключать случайные мисклики большим пальцем;
- в нижней части должен учитываться `safe area inset`.

Практически:

- целевая визуальная высота nav-item ближе к `56-64 px` и выше, если это нужно для читаемости;
- иконки ближе к `20-24 px` и выше, если это улучшает узнаваемость;
- подписи не должны выглядеть как мелкая сервисная подпись.

### 5A.7 Поведение active / inactive

Active tab должен отличаться:

- цветом иконки;
- цветом текста;
- чуть более плотным фоном;
- возможным увеличением визуального веса.

Inactive tab:

- остаётся хорошо читаемым;
- не превращается в полупрозрачный мусор;
- не теряется на тёмной карте.

### 5A.8 Acceptance criteria

- Визуально каждая nav-кнопка выглядит как отдельный элемент.
- Иконка `Карта` больше не дом, а карта.
- Кнопки стали крупнее.
- Расстояния между кнопками увеличены.
- На светлой и тёмной теме навигация остаётся контрастной.
- Lighthouse не теряет баллы по `Accessibility`, `Best Practices`, `SEO`.
- Tap targets не падают ниже рекомендуемого минимума.

## 6. Пакет B. Голосование: один голос, смена решения, снятие голоса

### 6.1 Цель

Сделать голосование полностью консистентным на трех уровнях:

- UI
- sync/offline слой
- backend/API/DB

### 6.2 Бизнес-правило

На одну точку пользователь может иметь только один активный голос:

- либо `works`
- либо `not_works`
- либо отсутствие голоса

### 6.3 Требуемое поведение в UI

#### Создание голоса

- Если голоса нет:
  - тап по `Работает` создаёт голос `works`
  - тап по `Не работает` создаёт голос `not_works`

#### Смена решения

- Если текущий голос `works`:
  - тап по `Не работает` должен переключить голос на `not_works`
- Если текущий голос `not_works`:
  - тап по `Работает` должен переключить голос на `works`

#### Снятие голоса

- Если текущий голос `works`:
  - повторный тап по активной кнопке `Работает` снимает голос полностью
- Если текущий голос `not_works`:
  - повторный тап по активной кнопке `Не работает` снимает голос полностью

### 6.4 Требуемое поведение счётчиков

- Счётчики на кнопках должны обновляться оптимистически.
- При создании голоса:
  - нужный счётчик +1
- При смене решения:
  - старый счётчик -1
  - новый счётчик +1
- При снятии голоса:
  - текущий счётчик -1

### 6.5 Ограничение по UI

Нельзя снова выводить под стрелкой техническую строку вида:

- `Ваш голос: ...`
- `synced`
- `pending`
- `conflict`

Технический sync status допустим только в разделе `Мои точки и голоса`, но не в карточке точки под направлением.

### 6.6 Backend-правило

Backend должен обеспечивать консистентность независимо от клиента:

- один пользователь не может иметь больше одного активного голоса на место
- повторный выбор того же голоса должен уметь удалять голос
- update/delete должны проходить через optimistic locking по `version`

## 7. Пакет C. Изменения API и backend для снятия голоса

### 7.1 Обязательный API

Нужно поддержать:

- `POST /api/v1/places/{placeId}/vote`
  - создать или изменить голос
- `DELETE /api/v1/places/{placeId}/vote`
  - удалить мой голос
- `GET /api/v1/places/{placeId}/my-vote`
  - получить текущий голос

### 7.2 DELETE contract

`DELETE /api/v1/places/{placeId}/vote`

Request body:

```json
{
  "version": 3
}
```

Response:

```json
{
  "status": "deleted",
  "place_id": "uuid",
  "place_vote_id": "uuid"
}
```

Если голос не найден:

- либо `404 not_found`
- либо идемпотентный delete с `status=already_deleted`

Рекомендуемое поведение для текущего продукта:

- для прямого API вызова: `404`
- для sync outbox на сервере: обрабатывать идемпотентно, если операция уже применена

### 7.3 Изменения backend service interface

Нужно добавить метод:

```go
DeleteVote(ctx context.Context, sessionToken, placeID string, version int64) error
```

И аналог actor-level метод для sync pipeline.

### 7.4 Изменения в транзакционной логике

При удалении голоса сервер обязан в одной транзакции:

1. заблокировать `places` строку `FOR UPDATE`
2. заблокировать `place_votes` строку `FOR UPDATE`
3. проверить ownership по `user_id`
4. проверить `version`
5. вычислить delta:
   - если удаляется `works` -> `works_count - 1`
   - если удаляется `not_works` -> `not_works_count - 1`
6. удалить строку из `place_votes`
7. обновить `places`
8. записать snapshot в `place_votes_versions` с `version_action = delete`
9. записать snapshot в `places_versions` c `version_action = update`

### 7.5 Ограничение по счётчикам

Сервер не должен позволять отрицательные счётчики.

### 7.6 Обновление OpenAPI

Нужно обновить:

- `docs/openapi.yaml`
- request/response schema для `DELETE /vote`
- sync operation schemas
- error cases:
  - `version_conflict`
  - `not_found`
  - `unauthorized`

## 8. Пакет D. Изменения БД и version history

### 8.1 PostgreSQL schema

Новая таблица не требуется.

### 8.2 Обязательное поведение version history

Удаление голоса должно писать snapshot в:

- `place_votes_versions`

С полями:

- тот же `place_vote_id`
- incremented `version`
- `version_action = delete`
- полный `version_snapshot`
- `version_created_by_user_id`

### 8.3 Почему это обязательно

Без этого текущее требование проекта про version history будет неполным:

- insert есть
- update есть
- delete для голоса должен быть симметрично отражён

## 9. Пакет E. Offline / sync / Dexie для снятия голоса

### 9.1 Проблема

Сейчас локальная модель голоса ориентирована только на upsert. Для корректного удаления offline этого недостаточно.

### 9.2 Требование к локальной модели

Нужно расширить локальное представление голоса так, чтобы удаление было синхронизируемо.

Рекомендуемая модель:

- добавить в `LocalVote`:
  - `is_deleted: boolean`
  - `deleted_at_client?: string | null`

### 9.3 Почему tombstone нужен

Если просто удалить запись из Dexie сразу, то:

- пропадает `version`
- пропадает связь между local entity и pending delete operation
- конфликт/ретрай становятся хрупкими

### 9.4 Новая операция outbox

Нужно добавить:

- `operation_type = vote_delete`

Payload:

```json
{
  "version": 3
}
```

### 9.5 Поведение sync

При локальном удалении голоса:

1. `my_votes` запись не исчезает физически сразу, а помечается `is_deleted = true`
2. `sync_status = pending`
3. в `outbox` кладётся `vote_delete`
4. карточка места уже показывает, что активного голоса нет
5. после успешного sync:
   - tombstone удаляется или переводится в финальное состояние и потом чистится

### 9.6 Поведение при конфликте

Если пришёл `version_conflict`:

- `sync_status = conflict`
- в разделе `Мои точки и голоса` пользователь видит конфликтный элемент
- карточка места не должна превращаться в технический мусор

## 10. Пакет F. Раздел `О нас` и ссылка на API

### 10.1 Цель

В разделе `О нас` пользователь и разработчик должны видеть:

- где API
- где OpenAPI schema
- что это публичная спецификация текущего продукта

### 10.2 Обязательные ссылки

Нужно вывести:

- Base API URL: `https://wifi.eval.su/api/v1`
- OpenAPI spec: `https://wifi.eval.su/openapi.yaml`

### 10.3 Обязательное backend/static поведение

Нужно реально раздавать `openapi.yaml` публично по продовому URL.

Допустимые варианты:

- положить `openapi.yaml` в публичную статику фронтенда
- или раздавать из Go backend отдельным route/static handler

### 10.4 Требование к UI

В `О нас` должен быть отдельный блок:

- заголовок `API`
- краткое описание
- ссылка на `openapi.yaml`
- опционально кнопка `Скопировать ссылку`

## 10A. Пакет G. Дополнительные UX и offline-доработки от 15 марта 2026

### 10A.1 Add-flow и адрес

Нужно дополнительно зафиксировать:

- при выборе точки на карте над маркером должен показываться определённый адрес;
- в форме добавления должен быть отдельный редактируемый field `Адрес / ориентир`;
- это значение должно сохраняться в `description`, а не теряться после reverse geocoding.

### 10A.2 Маркер точки

Маркер добавления и маркер точки должны оставаться в виде Wi-Fi marker / custom map marker:

- круглая голова;
- внутри Wi-Fi glyph;
- тонкая ножка вниз;
- хорошо читаемый активный state.

### 10A.3 Карточка точки: обязательный порядок блоков

Порядок внутри place sheet должен быть таким:

1. заголовок точки и Wi-Fi name;
2. адрес, если есть;
3. `Скопировать координаты`;
4. блок направления / стрелки;
5. `Работает / Не работает`;
6. `Промо`, если есть;
7. остальные метрики и secondary actions.

Также:

- plain text `Добавлено пользователем` убрать;
- plain text `Поделитесь точкой с друзьями` убрать;
- share остаётся action-кнопкой без лишнего текстового мусора.

### 10A.4 Офлайн-карта и viewport coverage

Дополнительно к исходному scope:

- верхняя подпись должна быть `Офлайн-карта Wi-Fi`;
- справа сверху нужна кнопка очистки офлайн-кэша;
- рядом должен показываться объём закешированных данных;
- очистка обязана идти через confirm с предупреждением, что без сети карты и локальные данные будут недоступны.

Ключевое поведение:

- если пользователь смещает карту в область, где раньше не был, карта должна подгружаться;
- если пользователь масштабирует карту, детализация должна расти по мере zoom;
- полученные по новой области точки должны не только показываться, но и сохраняться в offline-слой;
- повторный заход в уже покрытую область должен уметь восстановить точки и pack из локального кэша без сети.

## 11. Требования к тестированию

## 12. Общие принципы тестирования

Следующий пакет нельзя считать завершённым, пока не закрыты:

- unit tests
- integration tests
- e2e smoke tests
- manual QA чеклист
- Lighthouse non-performance gates

## 13. Frontend automated tests

Обязательные unit/component тесты:

### 13.1 Навигация

- нижнее меню содержит только:
  - `Карта`
  - `Мои точки и голоса`
  - `О нас`
- label `Я` отсутствует
- deep link `/place/:id` подсвечивает вкладку `Карта`

### 13.2 Add-flow copy

- нет строки `Добавить точку`
- есть `Добавить Wi-Fi` / `Добавить Вайфай`
- `promo` рендерится как `textarea`

### 13.3 Карточка точки

- нет строки `Ваш голос: ...`
- голосовые кнопки показывают счётчики
- нажатие на активный голос инициирует delete flow

### 13.4 Share

- share/copy использует URL формата `/place/:id`
- имя места не является fallback payload вместо ссылки

### 13.5 About/API

- на странице `О нас` есть блок `API`
- есть ссылка на `https://wifi.eval.su/openapi.yaml`

## 14. Backend tests

Обязательные backend unit/integration тесты:

### 14.1 Upsert vote

- create `works`
- create `not_works`
- switch `works -> not_works`
- switch `not_works -> works`

### 14.2 Delete vote

- delete `works`
- delete `not_works`
- delete c неверной `version` -> `version_conflict`
- delete чужого голоса -> `forbidden` или `not_found` по текущей policy

### 14.3 Counter correctness

- `works_count` и `not_works_count` пересчитываются корректно
- отрицательные значения не появляются

### 14.4 Version history

- insert записывает snapshot
- update записывает snapshot
- delete записывает snapshot с `version_action = delete`

### 14.5 Router/API

- `DELETE /api/v1/places/{placeId}/vote` существует
- error shape соответствует общему contract:
  - `error.code`
  - `error.message`
  - `error.details`
  - `request_id`

## 15. E2E / headless Chrome / Playwright

### 15.1 Обязательные сценарии

Нужно прогнать минимум следующие сценарии:

1. Открыть `/`
2. Открыть `/place/:id`
3. Поделиться точкой
4. Создать голос `works`
5. Повторным тапом удалить `works`
6. Создать `not_works`
7. Переключить `not_works -> works`
8. Пройти add-flow и проверить, что `Промо` это `textarea`
9. Проверить `О нас` и ссылку на API

### 15.2 Обязательная конфигурация emulation

Согласно Playwright docs, нужно использовать:

- device emulation
- geolocation emulation
- permissions: `['geolocation']`
- `colorScheme: 'light'`
- `colorScheme: 'dark'`

### 15.3 Обязательные device profiles

Минимум:

- `iPhone 13`
- Android Chromium профиль

Дополнительно для release-gate viewport matrix:

По данным Statcounter Worldwide Mobile Screen Resolution Stats за `February 2026`, топ-разрешения:

- `414x896`
- `360x800`
- `390x844`
- `393x873`
- `384x832`

Именно на них должны быть прогнаны:

- smoke UI
- Lighthouse non-performance audits

## 16. Manual QA checklist

### 16.1 iPhone Safari

- Открыть сайт в Safari
- Проверить `О нас`
- Проверить deep link `/place/:id`
- Проверить share
- Проверить add-flow
- Проверить голосование create/change/delete

### 16.2 Android Chrome

- Проверить те же сценарии
- Проверить установленную PWA

### 16.3 Сброс permission state

Для iPhone QA должен уметь сбросить состояние сайта:

- Settings -> Apps -> Safari -> Clear History and Website Data
- либо Website Data / per-site reset
- либо per-site Website Settings -> Location

Это обязательно, потому что браузерный permission state может быть уже в `denied`, и без сброса воспроизводимость тестов гео/датчиков будет ложной.

## 17. Lighthouse release gates

### 17.1 Жёсткие пороги

Для продовой страницы и deep link страницы на мобильных профилях:

- `Accessibility = 100`
- `Best Practices = 100`
- `SEO = 100`

`Performance` не является жёстким release gate в этом пакете, но должен замеряться и фиксироваться.

### 17.2 Отдельные критерии

Нужно не провалить:

- tap targets
- contrast
- accessible names
- page title
- `lang`
- mobile-friendly navigation

## 18. Что не входит в этот пакет

Ниже явно исключается из scope:

- полный переход на `<geolocation>` HTML element
- новый редизайн карты
- новая система модерации
- passkeys / новый auth flow
- пересборка офлайн-карт
- новый дизайн логотипа

## 19. Порядок реализации

Рекомендуемый порядок:

1. UI-copy rename `Добавить Wi-Fi`
2. Полный редизайн нижней навигации
3. frontend toggle/remove vote logic
4. backend `DELETE /vote`
5. sync/outbox `vote_delete`
6. OpenAPI + `О нас` + публичный `openapi.yaml`
7. frontend/backend tests
8. Playwright/headless regression
9. manual QA
10. prod deploy
11. post-deploy smoke

## 20. Definition of Done

Пакет считается завершённым только если одновременно выполнено всё ниже:

- на проде больше нет строки `Добавить точку`
- нижняя навигация полностью переверстана по новому spec
- вкладка `Карта` использует иконку карты, а не дома
- голос можно создать, переключить и снять
- backend поддерживает delete голоса
- `place_votes_versions` получает `delete` snapshot
- offline/sync не ломается при снятии голоса
- в `О нас` есть реальная ссылка на API/spec
- frontend tests зелёные
- backend tests зелёные
- e2e smoke зелёный
- manual QA checklist пройден
- Lighthouse `Accessibility/Best Practices/SEO = 100` на целевой mobile matrix

## 21. Источники, по которым сверялись требования

Официальные и первичные источники:

- MDN Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- Chrome Lighthouse: geolocation on page load: https://developer.chrome.com/docs/lighthouse/best-practices/geolocation-on-start
- Chrome for Developers, `<geolocation>` element, опубликовано `2026-01-13`: https://developer.chrome.com/blog/geolocation-html-element
- MDN Device Orientation permission flow: https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Detecting_device_orientation
- MDN `Navigator.share()`: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- MDN User Activation: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/User_activation
- MDN Secure Contexts: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts/features_restricted_to_secure_contexts
- web.dev Service Workers: https://web.dev/learn/pwa/service-workers/
- web.dev PWA update strategy: https://web.dev/learn/pwa/update
- web.dev Installation prompt: https://web.dev/learn/pwa/installation-prompt/
- web.dev Tools and debug: https://web.dev/learn/pwa/tools-and-debug
- Playwright Emulation: https://playwright.dev/docs/emulation
- Playwright test use options: https://playwright.dev/docs/test-use-options
- Chrome Lighthouse tap targets: https://developer.chrome.com/docs/lighthouse/seo/tap-targets/
- Chrome Lighthouse accessibility scoring: https://developer.chrome.com/docs/lighthouse/accessibility/scoring/
- Apple Support, Safari reset / website data: https://support.apple.com/en-us/105082
- Apple Support, Safari per-site location settings on iPhone: https://support.apple.com/en-mo/guide/iphone/iphb01fc3c85/ios
- Statcounter mobile resolutions, Worldwide, `February 2026`: https://gs.statcounter.com/screen-resolution-stats/mobile/worldwide

## 22. Ключевой вывод по платформе

Самое важное ограничение, которое нельзя игнорировать в реализации:

> На web нельзя гарантированно заставить браузер показать permission prompt геолокации "в любом случае".  
> Production-safe и audit-safe путь в марте 2026 года — это secure context + явный пользовательский action + корректный fallback.

Поэтому следующий пакет должен улучшать UX вокруг разрешений и голосования, но не пытаться нарушать ограничения браузеров.

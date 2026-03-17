# Community Post Templates

Ready-to-post drafts for launches, dev communities, and social channels. Replace links or tone if you want a stricter audience fit.

- GitHub repo: `https://github.com/sergey-from-riders/waifaika`
- Demo: `https://wifi.eval.su`

## Russian

### Repo Description

`Open-source mobile-first карта Wi-Fi точек: React + Vite + Go + PostGIS + offline packs + self-hosted API docs.`

### Telegram / VK Short Post

Запустил в паблик `Wifiyka`: open-source карту Wi-Fi точек с mobile-first интерфейсом, офлайн-пакетами, голосованием за точки и backend на Go.

Что внутри:
- React + Vite PWA
- Go API + PostgreSQL/PostGIS
- офлайн-карта и sync flow
- self-hosted Swagger-like API docs
- готовые deploy templates под `nginx + systemd`

Репозиторий: https://github.com/sergey-from-riders/waifaika  
Демо: https://wifi.eval.su

Буду рад фидбеку по архитектуре, DX и тому, насколько это выглядит как нормальная база для map-heavy продукта.

### Short Post For X / Threads

Открыл `Wifiyka` в public: open-source mobile-first карта Wi-Fi точек на React/Vite + Go + PostGIS.  
Есть офлайн-паки, sync flow, голоса, self-hosted API docs и deploy templates.

Repo: https://github.com/sergey-from-riders/waifaika  
Demo: https://wifi.eval.su

Ищу фидбек по коду, архитектуре и reuse как базы под другие map-приложения.

### Longer Post For Habr / vc / LinkedIn

Открыл в public свой проект `Wifiyka`. Это не просто интерфейс с картой, а уже нормальная основа под map-heavy приложение:

- mobile-first PWA на React + Vite
- backend на Go
- PostgreSQL + PostGIS
- offline packs через PMTiles
- nearby/sync flow
- создание точек и голосование `works / not_works`
- self-hosted API docs по OpenAPI
- production templates под `nginx + systemd`

Отдельно постарался довести репозиторий до состояния, которое не стыдно показать:
- README со скриншотами
- install/deploy docs
- CONTRIBUTING / SECURITY
- CI и Dependabot
- legal texts вынесены в install-time файлы, а не зашиты в код

Если вам нужен стартовый каркас для city guide, review map, field tool, local directory или любого сервиса, где карта это не виджет, а центр продукта, этот репозиторий можно использовать как основу.

Ссылки:
- GitHub: https://github.com/sergey-from-riders/waifaika
- Demo: https://wifi.eval.su

Если есть желание, напишите, что бы вы в таком проекте усилили в первую очередь: архитектуру, offline-first слой, UI, API или deploy story.

### “Looking For Feedback” Version

Выложил `Wifiyka` в public и хочу получить именно инженерный фидбек, а не лайки.

Интересует:
- где архитектура уже нормальная, а где ещё хрупкая
- насколько repo выглядит пригодным для reuse
- не перегружен ли frontend
- достаточно ли clean backend split после разбиения больших файлов
- нормально ли выглядит API docs / deploy flow / docs package

Repo: https://github.com/sergey-from-riders/waifaika  
Demo: https://wifi.eval.su

Если разберёте код и напишете жёсткий техразбор, это будет полезнее любой похвалы.

## English

### Repo Description

`Open-source mobile-first Wi-Fi map: React + Vite + Go + PostGIS + offline packs + self-hosted API docs.`

### Short Launch Post

I’ve open-sourced `Wifiyka`, a mobile-first Wi-Fi map built as a reusable base for map-heavy products.

It includes:
- React + Vite PWA frontend
- Go API + PostgreSQL/PostGIS backend
- offline packs and sync flow
- place creation and `works / not_works` voting
- self-hosted Swagger-style API docs
- production templates for `nginx + systemd`

Repo: https://github.com/sergey-from-riders/waifaika  
Demo: https://wifi.eval.su

I’d appreciate feedback on architecture, code quality, and how reusable the project feels as a starter for other map-based apps.

### X / Threads Version

Open-sourced `Wifiyka`: a mobile-first Wi-Fi map built with React/Vite, Go, PostGIS, offline packs, sync flow, and self-hosted API docs.

Repo: https://github.com/sergey-from-riders/waifaika  
Demo: https://wifi.eval.su

Interested in feedback on architecture, DX, and whether this feels solid as a reusable map app base.

### Show HN

Title:

`Show HN: Wifiyka, an open-source mobile-first Wi-Fi map with Go, PostGIS, offline packs, and self-hosted API docs`

Body:

I’ve been turning one of my internal map experiments into a public repository and pushed it live as `Wifiyka`.

The goal was not just to ship a working Wi-Fi map, but to make the repo reusable for other location-heavy apps. The stack is:
- React + Vite PWA frontend
- Go backend
- PostgreSQL + PostGIS
- offline packs via PMTiles
- sync flow for unstable mobile connectivity
- self-hosted Swagger-like API docs from the same domain

I also cleaned up the repository package itself:
- screenshots in the README
- install/deploy docs
- CI / Dependabot
- CONTRIBUTING / SECURITY
- install-time legal docs instead of hardcoded page text

Repo: https://github.com/sergey-from-riders/waifaika  
Demo: https://wifi.eval.su

Interested in blunt feedback on code structure, repo quality, and what would make it more credible as a reusable starter for map-based products.

### Reddit / dev.to Version

I open-sourced `Wifiyka`, a mobile-first Wi-Fi map that is also meant to be a reusable starter for map-heavy apps.

Main pieces:
- React + Vite PWA
- Go backend
- PostgreSQL/PostGIS
- offline map packs
- sync/bootstrap flow
- place creation, voting, and activity history
- self-hosted API docs

I spent extra time making the repository itself presentable and reusable, not just “code dumped to GitHub”.

Repo: https://github.com/sergey-from-riders/waifaika  
Demo: https://wifi.eval.su

Would love feedback on:
- frontend architecture
- backend boundaries
- offline-first approach
- docs / deploy story
- overall reuse potential

### LinkedIn Version

I’ve published `Wifiyka` as an open-source project.

It started as a Wi-Fi map, but I deliberately packaged it as a reusable foundation for location-heavy applications: maps, city guides, local directories, field tools, and other products where mobile UX and sync matter.

The stack:
- React + Vite
- Go
- PostgreSQL/PostGIS
- offline packs via PMTiles
- self-hosted API docs

I also focused on repository quality, not just implementation:
- bilingual README
- screenshots
- install/deploy docs
- CI and maintenance setup
- externalized legal-doc flow

GitHub: https://github.com/sergey-from-riders/waifaika  
Demo: https://wifi.eval.su

If you work on map products or mobile-first tools, I’d be interested in your feedback on architecture and reuse value.

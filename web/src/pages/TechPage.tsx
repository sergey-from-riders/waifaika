import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Wifi,
  Navigation,
  Download,
  Layers,
  ShieldCheck,
  Database,
  Code2,
  Globe2,
  ChevronDown,
} from "lucide-react";
import "./tech.css";

const scenarios = [
  {
    name: "Город",
    title: "Найти связь. И остаться на связи.",
    text: "Открытая карта Wi-Fi: точки рядом, условия доступа, отзывы о работе сети. Этот сценарий уже доступен в приложении.",
    places: ["Кофейня", "Библиотека", "Площадь"],
    status: "Работает сейчас",
    icon: Wifi,
  },
  {
    name: "Отель",
    title: "Всё на территории — в кармане гостя.",
    text: "Ресепшен, ресторан, бассейн и корпуса на своей карте. Для внедрения добавляем план территории, категории и контент; для этажей — отдельную модель здания и маршрутов.",
    places: ["Ресепшен", "Ресторан", "Бассейн"],
    status: "Сценарий внедрения",
    icon: MapPin,
  },
  {
    name: "Кампус",
    title: "Помочь человеку найти нужное место.",
    text: "Учебные корпуса, мастерские, сервисы и места встреч. Геоданные и офлайн-пакеты становятся основой приложения вашей территории.",
    places: ["Корпус А", "Мастерская", "Библиотека"],
    status: "Сценарий внедрения",
    icon: Layers,
  },
  {
    name: "Гольф-клуб",
    title: "Клубный дом, поле и сервисы — рядом.",
    text: "Покажите гостю его положение, нужный объект и расстояние до него: клубный дом, старт поля или прокат инвентаря. План территории сохраняется заранее и остаётся доступен без связи.",
    places: ["Клубный дом", "Поле № 1", "Прокат"],
    status: "Сценарий внедрения",
    icon: Navigation,
  },
];

export default function TechPage() {
  const [scenario, setScenario] = useState(0);
  const [step, setStep] = useState(0);
  const current = scenarios[scenario];
  useEffect(() => {
    document.title = "Геоприложение для вашей территории — Вайфайка / Riders";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        "Геоприложение с офлайн-картой: город, отель, кампус или гольф-клуб. Положение посетителя, объекты и расстояния. PWA, собственные геоданные и открытый API.",
      );
  }, []);
  return (
    <div className="geo-tech">
      <a className="tech-skip" href="#content">
        К содержимому
      </a>
      <header className="tech-header">
        <a href="/tech" className="tech-brand">
          <span className="tech-brand-icon">
            <Navigation size={21} />
          </span>
          RIDERS <span>/ geo</span>
        </a>
        <nav aria-label="Платформа">
          <a href="#scenarios">Применение</a>
          <a href="#offline">Офлайн</a>
          <a href="#architecture">Архитектура</a>
          <a href="/api-docs.html">
            API <ArrowUpRight size={13} />
          </a>
        </nav>
        <a className="tech-open" href="/">
          Открыть карту <ArrowUpRight size={16} />
        </a>
      </header>
      <main id="content">
        <section className="tech-hero">
          <div className="tech-hero-copy">
            <p className="tech-eyebrow">
              <span />
              ГЕОПРИЛОЖЕНИЕ · PWA · OPEN SOURCE
            </p>
            <h1>
              Ваша территория.
              <br />
              Понятная каждому.
              <br />
              <em>Даже без сети.</em>
            </h1>
            <p className="tech-lead">
              Карта, полезные места и ориентирование — в одном приложении. Для
              города, отеля, кампуса или гольф-клуба. Открывается по ссылке,
              устанавливается на телефон и сохраняет нужное с собой.
            </p>
            <div className="tech-actions">
              <a className="tech-primary" href="/">
                Попробовать Wi-Fi-карту <ArrowUpRight size={18} />
              </a>
              <a className="tech-secondary" href="#demo">
                Посмотреть, как это работает <ArrowRight size={18} />
              </a>
            </div>
            <p className="tech-footnote">
              Wi-Fi-карта — действующий пример. Новые территории и отраслевые
              сценарии адаптируются при внедрении.
            </p>
          </div>
          <div className="tech-hero-visual">
            <div className="tech-grid-map" aria-hidden="true">
              <div className="tech-river" />
              <div className="tech-green" />
              <div className="tech-map-road road-a" />
              <div className="tech-map-road road-b" />
              <span className="tech-map-label">ВАША ТЕРРИТОРИЯ</span>
              <span className="tech-pin pin-one">
                <Wifi size={20} />
              </span>
              <span className="tech-pin pin-two">
                <MapPin size={20} />
              </span>
              <span className="tech-pin pin-three">
                <Navigation size={20} />
              </span>
              <svg viewBox="0 0 500 500" className="tech-map-path">
                <path d="M115 350 L115 225 Q115 210 135 210 L290 210 L290 130" />
              </svg>
            </div>
            <div className="tech-map-card">
              <span className="tech-live-dot" />
              <div>
                <strong>Территория сохранена</strong>
                <span>Карта и точки доступны без интернета</span>
              </div>
              <Download size={21} />
            </div>
            <div className="tech-coordinate">
              43.5855° N / 39.7231° E <span>КОНЦЕПТ ПРИМЕНЕНИЯ</span>
            </div>
          </div>
        </section>
        <div className="tech-principles">
          <span>
            <Globe2 size={18} />
            Открывается по ссылке
          </span>
          <span>
            <Download size={18} />
            Устанавливается как приложение
          </span>
          <span>
            <Database size={18} />
            Данные в вашем контуре
          </span>
          <span>
            <Code2 size={18} />
            Открытый исходный код
          </span>
        </div>
        <section className="tech-section tech-video-section" id="demo">
          <div className="tech-section-head"><p className="tech-eyebrow">В ДЕЙСТВИИ / ПОЛМИНУТЫ</p><h2>Где вы.<br/>Где объект.<br/><em>Сколько до него.</em></h2><p>На примере гольф-клуба: приложение показывает положение посетителя, выделяет клубный дом и пересчитывает расстояние при движении.</p></div>
          <video className="tech-demo-video" controls playsInline preload="none" poster="/demo/golf-poster.jpg" aria-label="Демонстрация положения посетителя и расстояния до клубного дома"><source src="/demo/golf-navigation.mp4" type="video/mp4"/><track kind="captions" src="/demo/golf-ru.vtt" srcLang="ru" label="Русский" default/>Ваш браузер не поддерживает видео. <a href="/demo/golf-navigation.mp4">Скачать ролик</a></video>
          <div className="tech-demo-caption"><p>Запись демонстрационного режима: условная территория и смоделированные координаты. Расстояние — по прямой; построение маршрута не показывается.</p><a href="/demo/golf">Открыть интерактивный пример <ArrowUpRight size={17}/></a></div>
        </section>
        <section className="tech-section" id="scenarios">
          <div className="tech-section-head">
            <p className="tech-eyebrow">01 / ПРИМЕНЕНИЕ</p>
            <h2>
              Место меняется.
              <br />
              Основа остаётся.
            </h2>
            <p>
              Начинаем с задачи посетителя: найти, понять, сохранить. Состав
              данных и интерфейс подстраиваем под вашу территорию.
            </p>
          </div>
          <div
            className="tech-tabs"
            role="tablist"
            aria-label="Сценарий применения"
          >
            {scenarios.map((s, i) => (
              <button
                role="tab"
                aria-selected={scenario === i}
                aria-controls="scenario-panel"
                id={`scenario-${i}`}
                key={s.name}
                onClick={() => setScenario(i)}
              >
                {s.name}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <div
            id="scenario-panel"
            role="tabpanel"
            aria-labelledby={`scenario-${scenario}`}
            className="tech-scenario"
          >
            <div>
              <span className="tech-tag">{current.status}</span>
              <h3>{current.title}</h3>
              <p>{current.text}</p>
              <a href={scenario === 0 ? "/" : "#launch"}>
                {scenario === 0
                  ? "Открыть работающий пример"
                  : "Как запустить такой сценарий"}
                <ArrowRight size={17} />
              </a>
            </div>
            <div
              className="tech-scenario-map"
              aria-label={`Схема: ${current.places.join(", ")}`}
            >
              <span className="tech-schematic-label">СХЕМА ПРИМЕНЕНИЯ</span>
              <div className="tech-campus-block block-a" />
              <div className="tech-campus-block block-b" />
              <div className="tech-campus-block block-c" />
              {current.places.map((place, i) => (
                <div className={`tech-place place-${i}`} key={place}>
                  <current.icon size={18} />
                  <span>{place}</span>
                </div>
              ))}
              <div className="tech-you">
                <span />
                Вы здесь
              </div>
            </div>
          </div>
        </section>
        <section className="tech-section tech-offline" id="offline">
          <div className="tech-section-head">
            <p className="tech-eyebrow">02 / БЕЗ СЕТИ</p>
            <h2>
              Интернет пропал.
              <br />
              <em>Карта осталась.</em>
            </h2>
            <p>
              Один раз откройте приложение с интернетом и дождитесь сохранения
              территории. Затем карта, карточки и локальные изменения остаются
              на устройстве.
            </p>
          </div>
          <div className="tech-offline-demo">
            <div
              className="tech-step-controls"
              aria-label="Как работает офлайн"
            >
              {["1. Сохранили", "2. Отключились", "3. Вернулись"].map(
                (label, i) => (
                  <button
                    key={label}
                    aria-pressed={step === i}
                    onClick={() => setStep(i)}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
            <div className="tech-offline-state" aria-live="polite">
              <span className={`tech-network state-${step}`}>
                <Wifi size={20} />
                {
                  ["Есть интернет", "Без интернета", "Связь восстановлена"][
                    step
                  ]
                }
              </span>
              <h3>
                {
                  [
                    "Подготовьте карту заранее",
                    "Продолжайте пользоваться",
                    "Отправьте накопленные изменения",
                  ][step]
                }
              </h3>
              <p>
                {
                  [
                    "Оболочка приложения, выбранный картографический пакет и точки сохраняются локально. Индикатор на карте показывает результат загрузки.",
                    "Открывайте сохранённую территорию, смотрите точки, добавляйте свои сведения. Они остаются в очереди на этом устройстве.",
                    "Приложение проверяет сессию и отправляет очередь. Повтор доставки не создаёт вторую запись; конфликт версий показывается пользователю.",
                  ][step]
                }
              </p>
              <div className="tech-local-flow">
                <span>Устройство</span>
                <i>{step === 1 ? "Сохранено локально" : "↔"}</i>
                <span>Ваш сервер</span>
              </div>
            </div>
            <p className="tech-footnote">
              Это интерактивная схема. В приложении офлайн требует
              предварительной загрузки. Поиск адресов и вход по email требуют
              сети; браузер может удалить кеш при нехватке места.
            </p>
          </div>
        </section>
        <section className="tech-section" id="architecture">
          <div className="tech-section-head">
            <p className="tech-eyebrow">03 / УСТРОЙСТВО</p>
            <h2>
              Простая архитектура.
              <br />
              Ясные границы.
            </h2>
            <p>
              Модульный монолит с одним API: меньше эксплуатационных
              зависимостей, единые правила доступа и транзакции там, где важна
              целостность данных.
            </p>
          </div>
          <div className="tech-architecture">
            <div className="tech-arch-clients">
              <div>
                <Globe2 />
                <strong>PWA / React</strong>
                <p>Интерфейс и геолокация</p>
              </div>
              <div>
                <Download />
                <strong>На устройстве</strong>
                <p>IndexedDB · очередь · PMTiles</p>
              </div>
              <div>
                <Code2 />
                <strong>Ваши интеграции</strong>
                <p>Документированный HTTP API</p>
              </div>
            </div>
            <div className="tech-arch-line">HTTPS · один origin · JSON API</div>
            <div className="tech-arch-core">
              <span>GO / ПРИКЛАДНОЙ СЛОЙ</span>
              <strong>Доступ → валидация → правила → транзакция</strong>
              <p>Точки · голоса · версии · синхронизация · сессии</p>
            </div>
            <div className="tech-arch-line">Транзакции и геозапросы</div>
            <div className="tech-arch-storage">
              <Database />
              <strong>PostgreSQL + PostGIS</strong>
              <span>Источник истины</span>
            </div>
          </div>
          <div className="tech-proof-grid">
            {[
              [
                "Целостность",
                "Изменение и подтверждение доставки фиксируются вместе. Блокировка в базе защищает от параллельных повторов.",
              ],
              [
                "Доступ",
                "Сессия в HttpOnly-cookie, проверка владельца на сервере, защита от межсайтовых изменений и ограничение размера запросов.",
              ],
              [
                "Эксплуатация",
                "Проверка базы через /readyz, отдельная /healthz, завершение активных запросов при остановке и автоматический перезапуск процесса.",
              ],
              [
                "Проверяемость",
                "Открытые схемы API, тесты бизнес-правил, проверки интерфейса и сборка из зафиксированных зависимостей.",
              ],
            ].map(([title, text]) => (
              <article key={title}>
                <ShieldCheck size={21} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="tech-api">
          <div>
            <p className="tech-eyebrow">04 / ОТКРЫТАЯ ПЛАТФОРМА</p>
            <h2>
              Посмотрите глубже.
              <br />
              Всё доступно.
            </h2>
            <p>
              Контракт API, исходный код, устройство синхронизации и инструкция
              запуска — для команды, которая будет развивать продукт.
            </p>
          </div>
          <div className="tech-api-links">
            <a href="/api-docs.html">
              <Code2 />
              <span>
                Справочник API<small>Методы, параметры и схемы</small>
              </span>
              <ArrowUpRight />
            </a>
            <a href="/openapi.yaml" download>
              <Download />
              <span>
                OpenAPI<small>Контракт для ваших инструментов</small>
              </span>
              <ArrowUpRight />
            </a>
            <a
              href="https://github.com/sergey-from-riders/waifaika"
              target="_blank"
              rel="noreferrer"
            >
              <Layers />
              <span>
                Исходный код<small>Архитектура, тесты и развёртывание</small>
              </span>
              <ArrowUpRight />
            </a>
          </div>
        </section>
        <section className="tech-section" id="launch">
          <div className="tech-section-head">
            <p className="tech-eyebrow">05 / ВНЕДРЕНИЕ</p>
            <h2>
              От территории
              <br />к рабочему приложению.
            </h2>
          </div>
          <div className="tech-launch">
            {[
              [
                "01",
                "Определяем сценарий",
                "Кто пользуется картой, что ищет и в каких условиях остаётся без связи.",
              ],
              [
                "02",
                "Готовим геоданные",
                "Границы территории, точки, категории и разрешённая к распространению картографическая основа.",
              ],
              [
                "03",
                "Адаптируем продукт",
                "Фирменный стиль, содержание карточек, доступы, необходимые интеграции и планы зданий.",
              ],
              [
                "04",
                "Проверяем на месте",
                "Мобильные устройства, слабая сеть, повторный запуск офлайн и обновление установленного приложения.",
              ],
            ].map(([n, title, text]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="tech-section tech-faq">
          <div>
            <p className="tech-eyebrow">БЕЗ СКРЫТЫХ УСЛОВИЙ</p>
            <h2>Что важно знать.</h2>
          </div>
          <div>
            {[
              [
                "Можно использовать внутри отеля?",
                "Да, основу можно адаптировать под карту территории и планы зданий. Точное определение этажа и положения внутри здания не обеспечивается обычным GPS: для этого отдельно проектируются QR-ориентиры, маяки или другая система позиционирования. Построение маршрутов по этажам в текущую Wi-Fi-версию не входит.",
              ],
              [
                "Это полноценное PWA?",
                "Есть манифест установки, service worker, локальная база и офлайн-картография. Возможность установки зависит от браузера. Для первого запуска нужна сеть, для дальнейшей работы — заранее сохранённая территория.",
              ],
              [
                "Можно поставить на свой сервер?",
                "Да. Исходный код открыт по MIT. Нужны Go, Node.js для сборки, PostgreSQL с PostGIS и HTTPS. Карты и тексты нужно подготовить для своей территории, соблюдая условия их источников.",
              ],
              [
                "Где заканчивается текущий продукт?",
                "Сейчас работает Wi-Fi-карта с точками, голосами, геолокацией, офлайн-пакетами и синхронизацией. Мультитенантность, маршруты по этажам, заказ услуг и аппаратное позиционирование — отдельные задачи внедрения.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <ChevronDown size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="tech-final">
          <Navigation size={32} />
          <h2>
            Начните с карты.
            <br />
            Развивайте под свою задачу.
          </h2>
          <a className="tech-primary" href="/">
            Открыть приложение <ArrowUpRight size={18} />
          </a>
          <a href="https://github.com/sergey-from-riders/waifaika">
            Изучить проект на GitHub <ArrowRight size={16} />
          </a>
        </section>
      </main>
      <footer className="tech-footer">
        <a className="tech-brand" href="/tech">
          RIDERS <span>/ geo</span>
        </a>
        <span>Вайфайка · геоприложение с офлайн-картой</span>
        <a href="/about">
          О приложении <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}

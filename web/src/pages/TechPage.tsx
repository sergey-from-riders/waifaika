import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
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
import { ScenarioExplorer } from "@/features/geo-demo/ScenarioExplorer";
import { SCENARIOS, type ScenarioId } from "@/features/geo-demo/scenarios";
import "./tech.css";

export default function TechPage() {
  const [scenario, setScenario] = useState<ScenarioId>("golf");
  const [step, setStep] = useState(0);
  const current = SCENARIOS.find((item) => item.id === scenario)!;
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
              <a className="tech-primary" href="#demo">
                Смотреть видео <ArrowRight size={18} />
              </a>
              <a className="tech-secondary" href="/demo/golf">
                Открыть интерактивную карту <ArrowUpRight size={18} />
              </a>
            </div>
            <p className="tech-footnote">
              Wi-Fi-карта — действующий пример. Новые территории и отраслевые
              сценарии адаптируются при внедрении.
            </p>
          </div>
          <div className="tech-hero-visual">
            <ScenarioExplorer compact />
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
          <div className="tech-section-head">
            <p className="tech-eyebrow">ВИДЕО / ЧЕТЫРЕ СЦЕНАРИЯ</p>
            <h2>
              Гольф-клуб.
              <br />
              <em>1 000 метров от вас.</em>
            </h2>
            <p>
              Посмотрите запись работы приложения: выбор объекта, положение
              посетителя и расстояние. Затем — отель, кампус и город на той же
              карте.
            </p>
          </div>
          <video
            className="tech-demo-video"
            controls
            playsInline
            preload="none"
            poster="/demo/territory-scenarios-poster.jpg"
            aria-label="Видео: гольф-клуб в 1000 метрах, отель, кампус и город"
          >
            <source src="/demo/territory-scenarios.mp4" type="video/mp4" />
            <track
              kind="captions"
              src="/demo/territory-scenarios-ru.vtt"
              srcLang="ru"
              label="Русский"
            />
            Ваш браузер не поддерживает видео.{" "}
            <a href="/demo/territory-scenarios.mp4">Скачать запись</a>
          </video>
          <div className="tech-demo-caption">
            <p>
              Запись работающего интерфейса. Территории и координаты
              демонстрационные; расстояния рассчитываются по прямой.
            </p>
            <a href="/demo/territory-scenarios.mp4" download>
              Скачать видео <Download size={17} />
            </a>
          </div>
        </section>
        <section className="tech-section" id="scenarios">
          <div className="tech-section-head">
            <p className="tech-eyebrow">01 / ПОПРОБУЙТЕ САМИ</p>
            <h2>
              Четыре сценария.
              <br />
              <em>Одна понятная карта.</em>
            </h2>
            <p>
              Переключайте сценарии, нажимайте на объекты и запускайте движение.
              Положение, карточка и расстояние меняются сразу.
            </p>
          </div>
          <div className="tech-scenario-intro">
            <div>
              <span className="tech-tag">{current.name}</span>
              <h3>{current.title}</h3>
              <p>{current.description}</p>
            </div>
            <div className="tech-scenario-benefits">
              {current.features.map((feature) => (
                <span key={feature}>
                  <ShieldCheck size={16} />
                  {feature}
                </span>
              ))}
              <a href={`/demo/${scenario}`}>
                Открыть на весь экран <ArrowUpRight size={16} />
              </a>
              {scenario === "city" && (
                <a href="/">
                  Открыть действующую Wi-Fi-карту <ArrowUpRight size={16} />
                </a>
              )}
            </div>
          </div>
          <ScenarioExplorer onScenarioChange={setScenario} />
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

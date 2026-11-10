import { useEffect, useId, useRef, useState } from "react";
import {
  Flag,
  MapPin,
  Navigation,
  Play,
  RotateCcw,
  Pause,
  Wifi,
  Building2,
  GraduationCap,
} from "lucide-react";
import { bearingDegrees } from "@/lib/utils";
import {
  DEMO_ORIGIN,
  SCENARIOS,
  destination,
  distanceLabel,
  project,
  type ScenarioId,
} from "./scenarios";
import "./scenario-explorer.css";

const ICONS = {
  golf: Flag,
  hotel: Building2,
  campus: GraduationCap,
  city: Wifi,
};

export function ScenarioExplorer({
  initialScenario = "golf",
  compact = false,
  onScenarioChange,
}: {
  initialScenario?: ScenarioId;
  compact?: boolean;
  onScenarioChange?: (id: ScenarioId) => void;
}) {
  const [scenarioId, setScenarioId] = useState(initialScenario);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [moving, setMoving] = useState(false);
  const progressRef = useRef(0);
  const patternId = useId().replaceAll(":", "");
  const scenario = SCENARIOS.find((item) => item.id === scenarioId)!;
  const selected = scenario.places[selectedIndex];
  const target = destination(DEMO_ORIGIN, selected.distance, selected.bearing);
  const visitor = destination(
    DEMO_ORIGIN,
    selected.distance * progress,
    selected.bearing,
  );
  const visitorXY = project(visitor),
    targetXY = project(target);
  const distance = distanceLabel(visitor, target);
  const Icon = ICONS[scenarioId];

  useEffect(() => {
    if (!moving) return;
    const started = performance.now();
    const initial = progressRef.current;
    const timer = window.setInterval(() => {
      const next = Math.min(
        0.75,
        initial + ((performance.now() - started) / 12_000) * 0.75,
      );
      progressRef.current = next;
      setProgress(next);
      if (next >= 0.75) setMoving(false);
    }, 80);
    return () => window.clearInterval(timer);
  }, [moving]);

  function reset() {
    setMoving(false);
    progressRef.current = 0;
    setProgress(0);
  }
  function chooseScenario(id: ScenarioId) {
    reset();
    setSelectedIndex(0);
    setScenarioId(id);
    onScenarioChange?.(id);
  }
  function choosePlace(index: number) {
    reset();
    setSelectedIndex(index);
  }
  function toggleMovement() {
    if (progressRef.current >= 0.75) {
      progressRef.current = 0;
      setProgress(0);
    }
    setMoving((value) => !value);
  }

  return (
    <section
      className={`scenario-explorer ${compact ? "explorer-compact" : "explorer-wide"}`}
      aria-label="Интерактивная карта примеров"
    >
      <div className="explorer-tabs" role="group" aria-label="Сценарии карты">
        {SCENARIOS.map((item) => {
          const TabIcon = ICONS[item.id];
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={scenarioId === item.id}
              onClick={() => chooseScenario(item.id)}
            >
              <TabIcon size={15} />
              {item.name}
            </button>
          );
        })}
      </div>
      <div className="explorer-body">
        <div className={`explorer-map map-${scenarioId}`}>
          <svg
            className="explorer-plan"
            viewBox="0 0 1000 550"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id={patternId}
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M40 0H0V40"
                  fill="none"
                  stroke="#b6c9ab"
                  strokeWidth=".65"
                  opacity=".45"
                />
              </pattern>
            </defs>
            <rect width="1000" height="550" fill="#e9efdf" />
            <rect width="1000" height="550" fill={`url(#${patternId})`} />
            <path d="M780 550Q660 420 780 330T1000 230V550Z" fill="#b9d8db" />
            <path d="M0 90Q140 10 240 80T470 0H0Z" fill="#c6d9b4" />
            <path d="M0 510Q200 410 310 530L380 550H0Z" fill="#cddfbc" />
            <path
              d="M100 550L150 435Q150 360 310 360L550 360Q640 360 640 260L640 120L1000 120"
              fill="none"
              stroke="#d1d4c2"
              strokeWidth="21"
            />
            <path
              d="M100 550L150 435Q150 360 310 360L550 360Q640 360 640 260L640 120L1000 120"
              fill="none"
              stroke="#fffdf4"
              strokeWidth="15"
            />
            {scenarioId === "golf" ? (
              <g fill="#bed498" stroke="#a8c188" strokeWidth="2">
                <path d="M260 280Q340 170 500 200Q570 240 410 290L330 330Q270 340 260 280Z" />
                <path d="M460 80Q560 25 680 55Q710 110 560 140Q470 160 460 80Z" />
                <ellipse cx="400" cy="245" rx="20" ry="12" fill="#eee5b9" />
                <ellipse cx="580" cy="95" rx="24" ry="14" fill="#eee5b9" />
              </g>
            ) : (
              <g
                fill={scenarioId === "city" ? "#d2d6ca" : "#d6ccb4"}
                stroke="#aab8a0"
                strokeWidth="2"
              >
                <rect x="280" y="190" width="150" height="85" rx="9" />
                <rect x="470" y="40" width="95" height="150" rx="9" />
                <rect x="690" y="180" width="130" height="95" rx="9" />
                <rect x="310" y="415" width="220" height="65" rx="9" />
                {scenarioId === "hotel" && (
                  <rect
                    x="220"
                    y="80"
                    width="140"
                    height="65"
                    rx="25"
                    fill="#a9d6df"
                    stroke="#83bbc9"
                  />
                )}
              </g>
            )}
            <g fill="#94b07b" opacity=".7">
              {[
                [80, 150],
                [95, 190],
                [910, 450],
                [900, 400],
                [40, 340],
                [590, 480],
                [60, 210],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="14" />
              ))}
            </g>
            <line
              x1={visitorXY.x}
              y1={visitorXY.y}
              x2={targetXY.x}
              y2={targetXY.y}
              stroke="#315b43"
              strokeWidth="3"
              strokeDasharray="8 8"
            />
          </svg>
          <span className="explorer-map-note">
            ПЛАН · {scenario.name.toLocaleUpperCase("ru")}
          </span>
          {scenario.places.map((place, index) => {
            const xy = project(
              destination(DEMO_ORIGIN, place.distance, place.bearing),
            );
            return (
              <button
                key={place.id}
                className={`explorer-point ${selectedIndex === index ? "is-selected" : ""}`}
                style={{ left: `${xy.x / 10}%`, top: `${xy.y / 5.5}%` }}
                aria-label={`Выбрать: ${place.name}`}
                aria-pressed={selectedIndex === index}
                onClick={() => choosePlace(index)}
              >
                <span>
                  <Icon size={compact ? 18 : 23} />
                </span>
                <b>{place.name}</b>
              </button>
            );
          })}
          <div
            className="explorer-visitor"
            style={{
              left: `${visitorXY.x / 10}%`,
              top: `${visitorXY.y / 5.5}%`,
            }}
          >
            <span />
            <b>Вы здесь</b>
          </div>
          <div
            className="explorer-measure"
            style={{
              left: `${(visitorXY.x + targetXY.x) / 20}%`,
              top: `${(visitorXY.y + targetXY.y) / 11}%`,
            }}
          >
            {distance}
          </div>
          <span className="explorer-north">N ↑</span>
        </div>
        <div className="explorer-details">
          <div className="explorer-selection">
            <span className="explorer-selection-icon">
              <Icon size={23} />
            </span>
            <div>
              <span>ВЫБРАННЫЙ ОБЪЕКТ</span>
              <h3>{selected.name}</h3>
            </div>
            <div className="explorer-distance">
              <strong data-testid="demo-distance">{distance}</strong>
              <span>от вас по прямой</span>
            </div>
          </div>
          <p className="explorer-place-detail">{selected.detail}</p>
          <div className="explorer-direction">
            <Navigation
              size={20}
              style={{
                transform: `rotate(${bearingDegrees(visitor, target) - 45}deg)`,
              }}
            />
            <span>
              {moving
                ? "Вы движетесь · расстояние обновляется"
                : "Нажмите на объект или покажите движение"}
            </span>
          </div>
          <div className="explorer-controls">
            <button
              type="button"
              className="explorer-move"
              onClick={toggleMovement}
            >
              {moving ? <Pause size={16} /> : <Play size={16} />}{" "}
              {moving ? "Остановить" : "Показать движение"}
            </button>
            <button type="button" className="explorer-reset" onClick={reset}>
              <RotateCcw size={15} /> В начало
            </button>
          </div>
          {!compact && (
            <div className="explorer-coordinate">
              <MapPin size={14} />
              <span>Положение посетителя</span>
              <code>
                {visitor.lat.toFixed(5)}° N / {visitor.lng.toFixed(5)}° E
              </code>
            </div>
          )}
        </div>
      </div>
      <p className="explorer-disclaimer">
        Интерактивный пример · координаты смоделированы · расстояние по прямой
      </p>
    </section>
  );
}

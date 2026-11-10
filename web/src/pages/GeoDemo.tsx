import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Wifi, WifiOff } from "lucide-react";
import { ScenarioExplorer } from "@/features/geo-demo/ScenarioExplorer";
import { SCENARIOS, type ScenarioId } from "@/features/geo-demo/scenarios";
import "./geo-demo.css";

export default function GeoDemo() {
  const initialScenario =
    SCENARIOS.find(
      (item) =>
        `/demo/${item.id}` === window.location.pathname.replace(/\/$/, ""),
    )?.id ?? "golf";
  const [scenario, setScenario] = useState<ScenarioId>(initialScenario);
  const [online, setOnline] = useState(navigator.onLine);
  const current = SCENARIOS.find((item) => item.id === scenario)!;

  useEffect(() => {
    document.title = `${current.name}: объекты и расстояния — Riders Geo`;
  }, [current.name]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  function chooseScenario(id: ScenarioId) {
    setScenario(id);
    window.history.replaceState(null, "", `/demo/${id}`);
  }

  return (
    <div className="geo-demo">
      <header className="demo-header">
        <a href="/tech">
          <ArrowLeft size={17} /> RIDERS / geo
        </a>
        <span>ИНТЕРАКТИВНЫЕ СЦЕНАРИИ</span>
        <a href="/tech#demo">
          Смотреть видео <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <div className="demo-heading">
          <div>
            <p>ВАШЕ ПОЛОЖЕНИЕ → ОБЪЕКТ → РАССТОЯНИЕ</p>
            <h1>{current.title}</h1>
          </div>
          <span className="demo-connection">
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            {online ? "Интерактивный пример" : "Без сети · пример доступен"}
          </span>
        </div>
        <ScenarioExplorer
          initialScenario={initialScenario}
          onScenarioChange={chooseScenario}
        />
        <footer>
          <p>
            Выбирайте объекты на карте. Запускайте и останавливайте движение.
            Все расстояния рассчитываются по координатам.
          </p>
          <span>Riders Geo / PWA</span>
        </footer>
      </main>
    </div>
  );
}

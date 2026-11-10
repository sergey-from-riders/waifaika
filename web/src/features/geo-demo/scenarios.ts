import { distanceBetweenMeters } from "@/lib/utils";

export type ScenarioId = "golf" | "hotel" | "campus" | "city";
export type Coordinate = { lat: number; lng: number };
export type DemoPlace = {
  id: string;
  name: string;
  detail: string;
  distance: number;
  bearing: number;
};
export type GeoScenario = {
  id: ScenarioId;
  name: string;
  title: string;
  description: string;
  features: string[];
  places: DemoPlace[];
};

export const DEMO_ORIGIN: Coordinate = { lat: 43.58, lng: 39.72 };
export const SCENARIOS: GeoScenario[] = [
  {
    id: "golf",
    name: "Гольф-клуб",
    title: "От входа — к первой лунке.",
    description:
      "Клубный дом, старт поля и прокат инвентаря. Гость выбирает объект, видит своё положение и расстояние до него.",
    features: ["Поле и сервисы", "Расстояние до объекта", "Карта без сети"],
    places: [
      {
        id: "club",
        name: "Гольф-клуб",
        detail: "Клубный дом · ресепшен и ресторан",
        distance: 1000,
        bearing: 65,
      },
      {
        id: "tee",
        name: "Первая лунка",
        detail: "Старт поля · точка сбора игроков",
        distance: 620,
        bearing: 80,
      },
      {
        id: "rental",
        name: "Прокат",
        detail: "Клюшки, мячи и гольф-кары",
        distance: 400,
        bearing: 25,
      },
    ],
  },
  {
    id: "hotel",
    name: "Отель",
    title: "Гость сразу знает, куда идти.",
    description:
      "Ресепшен, ресторан и бассейн на плане отеля. Нужные сервисы доступны гостю по ссылке, в том числе после сохранения карты без сети.",
    features: ["Сервисы для гостей", "Корпуса и входы", "Своя карта отеля"],
    places: [
      {
        id: "reception",
        name: "Ресепшен",
        detail: "Главный корпус · заселение и помощь",
        distance: 850,
        bearing: 65,
      },
      {
        id: "restaurant",
        name: "Ресторан",
        detail: "Завтрак и ужин · терраса у воды",
        distance: 480,
        bearing: 80,
      },
      {
        id: "pool",
        name: "Бассейн",
        detail: "Открытый бассейн · зона отдыха",
        distance: 350,
        bearing: 25,
      },
    ],
  },
  {
    id: "campus",
    name: "Кампус",
    title: "Найти корпус. Успеть на встречу.",
    description:
      "Учебные корпуса, библиотека и мастерские. Посетитель выбирает место и видит, насколько далеко оно находится.",
    features: ["Корпуса и аудитории", "Места встреч", "Доступ по ссылке"],
    places: [
      {
        id: "building",
        name: "Корпус А",
        detail: "Главный учебный корпус · вход № 1",
        distance: 700,
        bearing: 65,
      },
      {
        id: "library",
        name: "Библиотека",
        detail: "Читальный зал · коворкинг",
        distance: 430,
        bearing: 80,
      },
      {
        id: "workshop",
        name: "Мастерская",
        detail: "Лаборатории · проектное пространство",
        distance: 300,
        bearing: 25,
      },
    ],
  },
  {
    id: "city",
    name: "Город",
    title: "Полезные места — рядом с вами.",
    description:
      "Кофейни, библиотеки и открытый Wi-Fi. Пример городской карты уже работает: точки, условия доступа и отзывы о связи.",
    features: ["Ближайший Wi-Fi", "Карточки мест", "Отзывы о связи"],
    places: [
      {
        id: "coffee",
        name: "Кофейня",
        detail: "Wi-Fi · розетки · места для работы",
        distance: 550,
        bearing: 65,
      },
      {
        id: "library",
        name: "Библиотека",
        detail: "Открытый Wi-Fi · тихий зал",
        distance: 760,
        bearing: 80,
      },
      {
        id: "square",
        name: "Площадь",
        detail: "Городская точка доступа Wi-Fi",
        distance: 320,
        bearing: 25,
      },
    ],
  },
];

// Spherical destination gives the golf example a measured initial distance of 1,000 m.
export function destination(
  origin: Coordinate,
  meters: number,
  bearing: number,
): Coordinate {
  const angularDistance = meters / 6_371_000;
  const latitude = (origin.lat * Math.PI) / 180;
  const longitude = (origin.lng * Math.PI) / 180;
  const direction = (bearing * Math.PI) / 180;
  const lat = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(direction),
  );
  const lng =
    longitude +
    Math.atan2(
      Math.sin(direction) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(lat),
    );
  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

export function project(point: Coordinate) {
  const radians = Math.PI / 180;
  return {
    x:
      150 +
      (point.lng - DEMO_ORIGIN.lng) *
        radians *
        6_371_000 *
        Math.cos(DEMO_ORIGIN.lat * radians) *
        0.72,
    y: 435 - (point.lat - DEMO_ORIGIN.lat) * radians * 6_371_000 * 0.72,
  };
}

export function distanceLabel(from: Coordinate, to: Coordinate) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(distanceBetweenMeters(from, to)))} м`;
}

export const BASE_SOURCE_ID = "wifi-base";

const LIGHT_BLANK_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "bg",
      type: "background",
      paint: {
        "background-color": "#eef3ff",
      },
    },
  ],
};

const DARK_BLANK_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "bg",
      type: "background",
      paint: {
        "background-color": "#06080d",
      },
    },
  ],
};

const LIGHT_VECTOR_STYLE = {
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#eef3ff" } },
    { id: "earth", type: "fill", source: BASE_SOURCE_ID, "source-layer": "earth", paint: { "fill-color": "#f7fafc" } },
    {
      id: "landcover",
      type: "fill",
      source: BASE_SOURCE_ID,
      "source-layer": "landcover",
      paint: { "fill-color": "#dbead9", "fill-opacity": 0.95 },
    },
    {
      id: "landuse",
      type: "fill",
      source: BASE_SOURCE_ID,
      "source-layer": "landuse",
      paint: {
        "fill-color": ["match", ["get", "kind"], ["park", "nature_reserve", "wood", "forest", "garden"], "#d9ecd8", ["beach"], "#f4e6c8", "#edf2ea"],
        "fill-opacity": 0.92,
      },
    },
    {
      id: "water-fill",
      type: "fill",
      source: BASE_SOURCE_ID,
      "source-layer": "water",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#b8d8ff" },
    },
    {
      id: "water-line",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "water",
      filter: ["==", ["geometry-type"], "LineString"],
      paint: {
        "line-color": "#9fc8ff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 12, 1.9, 15, 3.2],
      },
    },
    {
      id: "roads-casing",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "roads",
      filter: ["!=", ["get", "kind"], "rail"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ccd7e4",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 11, 2.8, 13, 4.8, 15, 10.2],
      },
    },
    {
      id: "roads",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "roads",
      filter: ["!=", ["get", "kind"], "rail"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["match", ["get", "kind"], ["highway", "major_road"], "#ffffff", ["minor_road", "path", "service"], "#fafcff", "#fbfdff"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.45, 11, 1.6, 13, 3.25, 15, 7.8],
      },
    },
    {
      id: "rail",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "rail"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#8b9bae",
        "line-dasharray": [2, 1.5],
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 13, 1.5, 15, 2.4],
      },
    },
    {
      id: "buildings",
      type: "fill",
      source: BASE_SOURCE_ID,
      "source-layer": "buildings",
      minzoom: 13,
      paint: { "fill-color": "#dfe8f1", "fill-outline-color": "#cfd9e5", "fill-opacity": 0.96 },
    },
    {
      id: "boundaries",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "boundaries",
      paint: {
        "line-color": "#c3ced8",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.3, 10, 0.8, 14, 1.2],
      },
    },
  ],
};

const DARK_VECTOR_STYLE = {
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#05070b" } },
    { id: "earth", type: "fill", source: BASE_SOURCE_ID, "source-layer": "earth", paint: { "fill-color": "#090d13" } },
    {
      id: "landcover",
      type: "fill",
      source: BASE_SOURCE_ID,
      "source-layer": "landcover",
      paint: { "fill-color": "#0f1e15", "fill-opacity": 0.98 },
    },
    {
      id: "landuse",
      type: "fill",
      source: BASE_SOURCE_ID,
      "source-layer": "landuse",
      paint: {
        "fill-color": ["match", ["get", "kind"], ["park", "nature_reserve", "wood", "forest", "garden"], "#112518", ["beach"], "#271f14", "#0d1118"],
        "fill-opacity": 0.98,
      },
    },
    {
      id: "water-fill",
      type: "fill",
      source: BASE_SOURCE_ID,
      "source-layer": "water",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#0e2237" },
    },
    {
      id: "water-line",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "water",
      filter: ["==", ["geometry-type"], "LineString"],
      paint: {
        "line-color": "#173757",
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 12, 1.9, 15, 3.2],
      },
    },
    {
      id: "roads-casing",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "roads",
      filter: ["!=", ["get", "kind"], "rail"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#1a2430",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 11, 2.7, 13, 4.6, 15, 10],
      },
    },
    {
      id: "roads",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "roads",
      filter: ["!=", ["get", "kind"], "rail"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["match", ["get", "kind"], ["highway", "major_road"], "#39465a", ["minor_road", "path", "service"], "#263141", "#202837"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.45, 11, 1.6, 13, 3.25, 15, 7.8],
      },
    },
    {
      id: "rail",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "roads",
      filter: ["==", ["get", "kind"], "rail"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#53657d",
        "line-dasharray": [2, 1.5],
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 13, 1.5, 15, 2.4],
      },
    },
    {
      id: "buildings",
      type: "fill",
      source: BASE_SOURCE_ID,
      "source-layer": "buildings",
      minzoom: 13,
      paint: { "fill-color": "#111722", "fill-outline-color": "#1b2430", "fill-opacity": 1 },
    },
    {
      id: "boundaries",
      type: "line",
      source: BASE_SOURCE_ID,
      "source-layer": "boundaries",
      paint: {
        "line-color": "#253247",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.3, 10, 0.8, 14, 1.2],
      },
    },
  ],
};

export function blankMapStyle(theme: "light" | "dark") {
  return theme === "dark" ? DARK_BLANK_STYLE : LIGHT_BLANK_STYLE;
}

export function vectorMapStyle(theme: "light" | "dark") {
  return theme === "dark" ? DARK_VECTOR_STYLE : LIGHT_VECTOR_STYLE;
}

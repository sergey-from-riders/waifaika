import { useEffect, useRef, useState } from "react";
import maplibregl, { Marker, type Map } from "maplibre-gl";
import { FileSource, PMTiles, Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";

import { BASE_SOURCE_ID, blankMapStyle, vectorMapStyle } from "@/features/map/mapStyles";
import type { MapViewport } from "@/features/map/viewport";
import type { MapPackSource, Place } from "@/lib/types";

type MapCanvasProps = {
  center: { lat: number; lng: number };
  places: Place[];
  activePlaceId?: string;
  mapPack?: MapPackSource | null;
  currentLocation?: { lat: number; lng: number; accuracy?: number } | null;
  theme: "light" | "dark";
  pickerMode?: boolean;
  onSelectPlace: (place: Place) => void;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  onMoveStateChange?: (moving: boolean) => void;
  onViewportSettled?: (viewport: MapViewport) => void;
};

const pmtilesProtocol = new Protocol();
let protocolRegistered = false;

function ensureProtocol() {
  if (protocolRegistered) {
    return;
  }
  maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
  protocolRegistered = true;
}

function sourceKey(mapPack: MapPackSource) {
  if (mapPack.kind === "file") {
    const archive = new PMTiles(new FileSource(mapPack.file));
    pmtilesProtocol.add(archive);
    return mapPack.file.name;
  }
  if (!pmtilesProtocol.get(mapPack.url)) {
    pmtilesProtocol.add(new PMTiles(mapPack.url));
  }
  return mapPack.url;
}

function styleForPack(mapPack: MapPackSource | null | undefined, theme: "light" | "dark") {
  const blank = blankMapStyle(theme);
  const vectorStyle = vectorMapStyle(theme);
  if (!mapPack) {
    return blank;
  }
  return {
    ...vectorStyle,
    sources: {
      [BASE_SOURCE_ID]: {
        type: "vector",
        url: `pmtiles://${sourceKey(mapPack)}`,
        attribution: "&copy; OpenStreetMap contributors",
      },
    },
  };
}

export function MapCanvas({
  center,
  places,
  activePlaceId,
  mapPack,
  currentLocation,
  theme,
  pickerMode = false,
  onSelectPlace,
  onCenterChange,
  onMoveStateChange,
  onViewportSettled,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const placeMarkersRef = useRef<Marker[]>([]);
  const locationMarkerRef = useRef<Marker | null>(null);
  const styleKeyRef = useRef<string>("blank");
  const onCenterChangeRef = useRef(onCenterChange);
  const onMoveStateChangeRef = useRef(onMoveStateChange);
  const onViewportSettledRef = useRef(onViewportSettled);
  const [cameraTick, setCameraTick] = useState(0);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
    onMoveStateChangeRef.current = onMoveStateChange;
    onViewportSettledRef.current = onViewportSettled;
  }, [onCenterChange, onMoveStateChange, onViewportSettled]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }
    ensureProtocol();
    styleKeyRef.current = `${theme}:${mapPack?.key ?? "blank"}`;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: styleForPack(mapPack, theme) as never,
      center: [center.lng, center.lat],
      zoom: 13,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    const emitViewportSettled = () => {
      const map = mapRef.current;
      if (!map) {
        return;
      }
      const nextCenter = map.getCenter();
      const bounds = map.getBounds();
      setCameraTick((value) => value + 1);
      onViewportSettledRef.current?.({
        center: { lat: nextCenter.lat, lng: nextCenter.lng },
        zoom: map.getZoom(),
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
      });
    };

    mapRef.current.on("moveend", () => {
      const nextCenter = mapRef.current?.getCenter();
      if (!nextCenter) {
        return;
      }
      onMoveStateChangeRef.current?.(false);
      onCenterChangeRef.current?.({ lat: nextCenter.lat, lng: nextCenter.lng });
      emitViewportSettled();
    });
    mapRef.current.on("movestart", () => {
      onMoveStateChangeRef.current?.(true);
    });
    mapRef.current.on("zoomend", () => {
      emitViewportSettled();
    });
    mapRef.current.on("load", emitViewportSettled);

    return () => {
      placeMarkersRef.current.forEach((marker) => marker.remove());
      locationMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    const current = mapRef.current.getCenter();
    const deltaLat = Math.abs(current.lat - center.lat);
    const deltaLng = Math.abs(current.lng - center.lng);
    if (deltaLat < 0.0005 && deltaLng < 0.0005) {
      return;
    }
    mapRef.current.easeTo({ center: [center.lng, center.lat], duration: pickerMode ? 0 : 560, easing: (t) => 1 - (1 - t) ** 3 });
  }, [center.lat, center.lng, pickerMode]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    const nextStyleKey = `${theme}:${mapPack?.key ?? "blank"}`;
    if (styleKeyRef.current === nextStyleKey) {
      return;
    }
    styleKeyRef.current = nextStyleKey;
    mapRef.current.setStyle(styleForPack(mapPack, theme) as never);
  }, [mapPack, theme]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    placeMarkersRef.current.forEach((marker) => marker.remove());
    const renderablePlaces = selectRenderablePlaces(mapRef.current, places, activePlaceId);
    placeMarkersRef.current = renderablePlaces.map((place) => {
      const isActive = activePlaceId === place.place_id;
      const node = createPlaceMarker(place.place_name, isActive, theme);
      node.addEventListener("click", () => onSelectPlace(place));
      return new maplibregl.Marker({ element: node, anchor: "bottom" })
        .setLngLat([place.lng, place.lat])
        .addTo(mapRef.current!);
    });
  }, [activePlaceId, cameraTick, center.lat, center.lng, onSelectPlace, places, theme]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    locationMarkerRef.current?.remove();
    if (!currentLocation) {
      locationMarkerRef.current = null;
      return;
    }
    locationMarkerRef.current = new maplibregl.Marker({ element: createLocationMarker(theme), anchor: "center" })
      .setLngLat([currentLocation.lng, currentLocation.lat])
      .addTo(mapRef.current);
  }, [currentLocation, theme]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function selectRenderablePlaces(map: Map, places: Place[], activePlaceId?: string) {
  const zoom = map.getZoom();
  if (zoom >= 15.2) {
    return places;
  }

  const minSpacing = zoom >= 14.2 ? 30 : 42;
  const ordered = [...places].sort((left, right) => {
    if (left.place_id === activePlaceId) {
      return -1;
    }
    if (right.place_id === activePlaceId) {
      return 1;
    }
    return 0;
  });

  const accepted: Array<{ place: Place; x: number; y: number }> = [];
  for (const place of ordered) {
    const projected = map.project([place.lng, place.lat]);
    const overlaps = accepted.some((item) => {
      const dx = item.x - projected.x;
      const dy = item.y - projected.y;
      return Math.hypot(dx, dy) < minSpacing;
    });
    if (!overlaps) {
      accepted.push({ place, x: projected.x, y: projected.y });
    }
  }

  return accepted.map((item) => item.place);
}

function createPlaceMarker(label: string, isActive: boolean, theme: "light" | "dark") {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.style.width = "58px";
  button.style.height = "74px";
  button.style.border = "0";
  button.style.background = "transparent";
  button.style.padding = "0";
  button.style.display = "flex";
  button.style.alignItems = "flex-start";
  button.style.justifyContent = "center";
  button.style.cursor = "pointer";
  button.innerHTML = `
    <span style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:100%;">
      <span style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:${isActive ? 42 : 38}px;
        height:${isActive ? 42 : 38}px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,0.72);
        background:${isActive ? "linear-gradient(180deg,#60a5fa,#1d4ed8)" : "linear-gradient(180deg,#3b82f6,#1e40af)"};
        color:white;
        box-shadow:${theme === "dark" ? "0 16px 24px rgba(15,23,42,0.5)" : "0 16px 24px rgba(37,99,235,0.26)"};
        transform:${isActive ? "scale(1.06)" : "scale(1)"};
        transition:transform 220ms ease;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 20h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M2 8.82a15 15 0 0 1 20 0" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M5 12.859a10 10 0 0 1 14 0" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M8.5 16.429a5 5 0 0 1 7 0" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span style="
        width:${isActive ? 5 : 4}px;
        height:${isActive ? 28 : 24}px;
        border-radius:999px;
        background:linear-gradient(180deg,rgba(37,99,235,0.95),rgba(37,99,235,0.38));
        margin-top:-2px;
      "></span>
    </span>
  `;
  return button;
}

function createLocationMarker(theme: "light" | "dark") {
  const node = document.createElement("div");
  node.setAttribute("aria-hidden", "true");
  node.style.position = "relative";
  node.style.width = "36px";
  node.style.height = "36px";
  node.innerHTML = `
    <span style="position:absolute;inset:0;border-radius:999px;background:${theme === "dark" ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.18)"};border:1px solid rgba(34,197,94,0.45);"></span>
    <span style="position:absolute;inset:8px;border-radius:999px;background:linear-gradient(180deg,#4ade80,#16a34a);border:4px solid rgba(255,255,255,0.98);${theme === "dark" ? "" : "box-shadow:0 8px 18px rgba(22,163,74,0.22);"}"></span>
  `;
  return node;
}

import { distanceBetweenMeters } from "@/lib/utils";

export type MapViewport = {
  center: { lat: number; lng: number };
  zoom: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
};

const MIN_RADIUS_KM = 3;
const MAX_RADIUS_KM = 100;
const VIEWPORT_BUFFER_MULTIPLIER = 1.2;

export function viewportRadiusKm(viewport: MapViewport) {
  const corners = [
    { lat: viewport.bounds.north, lng: viewport.bounds.west },
    { lat: viewport.bounds.north, lng: viewport.bounds.east },
    { lat: viewport.bounds.south, lng: viewport.bounds.west },
    { lat: viewport.bounds.south, lng: viewport.bounds.east },
  ];

  const farthestMeters = corners.reduce((maxDistance, corner) => {
    return Math.max(maxDistance, distanceBetweenMeters(viewport.center, corner));
  }, 0);

  const bufferedKm = (farthestMeters * VIEWPORT_BUFFER_MULTIPLIER) / 1000;
  return clamp(Math.ceil(bufferedKm), MIN_RADIUS_KM, MAX_RADIUS_KM);
}

export function viewportRequestKey(viewport: MapViewport) {
  return [
    viewport.center.lat.toFixed(3),
    viewport.center.lng.toFixed(3),
    viewport.zoom.toFixed(2),
    viewportRadiusKm(viewport),
  ].join(":");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

import { FileSource, PMTiles, type Header } from "pmtiles";

import { MANUAL_PACK_CACHE_NAME } from "@/lib/offline-cache";
import type { PackBounds, RegionRecord } from "@/lib/types";

type LatLng = { lat: number; lng: number };

export function headerToBounds(header: Pick<Header, "minLat" | "minLon" | "maxLat" | "maxLon">): PackBounds {
  return {
    min_lat: header.minLat,
    min_lng: header.minLon,
    max_lat: header.maxLat,
    max_lng: header.maxLon,
  };
}

export async function readPackBoundsFromUrl(url: string) {
  const archive = new PMTiles(url);
  return headerToBounds(await archive.getHeader());
}

export async function readPackBoundsFromFile(file: File) {
  const archive = new PMTiles(new FileSource(file));
  return headerToBounds(await archive.getHeader());
}

export function boundsContainLocation(bounds: PackBounds | null | undefined, point: LatLng) {
  if (!bounds) {
    return false;
  }
  return (
    point.lat >= bounds.min_lat &&
    point.lat <= bounds.max_lat &&
    point.lng >= bounds.min_lng &&
    point.lng <= bounds.max_lng
  );
}

export const packContainsCenter = boundsContainLocation;

export function pickRegionForCenter(regions: RegionRecord[], point: LatLng, preferredPackId?: string | null) {
  if (regions.length === 0) {
    return null;
  }

  const containing = regions.filter((item) => boundsContainLocation(item.bounds, point));
  const pool = containing.length > 0 ? containing : regions;

  return [...pool].sort((left, right) => {
    if (preferredPackId) {
      if (left.pack_id === preferredPackId) {
        return -1;
      }
      if (right.pack_id === preferredPackId) {
        return 1;
      }
    }

    if (left.cache_status === "cached" && right.cache_status !== "cached") {
      return -1;
    }
    if (right.cache_status === "cached" && left.cache_status !== "cached") {
      return 1;
    }

    return distanceToBoundsKm(left.bounds, point) - distanceToBoundsKm(right.bounds, point);
  })[0];
}

export const chooseRegionForCenter = pickRegionForCenter;

export async function enrichRegionsWithBounds(regions: RegionRecord[]): Promise<RegionRecord[]> {
  const nextRegions = await Promise.all(
    regions.map(async (region) => {
      if (region.bounds) {
        return region;
      }

      const bounds = await readStoredOrRemoteBounds(region);
      return bounds ? { ...region, bounds } : region;
    }),
  );

  return nextRegions;
}

async function readStoredOrRemoteBounds(region: RegionRecord) {
  try {
    if (typeof window !== "undefined" && "caches" in window && region.cache_status === "cached") {
      const cache = await caches.open(MANUAL_PACK_CACHE_NAME);
      const cached = await cache.match(region.url);
      if (cached) {
        const blob = await cached.blob();
        const file = new File([blob], `${region.pack_id}.pmtiles`, { type: blob.type || "application/octet-stream" });
        return await readPackBoundsFromFile(file);
      }
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return null;
    }

    const absoluteUrl =
      typeof window === "undefined" ? region.url : new URL(region.url, window.location.origin).toString();
    return await readPackBoundsFromUrl(absoluteUrl);
  } catch {
    return null;
  }
}

function distanceToBoundsKm(bounds: PackBounds | null | undefined, point: LatLng) {
  if (!bounds) {
    return Number.POSITIVE_INFINITY;
  }
  const nearestLat = clamp(point.lat, bounds.min_lat, bounds.max_lat);
  const nearestLng = clamp(point.lng, bounds.min_lng, bounds.max_lng);
  return haversineKm(point.lat, point.lng, nearestLat, nearestLng);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(lat2 - lat1);
  const lngDelta = toRadians(lng2 - lng1);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

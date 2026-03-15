import type { OfflinePack, Place, RegionPlaceRecord, RegionRecord } from "@/lib/types";

export function toRegionRecord(pack: OfflinePack): RegionRecord {
  return {
    pack_id: pack.pack_id,
    region_name: pack.region_name,
    url: pack.url,
    size_bytes: pack.size_bytes,
    version_hash: pack.version_hash,
    updated_at: pack.updated_at,
    downloaded_at: null,
    cache_status: "pending",
    bounds: null,
  };
}

export function mergeRegionRecords(current: RegionRecord[], incoming: OfflinePack[]) {
  const existing = new Map(current.map((item) => [item.pack_id, item]));
  return incoming.map((pack) => {
    const next = toRegionRecord(pack);
    const prev = existing.get(pack.pack_id);
    if (!prev) {
      return next;
    }
    if (prev.version_hash !== next.version_hash || prev.url !== next.url) {
      return next;
    }
    return {
      ...next,
      downloaded_at: prev.downloaded_at ?? null,
      cache_status: prev.cache_status,
      bounds: prev.bounds ?? null,
    };
  });
}

export function upsertRegionRecord(current: RegionRecord[], next: RegionRecord) {
  const filtered = current.filter((item) => item.pack_id !== next.pack_id);
  return [next, ...filtered];
}

export function toRegionPlaceRecords(packs: OfflinePack[], places: Place[]): RegionPlaceRecord[] {
  return packs.flatMap((pack) =>
    places.map((place) => ({
      compound_id: `${pack.pack_id}:${place.place_id}`,
      pack_id: pack.pack_id,
      place_id: place.place_id,
      place,
    })),
  );
}

export function restorePlacesFromRegionRecords(records: RegionPlaceRecord[]) {
  const map = new Map<string, Place>();
  for (const record of records) {
    map.set(record.place_id, record.place);
  }
  return Array.from(map.values()).sort((left, right) => left.place_name.localeCompare(right.place_name, "ru"));
}

export async function requestPersistentStorage() {
  if (typeof navigator === "undefined" || !("storage" in navigator) || typeof navigator.storage.persist !== "function") {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

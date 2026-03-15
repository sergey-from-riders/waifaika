export const APP_CACHE_NAME = "wifiyka-shell-v4";
export const DATA_CACHE_NAME = "wifiyka-data-v4";
export const PACK_CACHE_NAME = "wifiyka-offline-packs-v4";
export const MANUAL_PACK_CACHE_NAME = "wifiyka-manual-packs";

const OFFLINE_CACHE_NAMES = [DATA_CACHE_NAME, PACK_CACHE_NAME, MANUAL_PACK_CACHE_NAME];

export async function clearOfflineCaches() {
  if (!("caches" in window)) {
    return;
  }
  await Promise.all(OFFLINE_CACHE_NAMES.map((name) => caches.delete(name)));
}

export async function readOfflineUsageBytes() {
  if ("storage" in navigator && typeof navigator.storage.estimate === "function") {
    const estimate = await navigator.storage.estimate();
    if (typeof estimate.usage === "number") {
      return estimate.usage;
    }
  }

  if (!("caches" in window)) {
    return 0;
  }

  let total = 0;
  for (const cacheName of OFFLINE_CACHE_NAMES) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) {
        continue;
      }
      const blob = await response.clone().blob();
      total += blob.size;
    }
  }
  return total;
}

export function formatStorageUsage(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 МБ";
  }

  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(1)} ГБ`;
  }
  if (megabytes >= 100) {
    return `${megabytes.toFixed(0)} МБ`;
  }
  return `${megabytes.toFixed(1)} МБ`;
}

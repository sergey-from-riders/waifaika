const APP_CACHE = "wifiyka-shell-v6";
const DATA_CACHE = "wifiyka-data-v4";
const PACK_CACHE = "wifiyka-offline-packs-v4";
const MANUAL_PACK_CACHE = "wifiyka-manual-packs";
const APP_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/logo.svg",
  "/favicon.svg",
  "/apple-touch-icon.svg",
  "/asset-manifest.json",
  "/api-docs.html",
  "/openapi.yaml",
  "/swagger-ui/swagger-ui.css",
  "/swagger-ui/swagger-ui-bundle.js",
];

async function discoverBuildAssets() {
  try {
    const response = await fetch("/asset-manifest.json", { cache: "no-cache" });
    if (!response.ok) {
      return [];
    }
    const manifest = await response.json();
    const urls = [];
    for (const entry of Object.values(manifest)) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      if (typeof entry.file === "string") {
        urls.push(`/${entry.file.replace(/^\/+/, "")}`);
      }
      if (Array.isArray(entry.css)) {
        for (const cssFile of entry.css) {
          urls.push(`/${String(cssFile).replace(/^\/+/, "")}`);
        }
      }
      if (Array.isArray(entry.assets)) {
        for (const assetFile of entry.assets) {
          urls.push(`/${String(assetFile).replace(/^\/+/, "")}`);
        }
      }
    }
    return urls;
  } catch (error) {
    console.warn("sw manifest discovery failed", error);
    return [];
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const buildAssets = await discoverBuildAssets();
      if (buildAssets.length === 0) {
        throw new Error("sw manifest discovery returned no build assets");
      }
      const cache = await caches.open(APP_CACHE);
      await cache.addAll(Array.from(new Set([...APP_ASSETS, ...buildAssets])));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![APP_CACHE, DATA_CACHE, PACK_CACHE, MANUAL_PACK_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (request.method === "GET" && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (request.method === "GET" && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (request.method === "GET" && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    return cached;
  }
  const networkResponse = await networkPromise;
  return networkResponse || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.headers.has("range")) {
    return;
  }

  if (url.pathname.startsWith("/offline-packs/")) {
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/logo.svg" ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/apple-touch-icon.svg" ||
    url.pathname === "/asset-manifest.json" ||
    url.pathname === "/api-docs.html" ||
    url.pathname === "/openapi.yaml" ||
    url.pathname === "/swagger-ui/swagger-ui.css" ||
    url.pathname === "/swagger-ui/swagger-ui-bundle.js"
  ) {
    event.respondWith(cacheFirst(request, APP_CACHE));
    return;
  }

  if (
    url.pathname.startsWith("/api/v1/session/bootstrap") ||
    url.pathname.startsWith("/api/v1/sync/bootstrap") ||
    url.pathname.startsWith("/api/v1/offline/manifest") ||
    url.pathname.startsWith("/api/v1/me")
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/v1/")) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(APP_CACHE);
        return (await cache.match("/")) || Response.error();
      }),
    );
  }
});

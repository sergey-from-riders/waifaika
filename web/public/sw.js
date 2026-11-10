const APP_CACHE = "wifiyka-shell-__BUILD_VERSION__";
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
      const assets = await discoverBuildAssets();
      if (!assets.length) throw new Error("Build manifest unavailable");
      const cache = await caches.open(APP_CACHE);
      await cache.addAll([...new Set([...APP_ASSETS, ...assets])]);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Keep the previous shell for already-open tabs. Never delete another app's caches.
      const shells = (await caches.keys()).filter(
        (k) => k.startsWith("wifiyka-shell-") && k !== APP_CACHE,
      );
      const obsolete = (await caches.keys()).filter(
        (k) =>
          k.startsWith("wifiyka-data-") ||
          k.startsWith("wifiyka-offline-packs-"),
      );
      await Promise.all(
        [...shells.slice(0, -1), ...obsolete].map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});
async function shellAsset(request) {
  const cache = await caches.open(APP_CACHE);
  // Precache requests and module requests can have different Origin/Accept headers.
  // These are immutable public assets; their bytes do not vary by account/header.
  const cached =
    (await cache.match(request, { ignoreVary: true })) ||
    (await caches.match(request, { ignoreVary: true }));
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    try {
      await cache.put(request, response.clone());
    } catch {
      /* Storage pressure must not break online use. */
    }
  }
  return response;
}
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range")
  )
    return;
  // Account-specific API state belongs in user-scoped IndexedDB, never a URL-only HTTP cache.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/offline-packs/") ||
    url.pathname === "/healthz" ||
    url.pathname === "/readyz"
  )
    return;
  if (
    url.pathname.startsWith("/assets/") ||
    (url.pathname !== "/" && APP_ASSETS.includes(url.pathname))
  ) {
    event.respondWith(shellAsset(request));
  } else if (
    request.mode === "navigate" &&
    (/^\/(?:tech|about|activity|regions|profile)?\/?$/.test(url.pathname) ||
      url.pathname.startsWith("/place/"))
  ) {
    event.respondWith(
      (async () => {
        // Serve the shell and its assets from the same release, even on a slow/flaky connection.
        const cache = await caches.open(APP_CACHE);
        return (await cache.match("/")) || fetch(request);
      })(),
    );
  }
});

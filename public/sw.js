const CACHE_NAME = "erratic-maps-static-v1";
const TILE_CACHE_NAME = "erratic-maps-tiles-v1";
const TILE_ORIGINS = ["https://tiles.openfreemap.org"];
const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/icon-maskable.png",
  "/assets/favicon-32.png",
  "/assets/favicon-16.png",
  "/assets/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        APP_SHELL_ASSETS.map(async (asset) => {
          const response = await fetch(asset, { cache: "no-cache" });
          if (!response.ok) {
            return;
          }
          await cache.put(asset, response);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== TILE_CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (TILE_ORIGINS.some((origin) => url.origin === origin)) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        }),
      ),
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  const isNavigation = request.mode === "navigate";

  if (isNavigation) {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});

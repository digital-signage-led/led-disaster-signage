const STATIC_CACHE = "led-static-v2";
const DATA_CACHE = "led-data-v1";
const STATIC_EXT = /\.(?:html|css|js|mjs|geojson|svg|png|gif|woff2?|ttf|map)$/i;
const JMA_HOST = /(?:^|\.)jma\.go\.jp$/i;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll([
      "./",
      "./index.html",
      "./admin.html",
      "./css/signage.css",
      "./css/admin.css",
      "./js/app.js",
      "./js/admin.js",
      "./js/data/contents.js",
      "./js/data/prefectures.js",
      "./vendor/leaflet/leaflet.css",
      "./vendor/leaflet/leaflet.js"
    ].map((path) => new Request(path, { cache: "reload" }))).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isStatic(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.includes("/api/jma-proxy")) return false;
  return STATIC_EXT.test(url.pathname) || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request) || await cache.match(request, { ignoreSearch: true });
  if (cached) {
    fetch(request).then((res) => {
      if (res.ok) cache.put(request, res.clone());
    }).catch(() => {});
    return cached;
  }
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  const pending = fetch(request).then(async (res) => {
    if (res.ok) {
      await cache.put(request, res.clone());
      pruneDataCache(cache);
    }
    return res;
  });
  return cached || pending;
}

async function pruneDataCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= 40) return;
  await Promise.all(keys.slice(0, keys.length - 40).map((key) => cache.delete(key)));
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (JMA_HOST.test(url.hostname) || url.pathname.includes("/api/jma-proxy")) {
    if (url.pathname.includes("/jmatile/")) {
      event.respondWith(staleWhileRevalidate(event.request));
    }
    return;
  }
  if (isStatic(url)) {
    event.respondWith(cacheFirst(event.request));
  }
});

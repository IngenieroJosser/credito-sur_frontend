const STATIC_CACHE = "static-v1";
const API_CACHE = "api-v1";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll([
        "/",
        "/offline",
        "/favicon.ico",
        "/manifest.json",
        "/android-chrome-192x192.png",
        "/android-chrome-512x512.png"
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== API_CACHE)
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.url.includes("/api")) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  return cached || fetch(req);
}

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(API_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return caches.match(req) || new Response("Offline", { status: 503 });
  }
}

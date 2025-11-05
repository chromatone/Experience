const CACHE = 'app-cache-v2';  // bump this to update cache
const PRECACHE_ASSETS = [
  '/',            // the root
  '/index.html',  // your entry point
  // optionally add main JS or CSS if you know them upfront
];

self.addEventListener('install', (event) => {
  // Precache known essential files
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Always serve index.html for navigation requests
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        return (
          cached ||
          fetch('/index.html')
            .then((r) => {
              if (r.ok) {
                caches.open(CACHE).then((cache) => cache.put('/index.html', r.clone()));
              }
              return r;
            })
            .catch(() => cached)
        );
      })
    );
    return;
  }

  // For other assets (JS, CSS, MP3, images, etc.)
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((response) => {
            // Cache successful responses (including mp3s, blobs, etc.)
            if (response.ok) {
              cache.put(req, response.clone());
            }
            return response;
          })
          .catch(() => cached); // Use cached if offline

        // Return cached immediately if present, otherwise wait for network
        return cached || networkFetch;
      })
    )
  );
});

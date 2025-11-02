const CACHE = 'v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.open(CACHE).then(cache => {
      return cache.match(e.request).then(cached => {
        // Serve cached version immediately
        const fetchPromise = fetch(e.request).then(response => {
          // Update cache in background
          if (response.ok) {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(() => cached); // Fallback to cache on network error

        // Return cached immediately, or fetch if not cached
        return cached || fetchPromise;
      });
    })
  );
});
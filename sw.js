/**
 * PerformanceIQ — Service Worker
 * Cache-first strategy for static assets, network-first for API calls.
 */

const CACHE_NAME = 'piq-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/app.js',
  '/js/router.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          // Cache successful responses for JS/CSS
          if (response.ok && event.request.url.match(/\.(js|css)$/)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }))
      )
  );
});

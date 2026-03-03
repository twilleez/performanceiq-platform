/* sw.js — offline cache
   FIX: was caching core.js (old entry point). Updated to cache app.js + boot.js.
   FIX: cache version bumped so stale sw.js is replaced on next install.
   IMPROVEMENT: network-first for JS modules so updates aren't blocked by stale cache.
*/
const CACHE_NAME = 'performanceiq-cache-v3';

// Static shell assets — cache-first
const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

// JS module entry points — network-first (fresh code matters)
const MODULE_ASSETS = [
  './js/app.js',
  './js/boot.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([...SHELL_ASSETS, ...MODULE_ASSETS]))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] install cache error', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GETs
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isModule = MODULE_ASSETS.some(p => url.pathname.endsWith(p.replace('./', '/')));

  if (isModule) {
    // Network-first: try network, fall back to cache
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else {
    // Cache-first for shell assets
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});

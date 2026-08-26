/**
 * PerformanceIQ Service Worker — piq-v7
 * Scope-aware for GitHub Pages project hosting.
 */

const CACHE_NAME  = 'piq-v7';
const SHELL_CACHE = 'piq-shell-v7';
const scopeUrl = new URL(self.registration.scope);
const scoped = rel => new URL(rel, scopeUrl).toString();

const SHELL_FILES = [
  scoped('./'),
  scoped('index.html'),
  scoped('styles.css'),
  scoped('manifest.json'),
];

const PASSTHROUGH_ORIGINS = [
  'supabase.co',
  'supabase.com',
  'googleapis.com',
  'gstatic.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com',
  'esm.sh',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Install cache failed:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== SHELL_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (PASSTHROUGH_ORIGINS.some(origin => url.hostname.includes(origin))) return;
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  const isNavigate = event.request.mode === 'navigate';
  const isJSModule = url.pathname.endsWith('.js');
  const isAsset = /\.(css|png|jpg|jpeg|gif|webp|svg|woff2?|ico)$/.test(url.pathname);

  if (isNavigate) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(scoped('index.html')))
    );
    return;
  }

  if (isJSModule || isAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

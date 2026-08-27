/**
 * PerformanceIQ Service Worker — piq-v8
 * Scope-aware for GitHub Pages project hosting.
 * Production code/assets use network-first so a new deploy is not hidden by
 * an older cached JS/CSS bundle. Cache remains the offline fallback.
 */

const CACHE_NAME  = 'piq-v8';
const SHELL_CACHE = 'piq-shell-v8';
const scopeUrl = new URL(self.registration.scope);
const scoped = rel => new URL(rel, scopeUrl).toString();

const SHELL_FILES = [
  scoped('./'),
  scoped('index.html'),
  scoped('styles.css'),
  scoped('manifest.json'),
];

const PASSTHROUGH_ORIGINS = [
  'supabase.co', 'supabase.com', 'googleapis.com', 'gstatic.com',
  'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com', 'esm.sh',
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
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== SHELL_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (PASSTHROUGH_ORIGINS.some(origin => url.hostname.includes(origin))) return;
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  const isNavigate = event.request.mode === 'navigate';
  const isVersionedAppAsset = url.origin === scopeUrl.origin && /\.(js|css|json)$/.test(url.pathname);
  const isStaticMedia = /\.(png|jpg|jpeg|gif|webp|svg|woff2?|ico)$/.test(url.pathname);

  if (isNavigate || isVersionedAppAsset) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || (isNavigate ? caches.match(scoped('index.html')) : undefined)))
    );
    return;
  }

  if (isStaticMedia) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }))
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

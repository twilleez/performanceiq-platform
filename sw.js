// sw.js — PerformanceIQ Service Worker v4.1 (FIXED)
// FIXES:
// - Removed 7 phantom files that don't exist (boot.js, dataStore.js, etc.)
// - Changed absolute paths (/) to relative paths (./) for GitHub Pages subdirectory
// - Switched from cache.addAll to Promise.allSettled so one 404 doesn't kill install
// - Switched from cache-first to network-first to avoid serving stale content

const CACHE_NAME = 'piq-v4.1';

// ONLY files that actually exist in the repo
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './core.js',
  './manifest.webmanifest'
];

// ── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          ASSETS.map(url =>
            fetch(url).then(res => {
              if (res.ok) return cache.put(url, res);
              console.warn('[SW] Skip (not found):', url);
            }).catch(() => console.warn('[SW] Skip (error):', url))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — Network-first with cache fallback ───────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Network-first for API / Supabase
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{"offline":true}', { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Network-first for app files, cache fallback for offline
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached => cached || caches.match('./index.html'))
    )
  );
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'PerformanceIQ', body: e.data.text() }; }

  const options = {
    body:  data.body  || 'You have a new update',
    icon:  data.icon  || './icons/icon-192.png',
    badge: './icons/icon-72.png',
    data:  { url: data.url || './' },
    vibrate: [100, 50, 100],
    actions: data.actions || []
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'PerformanceIQ', options)
  );
});

// ── NOTIFICATION CLICK ───────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'navigate', url });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

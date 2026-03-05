// sw.js — PerformanceIQ Service Worker v4.0
// [FIX 6] PWA install + offline support
// [FIX 2] Push notification handler

const CACHE_NAME = 'piq-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/core.js',
  '/boot.js',
  '/dataStore.js',
  '/analyticsEngine.js',
  '/performanceEngine.js',
  '/nutritionEngine.js',
  '/periodizationEngine.js',
  '/authStore.js',
  '/manifest.webmanifest'
];

// ── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
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

// ── FETCH — Cache-first for assets, network-first for API ───
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-first for API / Supabase
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"offline":true}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
// [FIX 2] Handle incoming push events
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'PerformanceIQ', body: e.data.text() }; }

  const options = {
    body:  data.body  || 'You have a new update',
    icon:  data.icon  || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data:  { url: data.url || '/' },
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
  const url = e.notification.data?.url || '/';

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

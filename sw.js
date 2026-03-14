// PerformanceIQ Service Worker — Offline + Push
const CACHE = 'piq-v1';
const OFFLINE_URLS = ['./index.html', './manifest.json'];

// ── Install: cache shell ─────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for shell ──────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Pass through Supabase API calls — never cache
  if (url.hostname.includes('supabase.co') || url.hostname.includes('jsdelivr.net')) {
    return;
  }
  // Navigation requests — serve index.html from cache (SPA fallback)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Static assets — cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200 && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'PerformanceIQ', body: 'You have a new update.', icon: './icon-192.png', tag: 'piq-default' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag,
      data: data.url ? { url: data.url } : {},
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
    })
  );
});

// ── Notification click: focus or open app ────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(targetUrl) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Background sync: flush offline queue ────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'piq-sync') {
    e.waitUntil(
      self.clients.matchAll().then(cls =>
        cls.forEach(c => c.postMessage({ type: 'SYNC_REQUESTED' }))
      )
    );
  }
});

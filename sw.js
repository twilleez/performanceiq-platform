// sw.js — PerformanceIQ Service Worker v4
const CACHE_NAME = 'piq-v4'
const BASE = self.location.pathname.replace('/sw.js', '')

const SHELL_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/css/tokens.css',
  BASE + '/css/layout.css',
  BASE + '/css/nav-bar.css',
  BASE + '/css/boot-loader.css',
  BASE + '/css/empty-states.css',
  BASE + '/css/session-ready.css',
  BASE + '/css/tooltips.css',
  BASE + '/css/toast.css',
  BASE + '/css/auth.css',
  BASE + '/css/onboarding.css',
  BASE + '/css/components.css',
  BASE + '/js/app.js',
  BASE + '/js/core/boot.js',
  BASE + '/js/core/router.js',
  BASE + '/js/core/supabase.js',
]

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .catch(err => console.warn('[SW] partial cache:', err.message))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Pass through external requests untouched
  if (!url.hostname.includes('github.io') && url.hostname !== location.hostname) return

  // Navigation → serve shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE + '/index.html')
        .then(r => r || fetch(event.request))
        .catch(() => _offline())
    )
    return
  }

  // Static assets → cache-first
  if (/\.(css|js|png|jpg|jpeg|svg|ico|woff2?)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()))
          }
          return res
        }).catch(() => new Response('', { status: 404 }))
      })
    )
  }
})

self.addEventListener('push', event => {
  const d = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(d.title ?? 'PerformanceIQ', {
      body: d.body ?? '', icon: BASE + '/icons/icon-192.png',
      data: { url: d.action_url ?? BASE + '/' }, tag: d.type ?? 'piq'
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = event.notification.data?.url ?? BASE + '/'
      list.length ? (list[0].focus(), list[0].navigate(url)) : clients.openWindow(url)
    })
  )
})

function _offline() {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Offline — PerformanceIQ</title>
    <style>body{margin:0;background:#010D14;color:#D0EEF4;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
    h1{color:#6FD94F}button{margin-top:16px;padding:10px 24px;background:#6FD94F;color:#010D14;border:none;border-radius:8px;font-weight:700;cursor:pointer}</style>
    </head><body><div><div style="font-size:48px">📴</div><h1>Offline</h1><p>Data saved locally — will sync on reconnect.</p>
    <button onclick="location.reload()">Retry</button></div></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

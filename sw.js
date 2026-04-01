/**
 * PerformanceIQ Service Worker — piq-v6
 *
 * FIXES:
 * [Error-1] TypeError: Failed to execute 'clone' on Response: body already used
 *           → clone() was called AFTER body was consumed. Now cloned BEFORE read.
 * [Error-2] SW was intercepting Supabase API calls and attempting to cache them,
 *           causing 500s and the clone error. Supabase (and all external API)
 *           requests now pass straight through — never cached.
 *
 * Strategy:
 *   - App shell + JS modules: Cache-first (offline works)
 *   - Supabase / any external API: Network-only, pass through untouched
 *   - Everything else: Network-first with cache fallback
 */

const CACHE_NAME  = 'piq-v6';
const SHELL_CACHE = 'piq-shell-v6';

// Files to pre-cache on install (app shell)
const SHELL_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
];

// Domains that must NEVER be cached — pass through immediately
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

// ── INSTALL ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Install cache failed:', err))
  );
});

// ── ACTIVATE ──────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== SHELL_CACHE)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // [Fix Error-1,2] — NEVER intercept external APIs, especially Supabase.
  // Pass through completely — no cloning, no caching, no touching.
  const isPassthrough = PASSTHROUGH_ORIGINS.some(origin =>
    url.hostname.includes(origin)
  );
  if (isPassthrough) {
    // Do NOT call event.respondWith() — browser handles it natively
    return;
  }

  // Non-GET requests (POST, PUT, DELETE etc.) — always network, never cache
  if (event.request.method !== 'GET') {
    return; // Let browser handle
  }

  // Chrome extension requests — ignore
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  const isNavigate = event.request.mode === 'navigate';
  const isJSModule = url.pathname.endsWith('.js');
  const isAsset    = /\.(css|png|jpg|jpeg|gif|webp|svg|woff2?|ico)$/.test(url.pathname);

  // ── Strategy: Network-first for navigation (always fresh HTML)
  if (isNavigate) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          // [Fix Error-1] Clone BEFORE any body consumption
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // ── Strategy: Cache-first for JS modules and static assets
  if (isJSModule || isAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          // [Fix Error-1] Clone BEFORE returning — original goes to caller, clone to cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // ── Default: Network-first, cache fallback
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

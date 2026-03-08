// sw.js — PerformanceIQ Service Worker v4.2 (module-build aligned)

const CACHE_NAME = "piq-v4.2";

// ONLY files that match the current build (index.html -> styles.css + js/app.js)
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/app.js",
  "./js/boot.js",
  "./manifest.webmanifest",
];

// ── INSTALL ─────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          ASSETS.map((url) =>
            fetch(url)
              .then((res) => {
                if (res.ok) return cache.put(url, res);
                console.warn("[SW] Skip (not found):", url);
              })
              .catch(() => console.warn("[SW] Skip (error):", url))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── FETCH — Network-first with cache fallback ───────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Network-first for API / Supabase
  if (url.hostname.includes("supabase") || url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request).catch(
        () => new Response('{"offline":true}', { headers: { "Content-Type": "application/json" } })
      )
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});

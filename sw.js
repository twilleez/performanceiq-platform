/**
 * PerformanceIQ — Service Worker v4
 * ─────────────────────────────────────────────────────────────
 * Phase 4 PWA upgrade:
 *
 *   STATIC_ASSETS   — shell, styles, core JS (install-time cache)
 *   VIEW_MODULES    — all 57 view JS files (install-time cache)
 *
 *   Strategy: Cache-first for static assets and view modules.
 *   Network-first for state/API (localStorage-based, so N/A here).
 *   Offline fallback serves index.html for navigation requests.
 *
 *   Install prompt: handled in app.js via beforeinstallprompt.
 *   Cache versioned — bump CACHE_NAME to force re-install.
 */

const CACHE_NAME  = 'piq-v4';
const BASE        = '/performanceiq-platform/';

const STATIC_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'styles.css',
  BASE + 'manifest.json',
  BASE + 'js/app.js',
  BASE + 'js/router.js',
  BASE + 'js/core/auth.js',
  BASE + 'js/core/boot.js',
  BASE + 'js/core/theme.js',
  BASE + 'js/core/notifications.js',
  BASE + 'js/state/state.js',
  BASE + 'js/state/selectors.js',
  BASE + 'js/state/selectorsElite.js',
  BASE + 'js/services/engines.js',
  BASE + 'js/services/storage.js',
  BASE + 'js/components/nav.js',
  BASE + 'js/data/workoutEngine.js',
  BASE + 'js/data/exerciseLibrary.js',
];

const VIEW_MODULES = [
  // Shared
  'js/views/shared/welcome.js',
  'js/views/shared/signin.js',
  'js/views/shared/signup.js',
  'js/views/shared/pickRole.js',
  'js/views/shared/onboarding.js',
  'js/views/shared/settingsTheme.js',
  'js/views/shared/settingsProfile.js',
  // Coach
  'js/views/coach/home.js',
  'js/views/coach/team.js',
  'js/views/coach/roster.js',
  'js/views/coach/programBuilder.js',
  'js/views/coach/readiness.js',
  'js/views/coach/analytics.js',
  'js/views/coach/messages.js',
  'js/views/coach/calendar.js',
  'js/views/coach/reports.js',
  'js/views/coach/settings.js',
  // Player
  'js/views/player/home.js',
  'js/views/player/todayWorkout.js',
  'js/views/player/logWorkout.js',
  'js/views/player/progress.js',
  'js/views/player/score.js',
  'js/views/player/readiness.js',
  'js/views/player/mindset.js',
  'js/views/player/nutrition.js',
  'js/views/player/messages.js',
  'js/views/player/calendar.js',
  'js/views/player/recruiting.js',
  'js/views/player/settings.js',
  // Parent
  'js/views/parent/home.js',
  'js/views/parent/childOverview.js',
  'js/views/parent/weeklyPlan.js',
  'js/views/parent/progress.js',
  'js/views/parent/wellness.js',
  'js/views/parent/messages.js',
  'js/views/parent/billing.js',
  'js/views/parent/settings.js',
  // Admin
  'js/views/admin/home.js',
  'js/views/admin/org.js',
  'js/views/admin/teams.js',
  'js/views/admin/coaches.js',
  'js/views/admin/athletes.js',
  'js/views/admin/adoption.js',
  'js/views/admin/reports.js',
  'js/views/admin/compliance.js',
  'js/views/admin/billing.js',
  'js/views/admin/settings.js',
  // Solo
  'js/views/solo/home.js',
  'js/views/solo/todayWorkout.js',
  'js/views/solo/builder.js',
  'js/views/solo/library.js',
  'js/views/solo/progress.js',
  'js/views/solo/score.js',
  'js/views/solo/readiness.js',
  'js/views/solo/mindset.js',
  'js/views/solo/nutrition.js',
  'js/views/solo/goals.js',
  'js/views/solo/subscription.js',
  'js/views/solo/settings.js',
].map(p => BASE + p);

const ALL_CACHED = [...STATIC_ASSETS, ...VIEW_MODULES];

// ── INSTALL — cache everything ────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache static assets immediately; view modules best-effort
        return cache.addAll(STATIC_ASSETS).then(() =>
          Promise.allSettled(VIEW_MODULES.map(url =>
            cache.add(url).catch(() => {}) // individual failures don't block install
          ))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — purge old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH — cache-first for app files, network-first otherwise ─
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Navigation requests → serve index.html (SPA fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE + 'index.html')
        .then(cached => cached || fetch(event.request))
        .catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }

  // JS / CSS files → cache-first
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Everything else → network with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

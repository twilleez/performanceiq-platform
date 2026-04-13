// js/core/boot.js — PerformanceIQ
// App entry point. Called once from js/app.js.
// Initializes auth, PWA service worker, and online/offline detection.
// NOTE: Router is initialized by app.js directly via js/router.js — not here.

import { initAuth }         from './supabase.js'
import { flushOfflineQueue } from '../services/workoutService.js'
import { initTheme }        from './theme.js'

// ── BOOT ──────────────────────────────────────────────────────
export async function boot() {
  try {
    // 0. Apply theme immediately — prevents flash of wrong theme
    initTheme()

    // 1. Init auth (loads session + profile from Supabase/localStorage)
    await initAuth()

    // 2. Register PWA service worker
    await _registerSW()

    // 3. Online/offline detection + offline queue flush
    _initNetworkDetection()

    // 4. Remove boot loader
    _hideBoot()

    console.log('[PIQ] Boot complete')
  } catch (err) {
    console.error('[PIQ] Boot error:', err)
    _showBootError(err.message)
  }
}

// ── PWA SERVICE WORKER ────────────────────────────────────────
async function _registerSW() {
  if (!('serviceWorker' in navigator)) return

  try {
    const swPath = location.pathname.replace(/\/[^/]*$/, '/sw.js')
    const scope  = location.pathname.replace(/\/[^/]*$/, '/')
    const reg = await navigator.serviceWorker.register(swPath, { scope })
    console.log('[PIQ] SW registered:', reg.scope)

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          _showUpdateBanner()
        }
      })
    })
  } catch (err) {
    console.warn('[PIQ] SW registration failed:', err.message)
  }
}

// ── NETWORK DETECTION ─────────────────────────────────────────
function _initNetworkDetection() {
  const setOnline  = () => { document.body.classList.remove('piq-offline'); flushOfflineQueue() }
  const setOffline = () => document.body.classList.add('piq-offline')

  window.addEventListener('online',  setOnline)
  window.addEventListener('offline', setOffline)
  if (!navigator.onLine) setOffline()
}

// ── BOOT LOADER ───────────────────────────────────────────────
function _hideBoot() {
  const loader = document.getElementById('piq-boot-loader')
  if (!loader) return
  document.body.classList.add('piq-loaded')
  setTimeout(() => loader.remove(), 400)
}

function _showBootError(msg) {
  const loader = document.getElementById('piq-boot-loader')
  if (!loader) return
  loader.innerHTML = `
    <div style="text-align:center;color:#ef4444;font-family:sans-serif;padding:24px">
      <div style="font-size:24px;margin-bottom:8px">⚠️</div>
      <div style="font-weight:600;margin-bottom:4px">Failed to start</div>
      <div style="font-size:12px;opacity:0.7">${msg}</div>
      <button onclick="location.reload()" style="margin-top:16px;padding:8px 16px;background:#39e66b;border:none;border-radius:6px;cursor:pointer;font-weight:600">Retry</button>
    </div>
  `
}

// ── UPDATE BANNER ─────────────────────────────────────────────
function _showUpdateBanner() {
  if (document.getElementById('piq-update-banner')) return
  const banner = document.createElement('div')
  banner.id = 'piq-update-banner'
  banner.innerHTML = `<span>🚀 Update available</span><button onclick="location.reload()">Refresh</button>`
  banner.style.cssText = `
    position:fixed;bottom:72px;left:50%;transform:translateX(-50%);
    background:#0D1B40;color:white;border:1px solid rgba(57,230,107,0.4);
    border-radius:10px;padding:10px 18px;display:flex;align-items:center;gap:12px;
    font-family:'DM Sans',sans-serif;font-size:13px;z-index:9999;
    box-shadow:0 4px 20px rgba(0,0,0,0.3);
  `
  banner.querySelector('button').style.cssText = `
    background:#39e66b;color:#0D1B40;border:none;border-radius:6px;
    padding:5px 12px;font-weight:700;cursor:pointer;font-family:inherit;
  `
  document.body.appendChild(banner)
}

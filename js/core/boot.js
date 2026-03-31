// js/core/boot.js — PerformanceIQ
// App entry point. Called once from index.html.
// Initializes auth, router, PWA, and online/offline detection.

import { initAuth } from './supabase.js'
import { initRouter, navigate } from './router.js'
import { flushOfflineQueue } from '../services/sessionService.js'

// ── BOOT ──────────────────────────────────────────────────────
export async function boot() {
  try {
    // 1. Init auth (loads session + profile from Supabase/localStorage)
    await initAuth()

    // 2. Init router (resolves initial route, sets up listeners)
    initRouter()

    // 3. Register PWA service worker
    await _registerSW()

    // 4. Online/offline detection + offline queue flush
    _initNetworkDetection()

    // 5. Remove boot loader
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
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('[PIQ] SW registered:', reg.scope)

    // Prompt user to refresh when new SW is available
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
  const _setOnline  = () => { document.body.classList.remove('piq-offline'); flushOfflineQueue() }
  const _setOffline = () => { document.body.classList.add('piq-offline') }

  window.addEventListener('online',  _setOnline)
  window.addEventListener('offline', _setOffline)
  if (!navigator.onLine) _setOffline()
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
  if (loader) {
    loader.innerHTML = `
      <div style="text-align:center;color:#ef4444;font-family:sans-serif;padding:24px">
        <div style="font-size:24px;margin-bottom:8px">⚠️</div>
        <div style="font-weight:600;margin-bottom:4px">Failed to start</div>
        <div style="font-size:12px;opacity:0.7">${msg}</div>
        <button onclick="location.reload()" style="margin-top:16px;padding:8px 16px;background:#6FD94F;border:none;border-radius:6px;cursor:pointer;font-weight:600">Retry</button>
      </div>
    `
  }
}

// ── UPDATE BANNER ─────────────────────────────────────────────
function _showUpdateBanner() {
  const banner = document.createElement('div')
  banner.id = 'piq-update-banner'
  banner.innerHTML = `
    <span>🚀 Update available</span>
    <button onclick="window.location.reload()">Refresh</button>
  `
  banner.style.cssText = `
    position:fixed;bottom:72px;left:50%;transform:translateX(-50%);
    background:#0D1B40;color:white;border:1px solid rgba(111,217,79,0.4);
    border-radius:10px;padding:10px 18px;display:flex;align-items:center;gap:12px;
    font-family:'DM Sans',sans-serif;font-size:13px;z-index:9999;
    box-shadow:0 4px 20px rgba(0,0,0,0.3);
  `
  banner.querySelector('button').style.cssText = `
    background:#6FD94F;color:#010D14;border:none;border-radius:6px;
    padding:5px 12px;font-weight:700;cursor:pointer;font-family:inherit;
  `
  document.body.appendChild(banner)
}

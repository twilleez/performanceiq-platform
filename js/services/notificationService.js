// js/services/notificationService.js — PerformanceIQ
// FIX: .on('postgres_changes') must be chained BEFORE .subscribe()
// FIX: guard against calling subscribeToNotifications() twice (double channel)
// FIX: VAPID placeholder check — warn clearly instead of silently failing

import { supabase, getUser } from '../core/supabase.js'

// Replace this with your actual VAPID public key from your push server.
// If you don't have one yet, push subscriptions will log a warning and skip.
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY'

// ── PUSH SUBSCRIPTION ─────────────────────────────────────────

export async function requestPushPermission() {
  if (!('Notification' in window))      return false
  if (!('serviceWorker' in navigator))  return false

  if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY') {
    console.warn('[PIQ] Push notifications: VAPID_PUBLIC_KEY not configured. Skipping push setup.')
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const user = getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ push_subscription: JSON.stringify(sub) })
        .eq('id', user.id)
      if (error) console.warn('[PIQ] Push subscription save failed:', error.message)
    }

    return true
  } catch (err) {
    console.warn('[PIQ] Push subscription failed:', err.message)
    return false
  }
}

export async function getPushPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission   // 'default' | 'granted' | 'denied'
}

// ── IN-APP NOTIFICATIONS ──────────────────────────────────────

export async function getNotifications({ unreadOnly = false, limit = 20 } = {}) {
  const user = getUser()
  if (!user) return []

  let q = supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) q = q.eq('read', false)

  const { data, error } = await q
  if (error) {
    console.warn('[PIQ] getNotifications error:', error.message)
    return []
  }
  return data ?? []
}

export async function getUnreadCount() {
  const user = getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('read', false)

  if (error) {
    console.warn('[PIQ] getUnreadCount error:', error.message)
    return 0
  }
  return count ?? 0
}

export async function markRead(notificationId) {
  const user = getUser()
  if (!user) return

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('profile_id', user.id)

  if (error) console.warn('[PIQ] markRead error:', error.message)
}

export async function markAllRead() {
  const user = getUser()
  if (!user) return

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', user.id)
    .eq('read', false)

  if (error) console.warn('[PIQ] markAllRead error:', error.message)
}

// ── REAL-TIME LISTENER ────────────────────────────────────────
// Returns an unsubscribe function. Call it to clean up on logout / route change.
//
// FIX: .on() MUST be chained before .subscribe().
// Calling .subscribe() first and then .on() triggers:
//   "cannot add postgres_changes callbacks after subscribe()"

// Track active channel so we don't create duplicates
let _activeChannel = null

export function subscribeToNotifications(onNewNotification) {
  const user = getUser()
  if (!user) return () => {}

  // Guard: tear down any existing channel before creating a new one
  if (_activeChannel) {
    supabase.removeChannel(_activeChannel)
    _activeChannel = null
  }

  // ✅ CORRECT ORDER: .channel() → .on() → .subscribe()
  _activeChannel = supabase
    .channel(`notifications:${user.id}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `profile_id=eq.${user.id}`,
      },
      (payload) => {
        if (!payload.new) return
        onNewNotification(payload.new)
        _showToast(payload.new)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[PIQ] Notifications realtime: subscribed')
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[PIQ] Notifications realtime: channel error — will retry via polling')
      }
    })

  return () => {
    if (_activeChannel) {
      supabase.removeChannel(_activeChannel)
      _activeChannel = null
    }
  }
}

// ── IN-APP TOAST ──────────────────────────────────────────────

function _showToast(notif) {
  const toast = document.createElement('div')
  toast.className = 'piq-toast'
  toast.setAttribute('role', 'alert')
  toast.setAttribute('aria-live', 'polite')
  toast.innerHTML = `
    <div class="piq-toast__icon">🔔</div>
    <div class="piq-toast__content">
      <div class="piq-toast__title">${_esc(notif.title)}</div>
      ${notif.body ? `<div class="piq-toast__body">${_esc(notif.body)}</div>` : ''}
    </div>
    <button class="piq-toast__close" aria-label="Dismiss notification">✕</button>
  `

  if (notif.action_url) {
    toast.style.cursor = 'pointer'
    toast.addEventListener('click', (e) => {
      if (e.target.classList.contains('piq-toast__close')) return
      location.hash = '#' + notif.action_url
      toast.remove()
    })
  }

  toast.querySelector('.piq-toast__close').addEventListener('click', () => toast.remove())

  let container = document.getElementById('piq-toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'piq-toast-container'
    Object.assign(container.style, {
      position:      'fixed',
      top:           '72px',
      right:         '16px',
      zIndex:        '9999',
      display:       'flex',
      flexDirection: 'column',
      gap:           '8px',
      maxWidth:      '320px',
      pointerEvents: 'none',   // let clicks pass through the container
    })
    document.body.appendChild(container)
  }

  // Allow individual toasts to receive pointer events
  toast.style.pointerEvents = 'auto'
  container.appendChild(toast)

  // Auto-dismiss after 5s
  const timer = setTimeout(() => toast.remove(), 5000)
  toast.querySelector('.piq-toast__close').addEventListener('click', () => {
    clearTimeout(timer)
    toast.remove()
  })
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
}

// ── VAPID HELPER ──────────────────────────────────────────────

function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

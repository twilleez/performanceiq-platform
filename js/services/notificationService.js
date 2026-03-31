// js/services/notificationService.js — PerformanceIQ
//
// YOUR SCHEMA (notifications table added by migration):
//   id, profile_id, type, title, body, read, action_url, created_at

import { supabase, getUser } from '../core/supabase.js'

// ── IN-APP NOTIFICATIONS ──────────────────────────────────────

export async function getNotifications({ unreadOnly = false, limit = 30 } = {}) {
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
  if (error) return []
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

  return error ? 0 : (count ?? 0)
}

export async function markRead(notificationId) {
  const user = getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('profile_id', user.id)
}

export async function markAllRead() {
  const user = getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', user.id)
    .eq('read', false)
}

// ── REAL-TIME LISTENER ────────────────────────────────────────

export function subscribeToNotifications(onNew) {
  const user = getUser()
  if (!user) return () => {}

  const channel = supabase
    .channel(`notifications:${user.id}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'notifications',
      filter: `profile_id=eq.${user.id}`
    }, payload => {
      onNew(payload.new)
      _showToast(payload.new)
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}

// ── IN-APP TOAST ──────────────────────────────────────────────

function _showToast(notif) {
  const toast = document.createElement('div')
  toast.className = 'piq-toast'
  toast.innerHTML = `
    <div class="piq-toast__icon">🔔</div>
    <div class="piq-toast__content">
      <div class="piq-toast__title">${_esc(notif.title)}</div>
      ${notif.body ? `<div class="piq-toast__body">${_esc(notif.body)}</div>` : ''}
    </div>
    <button class="piq-toast__close" aria-label="Dismiss">✕</button>
  `

  if (notif.action_url) {
    toast.style.cursor = 'pointer'
    toast.addEventListener('click', e => {
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
      position: 'fixed', top: '72px', right: '16px', zIndex: '9999',
      display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px'
    })
    document.body.appendChild(container)
  }

  container.appendChild(toast)
  setTimeout(() => toast.remove(), 5000)
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────

const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY'

export async function requestPushPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: _urlBase64ToUint8(VAPID_PUBLIC_KEY)
    })
    const user = getUser()
    if (user) {
      await supabase.from('profiles')
        .update({ push_subscription: JSON.stringify(sub) })
        .eq('id', user.id)
    }
    return true
  } catch (err) {
    console.warn('[PIQ] push subscribe failed:', err.message)
    return false
  }
}

export async function getPushStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

function _urlBase64ToUint8(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4)
  const raw = atob((b64 + pad).replace(/-/g,'+').replace(/_/g,'/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

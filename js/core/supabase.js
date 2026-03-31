// js/core/supabase.js — PerformanceIQ
// Single Supabase client. Import everywhere — never instantiate a second.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = 'https://jijqjbgmhhlvokgtuema.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanFqYmdtaGhsdm9rZ3R1ZW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDEyMTYsImV4cCI6MjA4ODkxNzIxNn0.bX3-H-B1KrDe5d5ernRoDAojIEVT7sdXXtPBlxvktKk' // Dashboard → Settings → API → anon public

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    storage:            window.localStorage
  }
})

// ── AUTH STATE ────────────────────────────────────────────────
let _session  = null
let _profile  = null
const _listeners = new Set()

export const getSession = () => _session
export const getProfile = () => _profile
export const getUser    = () => _session?.user ?? null
export const isAuthed   = () => !!_session

export function onAuthChange(fn) {
  _listeners.add(fn)
  fn(_session, _profile)          // call immediately with current state
  return () => _listeners.delete(fn)
}
function _notify() { _listeners.forEach(fn => fn(_session, _profile)) }

// ── PROFILE NORMALIZER ────────────────────────────────────────
// Your DB schema uses different column names than our app expects.
// This maps them once here so every view gets a consistent shape.
//
// DB column      → App property
// name           → display_name
// onboarding_done→ onboarded
// goal / primary_goal / secondary_goals → goals[]
// role (text)    → role
export function normalizeProfile(row) {
  if (!row) return null
  return {
    ...row,
    display_name: row.name ?? row.display_name ?? '',
    onboarded:    row.onboarded ?? row.onboarding_done ?? false,
    goals: row.goals?.length
      ? row.goals
      : [row.primary_goal, ...(row.secondary_goals ?? [])].filter(Boolean)
  }
}

// ── PROFILE LOAD ──────────────────────────────────────────────
async function _loadProfile(userId) {
  if (!userId) { _profile = null; return }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  _profile = error ? null : normalizeProfile(data)
  if (error) console.warn('[PIQ] profile load:', error.message)
}

// ── INIT ──────────────────────────────────────────────────────
export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  _session = session
  await _loadProfile(session?.user?.id)
  _notify()

  supabase.auth.onAuthStateChange(async (event, session) => {
    _session = session
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      await _loadProfile(session?.user?.id)
    } else if (event === 'SIGNED_OUT') {
      _profile = null
    }
    _notify()
  })
}

// ── AUTH HELPERS ──────────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpWithEmail(email, password, meta = {}) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: meta }
  })
  if (error) throw error
  return data
}

export async function signOut()  { await supabase.auth.signOut() }

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}${location.pathname}#/reset-password`
  })
  if (error) throw error
}

// ── PROFILE UPDATE ────────────────────────────────────────────
// Maps app property names back to your DB column names on write
export async function updateProfile(updates) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')

  const db = { ...updates, updated_at: new Date().toISOString() }

  // Map app → DB column names
  if ('display_name' in updates) { db.name = updates.display_name; delete db.display_name }
  if ('onboarded'    in updates) { db.onboarding_done = updates.onboarded; delete db.onboarded }
  if ('goals'        in updates) {
    const g = updates.goals ?? []
    db.primary_goal    = g[0] ?? ''
    db.secondary_goals = g.slice(1)
    db.goal            = g[0] ?? ''
    delete db.goals
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(db)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  _profile = normalizeProfile(data)
  _notify()
  return _profile
}

// js/services/workoutService.js — PerformanceIQ
//
// YOUR SCHEMA REALITY:
//   workouts table = what we called "sessions" + "workouts" combined
//   Columns: id, athlete_id, template_id, assigned_by, scheduled_date,
//            title, sport, day_type, notes, recovery_cue, exercises (jsonb),
//            completed_at, status*, duration_min*, rpe_actual*, exercise_logs*,
//            updated_at*, created_at
//   (* added by PIQ_MATCHED.sql migration)
//
//   exercises table = system exercise library (new table from migration)
//   program_templates table = program templates (new from migration)

import { supabase, getUser } from '../core/supabase.js'

const CACHE_KEY_EX   = 'piq_exercises_cache'
const CACHE_KEY_TMPL = 'piq_templates_cache'
const CACHE_KEY_WO   = 'piq_workouts_cache'
const CACHE_TTL      = 3_600_000  // 1 hour

// ── OFFLINE QUEUE ─────────────────────────────────────────────
const QUEUE_KEY = 'piq_offline_workout_queue'

function _getQueue()    { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] } }
function _saveQueue(q)  { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) }

export function addToOfflineQueue(op) {
  const q = _getQueue(); q.push({ ...op, ts: Date.now() }); _saveQueue(q)
}

export async function flushOfflineQueue() {
  const q = _getQueue()
  if (!q.length) return
  const failed = []
  for (const op of q) {
    try {
      if (op.type === 'complete_workout') await completeWorkout(op.id, op.data)
      if (op.type === 'create_workout')   await createWorkout(op.data)
    } catch { failed.push(op) }
  }
  _saveQueue(failed)
}

// ── EXERCISE LIBRARY ──────────────────────────────────────────

export async function getExercises({ category, search } = {}) {
  const cached = _getCache(CACHE_KEY_EX)
  if (cached && !search && Date.now() - cached._ts < CACHE_TTL) {
    let r = cached.data
    if (category) r = r.filter(e => e.category === category)
    return r
  }

  let q = supabase.from('exercises').select('*').order('name')
  if (category) q = q.eq('category', category)
  if (search)   q = q.ilike('name', `%${search}%`)

  const { data, error } = await q
  if (error) return cached?.data ?? []
  if (!search && !category) _setCache(CACHE_KEY_EX, data)
  return data ?? []
}

export async function getExercisesByCategory() {
  const all = await getExercises()
  return all.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = []
    acc[ex.category].push(ex)
    return acc
  }, {})
}

export async function getExerciseCategoryCounts() {
  const byCategory = await getExercisesByCategory()
  return Object.entries(byCategory).map(([cat, exs]) => ({ category: cat, count: exs.length }))
}

// ── PROGRAM TEMPLATES ─────────────────────────────────────────

export async function getProgramTemplates({ sport } = {}) {
  const cached = _getCache(CACHE_KEY_TMPL)
  if (cached && Date.now() - cached._ts < CACHE_TTL) {
    let r = cached.data
    if (sport) r = r.filter(t => !t.sport || t.sport === sport)
    return r
  }

  let q = supabase.from('program_templates').select('*').order('name')
  const { data, error } = await q
  if (error) return cached?.data ?? []
  _setCache(CACHE_KEY_TMPL, data)
  let r = data ?? []
  if (sport) r = r.filter(t => !t.sport || t.sport === sport)
  return r
}

// ── WORKOUTS (your main training table) ───────────────────────

export async function getWorkouts({ from, to, status, limit = 50 } = {}) {
  const user = getUser()
  if (!user) return _getLocalWorkouts()

  let q = supabase
    .from('workouts')
    .select('*')
    .eq('athlete_id', user.id)
    .order('scheduled_date', { ascending: false })
    .limit(limit)

  if (from)   q = q.gte('scheduled_date', from)
  if (to)     q = q.lte('scheduled_date', to)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) { console.warn('[PIQ] getWorkouts:', error.message); return _getLocalWorkouts() }

  localStorage.setItem(CACHE_KEY_WO, JSON.stringify(data))
  return data ?? []
}

export async function getTodayWorkout() {
  const today = _today()
  const rows = await getWorkouts({ from: today, to: today })
  return rows[0] ?? null
}

export async function getWorkoutById(id) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createWorkout({
  title, sport, dayType = 'strength', scheduledDate, exercises = [],
  notes = '', recoveryCue = '', templateId = null, assignedBy = null
}) {
  const user = getUser()
  if (!user) {
    addToOfflineQueue({ type: 'create_workout', data: arguments[0] })
    return null
  }

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      athlete_id:    user.id,
      title,
      sport:         sport ?? null,
      day_type:      dayType,
      scheduled_date: scheduledDate ?? _today(),
      exercises:     exercises,
      notes,
      recovery_cue:  recoveryCue,
      template_id:   templateId,
      assigned_by:   assignedBy,
      status:        'planned'
    })
    .select()
    .single()

  if (error) throw error
  _clearCache(CACHE_KEY_WO)
  return data
}

export async function updateWorkout(id, updates) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')

  // Map any incoming app-side field names to DB column names
  const db = { ...updates }
  if ('dayType'      in updates) { db.day_type      = updates.dayType;      delete db.dayType }
  if ('recoveryCue'  in updates) { db.recovery_cue  = updates.recoveryCue;  delete db.recoveryCue }
  if ('scheduledDate' in updates){ db.scheduled_date = updates.scheduledDate; delete db.scheduledDate }
  if ('templateId'   in updates) { db.template_id   = updates.templateId;   delete db.templateId }

  const { data, error } = await supabase
    .from('workouts')
    .update({ ...db, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('athlete_id', user.id)
    .select()
    .single()

  if (error) throw error
  _clearCache(CACHE_KEY_WO)
  return data
}

export async function deleteWorkout(id) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id)
    .eq('athlete_id', user.id)
  if (error) throw error
  _clearCache(CACHE_KEY_WO)
}

// ── COMPLETE A WORKOUT ────────────────────────────────────────

export async function completeWorkout(id, { exerciseLogs, durationMin, rpeActual, notes }) {
  const user = getUser()
  const payload = {
    status:        'completed',
    completed_at:  new Date().toISOString(),
    exercise_logs: exerciseLogs ?? [],
    duration_min:  durationMin ?? null,
    rpe_actual:    rpeActual   ?? null,
    notes:         notes       ?? null,
    updated_at:    new Date().toISOString()
  }

  if (!user) {
    addToOfflineQueue({ type: 'complete_workout', id, data: payload })
    return _updateLocalWorkout(id, payload)
  }

  const { data, error } = await supabase
    .from('workouts')
    .update(payload)
    .eq('id', id)
    .eq('athlete_id', user.id)
    .select()
    .single()

  if (error) {
    addToOfflineQueue({ type: 'complete_workout', id, data: payload })
    throw error
  }

  _clearCache(CACHE_KEY_WO)

  // Trigger PIQ score recompute non-blocking
  supabase.functions.invoke('compute-daily-scores').catch(() => {})

  return data
}

export async function skipWorkout(id, reason = '') {
  const user = getUser()
  if (!user) return
  const { data, error } = await supabase
    .from('workouts')
    .update({ status: 'skipped', notes: reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('athlete_id', user.id)
    .select()
    .single()
  if (error) throw error
  _clearCache(CACHE_KEY_WO)
  return data
}

// ── STREAK ────────────────────────────────────────────────────

export async function getStreak() {
  const user = getUser()
  if (!user) return 0

  const { data } = await supabase
    .from('workouts')
    .select('scheduled_date')
    .eq('athlete_id', user.id)
    .eq('status', 'completed')
    .order('scheduled_date', { ascending: false })
    .limit(60)

  if (!data?.length) return 0

  const dateSet = new Set(data.map(w => w.scheduled_date))
  let streak = 0
  const check = new Date(); check.setHours(0,0,0,0)

  while (true) {
    const ds = check.toISOString().split('T')[0]
    if (dateSet.has(ds)) { streak++; check.setDate(check.getDate() - 1) }
    else break
  }
  return streak
}

// ── LOCAL CACHE HELPERS ───────────────────────────────────────
function _getLocalWorkouts() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY_WO) || '[]') } catch { return [] }
}
function _updateLocalWorkout(id, updates) {
  const rows = _getLocalWorkouts()
  const i = rows.findIndex(r => r.id === id)
  if (i >= 0) rows[i] = { ...rows[i], ...updates }
  localStorage.setItem(CACHE_KEY_WO, JSON.stringify(rows))
  return rows[i]
}
function _getCache(key)       { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
function _setCache(key, data) { localStorage.setItem(key, JSON.stringify({ data, _ts: Date.now() })) }
function _clearCache(key)     { localStorage.removeItem(key) }
function _today()             { return new Date().toISOString().split('T')[0] }

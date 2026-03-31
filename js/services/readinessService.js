// js/services/readinessService.js — PerformanceIQ
//
// YOUR SCHEMA:
//   readiness_logs: id, athlete_id, log_date, score, hrv (text), sleep_hrs,
//                   soreness (text: 'Low'/'Medium'/'High'), hydration (text),
//                   body_battery (int), notes, created_at
//   Added by migration: sleep_quality, energy, stress, mood, tier

import { supabase, getUser } from '../core/supabase.js'

const LOCAL_KEY  = 'piq_readiness_cache'
const SCORE_KEY  = 'piq_score_latest'

// ── LOG READINESS ─────────────────────────────────────────────

export async function logReadiness({
  sleepHrs, sleepQuality, soreness, energy, stress, mood,
  hrv, bodyBattery, hydration, notes
}) {
  const user   = getUser()
  const today  = _today()

  // Map app fields → your DB columns
  const payload = {
    athlete_id:    user?.id,
    log_date:      today,
    sleep_hrs:     sleepHrs     ?? null,
    sleep_quality: sleepQuality ?? null,    // added column
    // soreness stored as text in your schema
    soreness:      _sorenessText(soreness),
    energy:        energy       ?? null,    // added column (1-5)
    stress:        stress       ?? null,    // added column (1-5)
    mood:          mood         ?? null,    // added column (1-5)
    hrv:           hrv          ? String(hrv) : '',
    body_battery:  bodyBattery  ?? null,
    hydration:     hydration    ?? 'On target',
    notes:         notes        ?? ''
  }

  if (!user) {
    // Compute locally for offline
    const score = _computeScore(payload)
    const local = { ...payload, score, tier: _tier(score), created_at: new Date().toISOString() }
    _saveLocal(today, local)
    return local
  }

  const { data, error } = await supabase
    .from('readiness_logs')
    .upsert(payload, { onConflict: 'athlete_id,log_date' })
    .select()
    .single()

  if (error) {
    console.warn('[PIQ] logReadiness:', error.message)
    const score = _computeScore(payload)
    return { ...payload, score, tier: _tier(score) }
  }

  _saveLocal(today, data)
  return data
}

// ── TODAY'S READINESS ─────────────────────────────────────────

export async function getTodayReadiness() {
  const user  = getUser()
  const today = _today()
  if (!user) return _getLocal(today)

  const { data, error } = await supabase
    .from('readiness_logs')
    .select('*')
    .eq('athlete_id', user.id)
    .eq('log_date', today)
    .maybeSingle()

  if (error || !data) return _getLocal(today)
  _saveLocal(today, data)
  return data
}

// ── HISTORY ───────────────────────────────────────────────────

export async function getReadinessHistory(days = 30) {
  const user = getUser()
  if (!user) return []

  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data, error } = await supabase
    .from('readiness_logs')
    .select('log_date, score, tier, sleep_hrs, energy, soreness, body_battery')
    .eq('athlete_id', user.id)
    .gte('log_date', from.toISOString().split('T')[0])
    .order('log_date', { ascending: true })

  if (error) return []
  return data ?? []
}

// ── PIQ SCORES ────────────────────────────────────────────────

export async function getLatestPIQScore() {
  const user = getUser()
  if (!user) return JSON.parse(localStorage.getItem(SCORE_KEY) || 'null')

  const { data, error } = await supabase
    .from('piq_scores')
    .select('*')
    .eq('athlete_id', user.id)
    .order('score_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return JSON.parse(localStorage.getItem(SCORE_KEY) || 'null')
  localStorage.setItem(SCORE_KEY, JSON.stringify(data))
  return data
}

export async function getPIQScoreHistory(days = 30) {
  const user = getUser()
  if (!user) return []

  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data, error } = await supabase
    .from('piq_scores')
    .select('score_date, piq_score, consistency, readiness, compliance, load_mgmt, injury_risk')
    .eq('athlete_id', user.id)
    .gte('score_date', from.toISOString().split('T')[0])
    .order('score_date', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function refreshPIQScore() {
  const { data, error } = await supabase.functions.invoke('compute-daily-scores')
  if (error) throw error
  return data
}

// ── HELPERS ───────────────────────────────────────────────────

// Convert numeric soreness (1-5) to your text format, or pass text through
function _sorenessText(val) {
  if (!val) return 'Low'
  if (typeof val === 'string') return val
  if (val <= 2) return 'Low'
  if (val <= 3) return 'Medium'
  return 'High'
}

// Client-side score computation mirrors your DB trigger
function _computeScore({ sleep_hrs, energy, soreness, body_battery }) {
  const sleepN    = Math.min((sleep_hrs ?? 7) / 9, 1)
  const energyN   = (energy ?? 3) / 5
  const sorenessN = soreness === 'Low' ? 1 : soreness === 'Medium' ? 0.6 : 0.2
  const batteryN  = (body_battery ?? 70) / 100
  return Math.round(sleepN * 30 + energyN * 25 + sorenessN * 25 + batteryN * 20)
}

function _tier(score) {
  return score >= 70 ? 'high' : score >= 45 ? 'moderate' : 'low'
}

function _saveLocal(date, data) {
  const cache = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
  cache[date] = data
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cache))
}

function _getLocal(date) {
  const cache = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
  return cache[date] ?? null
}

function _today() { return new Date().toISOString().split('T')[0] }

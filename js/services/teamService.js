// js/services/teamService.js — PerformanceIQ
//
// YOUR SCHEMA:
//   teams:        id, name, sport, coach_id, invite_code*, created_at
//   team_members: team_id, athlete_id, joined_at, id*, role*, jersey*
//   profiles:     linked_athlete_id (parent→athlete link)
//   family_links: id, parent_id, athlete_id, confirmed, created_at  (new table)
//   (* added by PIQ_MATCHED.sql)

import { supabase, getUser, getProfile } from '../core/supabase.js'

// ── TEAMS ─────────────────────────────────────────────────────

export async function getMyTeams() {
  const user    = getUser()
  const profile = getProfile()
  if (!user) return []

  // Coaches see teams they own
  if (profile?.role === 'coach' || profile?.role === 'admin') {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('coach_id', user.id)
    if (error) { console.warn('[PIQ] getMyTeams (coach):', error.message); return [] }
    return (data ?? []).map(t => ({ ...t, my_role: 'coach' }))
  }

  // Athletes see teams they're members of
  const { data, error } = await supabase
    .from('team_members')
    .select('role, jersey, teams(id, name, sport, coach_id, invite_code, created_at)')
    .eq('athlete_id', user.id)

  if (error) { console.warn('[PIQ] getMyTeams (athlete):', error.message); return [] }
  return (data ?? []).map(m => ({ ...m.teams, my_role: m.role ?? 'athlete', my_jersey: m.jersey }))
}

export async function createTeam({ name, sport, school }) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ name, sport: sport ?? 'basketball', coach_id: user.id })
    .select()
    .single()

  if (error) throw error
  return team
}

export async function joinTeamByCode(inviteCode) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: team, error: findErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .single()

  if (findErr || !team) throw new Error('Invalid invite code. Check with your coach.')

  const { error: joinErr } = await supabase
    .from('team_members')
    .upsert({ team_id: team.id, athlete_id: user.id, role: 'athlete' },
             { onConflict: 'team_id,athlete_id', ignoreDuplicates: true })

  if (joinErr) throw joinErr
  return team
}

export async function leaveTeam(teamId) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('athlete_id', user.id)
  if (error) throw error
}

// ── ROSTER ────────────────────────────────────────────────────

export async function getRoster(teamId) {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      role, jersey, joined_at,
      profiles!athlete_id ( id, name, avatar_url, sport, position, grad_year, role )
    `)
    .eq('team_id', teamId)

  if (error) throw error
  return (data ?? []).map(m => ({
    ...m.profiles,
    display_name: m.profiles?.name ?? '',
    team_role:  m.role ?? 'athlete',
    jersey:     m.jersey,
    joined_at:  m.joined_at
  }))
}

export async function updateMember(teamId, athleteId, updates) {
  const { error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('team_id', teamId)
    .eq('athlete_id', athleteId)
  if (error) throw error
}

export async function removeMember(teamId, athleteId) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('athlete_id', athleteId)
  if (error) throw error
}

// ── COACH: ATHLETE STATS ──────────────────────────────────────
// Returns each athlete on the roster with their latest PIQ score + readiness

export async function getTeamAthleteStats(teamId) {
  const roster     = await getRoster(teamId)
  const athleteIds = roster.map(m => m.id)
  if (!athleteIds.length) return []

  const today = new Date().toISOString().split('T')[0]

  const [scoresRes, readinessRes] = await Promise.all([
    supabase
      .from('piq_scores')
      .select('athlete_id, piq_score, injury_risk, score_date')
      .in('athlete_id', athleteIds)
      .eq('score_date', today),
    supabase
      .from('readiness_logs')
      .select('athlete_id, score, tier, log_date')
      .in('athlete_id', athleteIds)
      .eq('log_date', today)
  ])

  const scoreMap     = Object.fromEntries((scoresRes.data   ?? []).map(s => [s.athlete_id, s]))
  const readinessMap = Object.fromEntries((readinessRes.data ?? []).map(r => [r.athlete_id, r]))

  return roster.map(a => ({
    ...a,
    piq:       scoreMap[a.id]     ?? null,
    readiness: readinessMap[a.id] ?? null
  }))
}

// ── FAMILY LINKS ──────────────────────────────────────────────
// Parents link to athletes via family_links table OR linked_athlete_id column

export async function getMyLinkedAthletes() {
  const user    = getUser()
  const profile = getProfile()
  if (!user) return []

  const results = []

  // Method 1: linked_athlete_id on profiles (your existing mechanism)
  if (profile?.linked_athlete_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, sport')
      .eq('id', profile.linked_athlete_id)
      .single()
    if (data) results.push({ ...data, display_name: data.name, link_source: 'profile' })
  }

  // Method 2: family_links table (new mechanism)
  const { data: links } = await supabase
    .from('family_links')
    .select('id, athlete_id, profiles!athlete_id(id, name, avatar_url, sport)')
    .eq('parent_id', user.id)
    .eq('confirmed', true)

  for (const l of (links ?? [])) {
    if (!results.find(r => r.id === l.athlete_id)) {
      results.push({ ...l.profiles, display_name: l.profiles?.name, link_id: l.id, link_source: 'family_links' })
    }
  }

  return results
}

export async function linkToAthlete(athleteId) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('family_links')
    .insert({ parent_id: user.id, athlete_id: athleteId, confirmed: false })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function confirmFamilyLink(linkId) {
  const { data, error } = await supabase
    .from('family_links')
    .update({ confirmed: true })
    .eq('id', linkId)
    .select()
    .single()
  if (error) throw error
  return data
}

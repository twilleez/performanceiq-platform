
/* ================================================================
   PerformanceIQ — core.js  v6.0.0 (Elite Tier, Offline-first)
   - District-wide ready (schools → teams → athletes)
   - Role-based views (owner/admin/coach/athlete/parent/viewer)
   - PIQ Score engine (workload + recovery + nutrition + consistency)
   - Risk flags (ACWR + recovery + missed check-ins)
   - Periodization (simple 4-week mesocycle generator)
   ================================================================ */

'use strict';

(function () {
  // -----------------------------
  // Storage + Time helpers
  // -----------------------------
  const LS_KEY = 'piq_state_v6';
  const LS_SEEN = 'piq_seen_v6';
  const DAY_MS = 86400000;

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function el(id) { return document.getElementById(id); }
  function q(sel, root=document) { return root.querySelector(sel); }
  function qa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function saveState() {
    try {
      STATE.meta.updated_at = new Date().toISOString();
      localStorage.setItem(LS_KEY, JSON.stringify(STATE));
      setSavePill('Saved', true);
    } catch (e) {
      setSavePill('Save failed', false);
      console.error(e);
    }
  }

  function loadState() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return safeParse(raw, null);
  }

  // -----------------------------
  // Toast
  // -----------------------------
  function toast(msg, duration = 2600) {
    const c = el('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(6px)';
      t.style.transition = 'all 0.25s ease';
      setTimeout(() => t.remove(), 280);
    }, duration);
  }

  // -----------------------------
  // Seed demo district/team/athletes
  // -----------------------------
  function uuid() {
    // RFC4122-ish v4; good enough for local IDs
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
      const v = c === 'x' ? r : (r & 3) | 8;
      return v.toString(16);
    });
  }

  function initialState() {
    const schoolId = uuid();
    const teamId = uuid();

    const athletes = [
      { id: uuid(), name: 'Marcus Johnson', initials: 'MJ', pos: 'PG', jersey: 3,  weight_lbs: 165 },
      { id: uuid(), name: 'Keisha Davis',   initials: 'KD', pos: 'SF', jersey: 21, weight_lbs: 150 },
      { id: uuid(), name: 'Darius Jones',   initials: 'DJ', pos: 'PF', jersey: 5,  weight_lbs: 195 },
      { id: uuid(), name: 'Tyler Williams', initials: 'TW', pos: 'SG', jersey: 12, weight_lbs: 175 },
      { id: uuid(), name: 'Marcus Lewis',   initials: 'ML', pos: 'C',  jersey: 44, weight_lbs: 225 },
      { id: uuid(), name: 'Ryan Kim',       initials: 'RK', pos: 'SG', jersey: 7,  weight_lbs: 155 },
    ];

    // Create a small last-14-days training + wellness + nutrition history (demo)
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 13);
    const logs = { sessions: [], wellness: [], nutrition: [] };

    const rpeFor = (a) => {
      const map = { MJ: 7, KD: 6, DJ: 6, TW: 8, ML: 9, RK: 0 };
      return map[a.initials] || 6;
    };

    for (let d = 0; d < 14; d++) {
      const date = new Date(start.getTime() + d * DAY_MS).toISOString().slice(0, 10);
      athletes.forEach((a, idx) => {
        const base = rpeFor(a);
        // some athletes don't log often
        const skipChance = a.initials === 'RK' ? 0.75 : 0.15;
        if (Math.random() < skipChance) return;

        const minutes = Math.round(35 + Math.random() * 35);
        const rpe = clamp(Math.round(base + (Math.random() * 2 - 1)), 1, 10);
        const type = (idx % 3 === 0) ? 'practice' : (idx % 3 === 1) ? 'strength' : 'conditioning';
        logs.sessions.push({
          id: uuid(), athlete_id: a.id, team_id: teamId, date,
          minutes, rpe, type,
          created_at: new Date(date + 'T18:00:00.000Z').toISOString()
        });

        // wellness (more likely than sessions)
        if (Math.random() < 0.9) {
          const sleep = round(5.5 + Math.random() * 3.2);
          const soreness = clamp(Math.round(2 + Math.random() * 7), 0, 10);
          const energy = clamp(Math.round(4 + Math.random() * 6), 0, 10);
          const stress = clamp(Math.round(2 + Math.random() * 7), 0, 10);
          const mood = clamp(Math.round(3 + Math.random() * 7), 0, 10);
          logs.wellness.push({
            id: uuid(), athlete_id: a.id, team_id: teamId, date,
            sleep_hours: sleep, sleep_quality: clamp(Math.round(6 + Math.random() * 4), 0, 10),
            soreness, energy, stress, mood,
            flags: soreness >= 7 ? ['soreness'] : [],
            note: '',
            created_at: new Date(date + 'T07:00:00.000Z').toISOString()
          });
        }

        // nutrition (less consistent)
        if (Math.random() < 0.65) {
          const cals = Math.round(2000 + Math.random() * 1400);
          const protein = Math.round(90 + Math.random() * 110);
          const carbs = Math.round(180 + Math.random() * 240);
          const fat = Math.round(45 + Math.random() * 65);
          const water_oz = Math.round(50 + Math.random() * 70);
          logs.nutrition.push({
            id: uuid(), athlete_id: a.id, team_id: teamId, date,
            calories: cals, protein_g: protein, carbs_g: carbs, fat_g: fat, water_oz,
            note: '',
            created_at: new Date(date + 'T20:00:00.000Z').toISOString()
          });
        }
      });
    }

    return {
      meta: { version: '6.0.0', updated_at: new Date().toISOString() },

      profile: {
        role: 'coach',     // owner|admin|coach|athlete|parent|viewer
        sport: 'basketball',
        user_name: 'Coach',
        active_school_id: schoolId,
        active_team_id: teamId,
        active_athlete_id: athletes[0].id, // used for athlete role
      },

      district: {
        id: uuid(),
        name: 'Westview District',
        schools: [
          {
            id: schoolId,
            name: 'Westview High School',
            teams: [
              { id: teamId, name: 'Westview Varsity Basketball', sport: 'basketball', season: 'Pre-Season', join_code: makeJoinCode(), athlete_ids: athletes.map(a => a.id) }
            ]
          }
        ]
      },

      athletes,
      logs,
      ui: { current_view: 'dashboard', selected_athlete_id: null }
    };
  }

  function makeJoinCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  // -----------------------------
  // Global mutable state
  // -----------------------------
  let STATE = loadState() || initialState();

  // -----------------------------
  // Simple "secure roles" (client-side)
  // NOTE: True security requires server-side enforcement.
  // -----------------------------
  const ROLE = {
    owner:  { can: ['district', 'settings', 'export'] },
    admin:  { can: ['district', 'settings', 'export'] },
    coach:  { can: ['team', 'analytics', 'train', 'schedule', 'settings', 'export'] },
    athlete:{ can: ['me', 'train', 'wellness', 'nutrition', 'schedule'] },
    parent: { can: ['team', 'schedule', 'wellness', 'nutrition'] },
    viewer: { can: ['team', 'schedule'] },
  };

  function currentRole() { return (STATE.profile?.role || 'coach'); }
  function hasCap(cap) {
    const r = currentRole();
    const allow = ROLE[r]?.can || [];
    return allow.includes(cap);
  }

  // -----------------------------
  // Domain helpers
  // -----------------------------
  function activeTeam() {
    const sid = STATE.profile.active_school_id;
    const tid = STATE.profile.active_team_id;
    const school = STATE.district.schools.find(s => s.id === sid) || STATE.district.schools[0];
    const team = (school?.teams || []).find(t => t.id === tid) || (school?.teams || [])[0];
    return { school, team };
  }

  function athleteById(id) { return STATE.athletes.find(a => a.id === id) || null; }

  function teamAthletes() {
    const { team } = activeTeam();
    if (!team) return [];
    return team.athlete_ids.map(id => athleteById(id)).filter(Boolean);
  }

  function logsForAthlete(athlete_id) {
    const s = STATE.logs.sessions.filter(x => x.athlete_id === athlete_id);
    const w = STATE.logs.wellness.filter(x => x.athlete_id === athlete_id);
    const n = STATE.logs.nutrition.filter(x => x.athlete_id === athlete_id);
    return { sessions: s, wellness: w, nutrition: n };
  }

  function getLogByDate(arr, date) {
    // returns the latest log for date if multiple
    const rows = arr.filter(x => x.date === date);
    if (!rows.length) return null;
    rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return rows[0];
  }

  function dateRangeISO(daysBack, endDateISO=todayISO()) {
    const end = new Date(endDateISO + 'T00:00:00.000Z');
    const out = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(end.getTime() - i * DAY_MS);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  // -----------------------------
  // PIQ Score Engine (Elite)
  // -----------------------------
  function computeDailyLoad(session) {
    // Simple load proxy: minutes * sRPE
    return (Number(session.minutes) || 0) * (Number(session.rpe) || 0);
  }

  function sumLoadByDate(sessions, dateISO) {
    return sessions.filter(s => s.date === dateISO).reduce((sum, s) => sum + computeDailyLoad(s), 0);
  }

  function avgDailyLoad(sessions, days, endDateISO=todayISO()) {
    const dates = dateRangeISO(days, endDateISO);
    const total = dates.reduce((sum, d) => sum + sumLoadByDate(sessions, d), 0);
    return total / Math.max(1, days);
  }

  function computeACWR(sessions, endDateISO=todayISO()) {
    // ACWR = acute (7-day avg) / chronic (28-day avg).
    // If insufficient data, return null.
    const chronic = avgDailyLoad(sessions, 28, endDateISO);
    const acute = avgDailyLoad(sessions, 7, endDateISO);
    if (!isFinite(chronic) || chronic <= 0) return null;
    return round(acute / chronic);
  }

  function recoveryScoreFromWellness(w) {
    if (!w) return 50; // neutral if no data
    const sleep = Number(w.sleep_hours);
    const soreness = Number(w.soreness);
    const energy = Number(w.energy);
    const stress = Number(w.stress);
    const mood = Number(w.mood);

    // Normalize each to 0..100
    const sleepScore = isFinite(sleep) ? clamp((sleep / 8) * 100, 0, 120) : 50;
    const sorenessScore = isFinite(soreness) ? clamp((1 - soreness / 10) * 100, 0, 100) : 50;
    const energyScore = isFinite(energy) ? clamp((energy / 10) * 100, 0, 100) : 50;
    const stressScore = isFinite(stress) ? clamp((1 - stress / 10) * 100, 0, 100) : 50;
    const moodScore = isFinite(mood) ? clamp((mood / 10) * 100, 0, 100) : 50;

    // Weighted
    const score = (sleepScore * 0.30) + (sorenessScore * 0.25) + (energyScore * 0.20) + (stressScore * 0.15) + (moodScore * 0.10);
    return Math.round(clamp(score, 0, 100));
  }

  function nutritionTargetsForAthlete(a) {
    // Basic, transparent targets (no medical claims):
    // Protein target: 0.8 g/lb (general sport nutrition heuristic), cap 220g for UI sanity.
    // Water: 0.5 oz per lb, cap 160 oz.
    // Calories: simple maintenance proxy 15 * weight_lbs; if missing, default 2600.
    const wt = Number(a?.weight_lbs);
    const calories = isFinite(wt) ? Math.round(wt * 15) : 2600;
    const protein = isFinite(wt) ? Math.round(clamp(wt * 0.8, 90, 220)) : 150;
    const water = isFinite(wt) ? Math.round(clamp(wt * 0.5, 60, 160)) : 90;

    // Carbs/fat split for demo: carbs 4g per lb, fat 0.35g per lb (both clamped)
    const carbs = isFinite(wt) ? Math.round(clamp(wt * 4.0, 180, 550)) : 320;
    const fat = isFinite(wt) ? Math.round(clamp(wt * 0.35, 45, 120)) : 80;

    return { calories, protein_g: protein, carbs_g: carbs, fat_g: fat, water_oz: water };
  }

  function nutritionScoreFromLog(n, targets) {
    if (!n) return 50;
    function ratio(actual, target) {
      if (!isFinite(actual) || !isFinite(target) || target <= 0) return 0;
      // score peaks at 1.0 and drops if under/over; 0.0 at 0 or 2x
      const r = actual / target;
      const dist = Math.abs(1 - r); // 0 ideal
      return clamp(100 * (1 - dist), 0, 100);
    }
    const cals = ratio(Number(n.calories), targets.calories);
    const p = ratio(Number(n.protein_g), targets.protein_g);
    const c = ratio(Number(n.carbs_g), targets.carbs_g);
    const f = ratio(Number(n.fat_g), targets.fat_g);
    const w = ratio(Number(n.water_oz), targets.water_oz);

    // Protein and hydration are weighted more
    const score = (p * 0.35) + (w * 0.25) + (cals * 0.20) + (c * 0.10) + (f * 0.10);
    return Math.round(clamp(score, 0, 100));
  }

  function consistencyScore(sessions, wellness, nutrition, endDateISO=todayISO()) {
    // Count days in last 7 with ANY log (session OR wellness OR nutrition)
    const dates = dateRangeISO(7, endDateISO);
    let days = 0;
    dates.forEach(d => {
      const has = sessions.some(x => x.date === d) || wellness.some(x => x.date === d) || nutrition.some(x => x.date === d);
      if (has) days++;
    });
    // 7/7 => 100, 0/7 => 0, with a small base to avoid harshness
    return Math.round(clamp((days / 7) * 100, 0, 100));
  }

  function workloadScoreFromACWR(acwr) {
    // Safe zone ~0.8..1.3 best, watch 1.3..1.5, danger >1.5, also undertraining <0.7.
    if (acwr === null || !isFinite(acwr)) return 50;
    if (acwr >= 0.8 && acwr <= 1.3) return 90;
    if (acwr > 1.3 && acwr <= 1.5) return 65;
    if (acwr > 1.5) return 35;
    if (acwr >= 0.7 && acwr < 0.8) return 75;
    return 55; // undertrained
  }

  function computePIQForAthlete(athlete_id, endDateISO=todayISO()) {
    const a = athleteById(athlete_id);
    if (!a) return null;

    const { sessions, wellness, nutrition } = logsForAthlete(athlete_id);
    const wToday = getLogByDate(wellness, endDateISO);
    const nToday = getLogByDate(nutrition, endDateISO);
    const acwr = computeACWR(sessions, endDateISO);

    const workload = workloadScoreFromACWR(acwr);
    const recovery = recoveryScoreFromWellness(wToday);
    const targets = nutritionTargetsForAthlete(a);
    const nut = nutritionScoreFromLog(nToday, targets);
    const cons = consistencyScore(sessions, wellness, nutrition, endDateISO);

    // Elite weighting
    const score = Math.round(clamp((workload * 0.35) + (recovery * 0.25) + (nut * 0.20) + (cons * 0.20), 0, 100));

    // Trend: compare last 7 days avg vs previous 7 days avg
    const weekAvg = averagePIQOverRange(athlete_id, 7, endDateISO);
    const prevEnd = new Date(endDateISO + 'T00:00:00.000Z'); prevEnd.setUTCDate(prevEnd.getUTCDate() - 7);
    const prevEndISO = prevEnd.toISOString().slice(0, 10);
    const prevAvg = averagePIQOverRange(athlete_id, 7, prevEndISO);
    const trend = Math.round((weekAvg - prevAvg) || 0);

    // Risk flags
    const risk = computeRisk({ score, acwr, recovery, hasWellness: !!wToday, hasNutrition: !!nToday });

    return {
      athlete: a,
      score,
      pillars: { workload, recovery, nutrition: nut, consistency: cons },
      acwr,
      recovery_pct: recovery,
      trend,
      risk
    };
  }

  function averagePIQOverRange(athlete_id, days, endDateISO) {
    const dates = dateRangeISO(days, endDateISO);
    const vals = dates.map(d => computePIQForAthleteShallow(athlete_id, d)?.score).filter(v => isFinite(v));
    if (!vals.length) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }

  function computePIQForAthleteShallow(athlete_id, endDateISO) {
    const a = athleteById(athlete_id);
    if (!a) return null;
    const { sessions, wellness, nutrition } = logsForAthlete(athlete_id);
    const w = getLogByDate(wellness, endDateISO);
    const n = getLogByDate(nutrition, endDateISO);
    const acwr = computeACWR(sessions, endDateISO);
    const workload = workloadScoreFromACWR(acwr);
    const recovery = recoveryScoreFromWellness(w);
    const targets = nutritionTargetsForAthlete(a);
    const nut = nutritionScoreFromLog(n, targets);
    const cons = consistencyScore(sessions, wellness, nutrition, endDateISO);
    const score = Math.round(clamp((workload * 0.35) + (recovery * 0.25) + (nut * 0.20) + (cons * 0.20), 0, 100));
    return { score, acwr, recovery, nut, cons };
  }

  function computeRisk({ score, acwr, recovery, hasWellness, hasNutrition }) {
    const flags = [];
    let level = 'none'; // none|watch|rest

    if (!hasWellness) flags.push('No wellness');
    if (!hasNutrition) flags.push('No nutrition');

    if (acwr !== null && isFinite(acwr)) {
      if (acwr > 1.5) { flags.push('Load spike'); level = 'rest'; }
      else if (acwr > 1.3) { flags.push('Load elevated'); level = level === 'rest' ? 'rest' : 'watch'; }
      else if (acwr < 0.7) { flags.push('Undertrained'); level = level === 'rest' ? 'rest' : 'watch'; }
    }

    if (recovery < 45) { flags.push('Low recovery'); level = 'rest'; }
    else if (recovery < 60) { flags.push('Recovery watch'); level = level === 'rest' ? 'rest' : 'watch'; }

    if (score === 0) flags.push('Not logged');

    if (!flags.length) flags.push('None');

    return { level, flags };
  }

  function severityFrom(score, riskLevel) {
    if (score === 0) return 'none';
    if (riskLevel === 'rest' || score < 45) return 'red';
    if (riskLevel === 'watch' || score < 65) return 'yellow';
    return 'green';
  }

  // -----------------------------
  // Periodization (district-wide simple engine)
  // -----------------------------
  function mesocyclePlan(season) {
    // Simple 4-week plan (3 build + 1 deload), with an optional taper if in-season.
    const base = [
      { week: 1, focus: 'Build', load_factor: 1.00, note: 'Baseline + technique quality' },
      { week: 2, focus: 'Build', load_factor: 1.10, note: 'Progress volume or intensity 5–10%' },
      { week: 3, focus: 'Peak',  load_factor: 1.15, note: 'Highest week; monitor recovery closely' },
      { week: 4, focus: 'Deload',load_factor: 0.75, note: 'Reduce load; keep speed and skill' },
    ];
    if ((season || '').toLowerCase().includes('in')) {
      base[2].note = 'Peak carefully; prioritize freshness for competition';
      base[3].note = 'Taper + deload ahead of key games';
    }
    return base;
  }

  // -----------------------------
  // UI: Status pills
  // -----------------------------
  function setSavePill(text, ok=true) {
    // index.html v5 uses #pillOnline / #pillSeason / #pillGame; we add a small save indicator via #pillOnlineText if present
    const saveText = el('saveText'); // might not exist
    const saveDot = el('saveDot');
    if (saveText && saveDot) {
      saveText.textContent = text;
      saveDot.style.background = ok ? 'var(--green)' : 'var(--red)';
    }
  }

  function setTopbar() {
    const { team } = activeTeam();
    const teamName = team?.name || '—';
    const season = team?.season || '—';

    const pillSeason = el('pillSeason');
    if (pillSeason) pillSeason.textContent = season;

    const pillOnlineText = el('pillOnlineText');
    if (pillOnlineText) {
      const total = teamAthletes().length;
      // demo online: everyone except last
      const online = Math.max(0, total - 1);
      pillOnlineText.textContent = `Team · ${online} online`;
    }

    const nameEl = el('teamName');
    if (nameEl) nameEl.value = teamName;

    // Settings season
    const seasonEl = el('settingSeason');
    if (seasonEl) seasonEl.value = season;

    // Team selector in header subline
    const dashSub = el('dashSub');
    if (dashSub) {
      const now = new Date();
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      dashSub.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()} · ${teamName}`;
    }

    const sportSel = el('settingSport');
    if (sportSel) sportSel.value = (team?.sport || STATE.profile.sport || 'basketball');
  }

  // -----------------------------
  // Rendering: Derived athlete models for today
  // -----------------------------
  function athleteModelsForToday() {
    const date = todayISO();
    return teamAthletes().map(a => {
      const piq = computePIQForAthlete(a.id, date);
      const severity = severityFrom(piq.score, piq.risk.level);
      const colorMap = {
        green: { bg:'rgba(46,204,113,0.15)', text:'var(--green)' },
        yellow:{ bg:'rgba(240,192,64,0.15)', text:'var(--yellow)' },
        red:   { bg:'rgba(255,69,96,0.15)', text:'var(--red)' },
        none:  { bg:'rgba(255,255,255,0.06)', text:'var(--text-dim)' }
      };
      const col = colorMap[severity] || colorMap.none;

      // week history (last 6 scores)
      const dates = dateRangeISO(6, date);
      const hist = dates.map(d => computePIQForAthleteShallow(a.id, d)?.score || 0).filter(v => v !== null);

      return {
        id: a.id,
        name: a.name,
        initials: a.initials || (a.name.split(' ')[0][0] + (a.name.split(' ')[1]?.[0] || '')).toUpperCase(),
        pos: a.pos || '—',
        jersey: a.jersey || '—',
        score: piq.score || 0,
        severity,
        acr: piq.acwr,
        recovery: piq.recovery_pct,
        trend: piq.trend,
        flags: (piq.risk.flags || []).join(', '),
        riskLevel: piq.risk.level,
        sleep: getLogByDate(logsForAthlete(a.id).wellness, date)?.sleep_hours ?? null,
        soreness: getLogByDate(logsForAthlete(a.id).wellness, date)?.soreness ?? null,
        energy: getLogByDate(logsForAthlete(a.id).wellness, date)?.energy ?? null,
        weekHistory: hist,
        color: col.bg,
        colorText: col.text,
        insight: buildInsightForAthlete(a.id, date)
      };
    });
  }

  function buildInsightForAthlete(athlete_id, dateISO) {
    const { sessions, wellness } = logsForAthlete(athlete_id);
    const w = getLogByDate(wellness, dateISO);
    const acwr = computeACWR(sessions, dateISO);
    const rec = recoveryScoreFromWellness(w);

    if (!w) return 'No wellness check-in yet. Log sleep, soreness, and energy to unlock better recommendations.';
    if (acwr !== null && acwr > 1.5) return '<strong>High load spike</strong>. Reduce intensity today and prioritize recovery (sleep + hydration).';
    if (rec < 55) return '<strong>Recovery is low</strong>. Consider a lighter session and focus on sleep quality tonight.';
    if (rec >= 75) return 'Recovery is strong today. Maintain smart load and keep the streak rolling.';
    return 'Solid baseline. One small win: add 30–60 minutes of extra sleep this week.';
  }

  // -----------------------------
  // Rendering: Dashboard
  // -----------------------------
  function getSeverityClass(sev) {
    return { green: 'green', yellow: 'yellow', red: 'red', none: '' }[sev] || '';
  }
  function getAcrClass(acr) {
    if (acr === null || !isFinite(acr)) return '';
    if (acr < 1.3)  return 'safe';
    if (acr <= 1.5) return 'watch';
    return 'danger';
  }
  function getAcrFlag(acr) {
    if (acr === null || !isFinite(acr)) return '—';
    if (acr < 1.3)  return '✅';
    if (acr <= 1.5) return '⚠️';
    return '⛔';
  }
  function getTierLabel(score) {
    if (score >= 85) return { cls: 'great',  label: '⚡ Elite — Peak Form' };
    if (score >= 70) return { cls: 'good',   label: '✓ Strong — Trending Up' };
    if (score >= 50) return { cls: 'warn',   label: '⚠ Moderate — Monitor Load' };
    if (score > 0)   return { cls: 'danger', label: '⛔ High Risk — Rest Recommended' };
    return { cls: '', label: '— Not Logged' };
  }

  function renderDashboard() {
    setTopbar();

    const ATHLETES_TODAY = athleteModelsForToday();

    const logged = ATHLETES_TODAY.filter(a => a.score > 0);
    const ready  = ATHLETES_TODAY.filter(a => a.severity === 'green').length;
    const monitor= ATHLETES_TODAY.filter(a => a.severity === 'yellow').length;
    const risk   = ATHLETES_TODAY.filter(a => a.severity === 'red').length;
    const avg    = logged.length ? Math.round(logged.reduce((s,a) => s+a.score, 0) / logged.length) : 0;

    // Stat cards
    if (el('statAvg')) el('statAvg').textContent = avg || '—';
    if (el('statReady')) el('statReady').textContent = ready;
    if (el('statMonitor')) el('statMonitor').textContent = monitor;
    if (el('statRisk')) el('statRisk').textContent = risk;

    // Sub lines
    const avgSub = el('statAvgSub');
    if (avgSub) {
      // Compare avg today vs avg 7 days ago for a directional hint
      const pastDate = new Date(todayISO() + 'T00:00:00.000Z'); pastDate.setUTCDate(pastDate.getUTCDate() - 7);
      const pastISO = pastDate.toISOString().slice(0, 10);
      const pastVals = teamAthletes().map(a => computePIQForAthleteShallow(a.id, pastISO)?.score).filter(v => isFinite(v) && v > 0);
      const pastAvg = pastVals.length ? Math.round(pastVals.reduce((s,v)=>s+v,0)/pastVals.length) : avg;
      const delta = avg - pastAvg;
      avgSub.textContent = (delta >= 0) ? `↑ ${Math.abs(delta)} pts vs last week` : `↓ ${Math.abs(delta)} pts vs last week`;
      avgSub.className = 'stat-sub ' + (delta >= 0 ? 'up' : 'down');
    }
    const readySub = el('statReadySub');
    if (readySub) readySub.textContent = `${ready} of ${ATHLETES_TODAY.length} athletes`;
    const monitorSub = el('statMonitorSub');
    if (monitorSub) monitorSub.textContent = monitor > 0 ? `↑ Watch load today` : 'All clear';

    // Risk badge
    const riskBadge = el('riskBadge');
    if (riskBadge) {
      const num = risk + monitor;
      riskBadge.textContent = num;
      riskBadge.style.display = num > 0 ? 'flex' : 'none';
    }

    // Header chips
    const chipFlags = el('chipFlags');
    if (chipFlags) chipFlags.style.display = (risk > 0) ? 'inline-flex' : 'none';
    const chipFlagsText = el('chipFlagsText');
    if (chipFlagsText) chipFlagsText.textContent = `${risk} flag${risk !== 1 ? 's' : ''}`;

    // Sparkline (avg trend)
    const sparkEl = el('sparkAvg');
    if (sparkEl) {
      sparkEl.innerHTML = '';
      const sparkData = [55, 58, 63, 66, 68, 70, avg || 0];
      sparkData.forEach((v, i) => {
        const bar = document.createElement('div');
        bar.className = 'spark-bar' + (i === sparkData.length - 1 ? ' hi' : '');
        bar.style.cssText = `height:${clamp(Math.round((v/100)*100), 4, 100)}%;background:var(--accent)`;
        sparkEl.appendChild(bar);
      });
    }

    // Heatmap
    renderHeatmap(ATHLETES_TODAY);

    // Load bars
    renderLoadBars(ATHLETES_TODAY);

    // Alerts
    renderAlerts(ATHLETES_TODAY);

    // Roster mini
    renderRosterMini(ATHLETES_TODAY);

    // Feed (derived)
    renderFeed(ATHLETES_TODAY);

    // Events (still demo)
    renderEvents('eventList');

    // Insight (transparent: derived from today's team)
    const insightText = el('insightText');
    if (insightText) {
      const w = STATE.logs.wellness.filter(x => x.date === todayISO());
      const sleepVals = w.map(x => Number(x.sleep_hours)).filter(v => isFinite(v));
      const sleepAvg = sleepVals.length ? round(sleepVals.reduce((s,v)=>s+v,0)/sleepVals.length) : null;
      insightText.innerHTML = sleepAvg !== null
        ? `Team sleep average today is <strong>${sleepAvg} hours</strong>. Pushing toward <strong>8+ hours</strong> typically improves the Recovery pillar and reduces risk flags.`
        : `No sleep data yet today. Log wellness check-ins to improve Recovery and risk detection.`;
    }

    // Periodization preview (dashboard small)
    const plan = mesocyclePlan(activeTeam().team?.season || '');
    const planEl = el('periodPlan');
    if (planEl) {
      planEl.innerHTML = plan.map(p => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="font-weight:700">Week ${p.week} · ${p.focus}</div>
        <div style="color:var(--text-dim)">Load × ${p.load_factor.toFixed(2)} · ${p.note}</div>
      </div>`).join('');
    }
  }

  function renderHeatmap(ATHLETES_TODAY) {
    const tbody = el('heatmapBody');
    if (!tbody) return;
    tbody.innerHTML = ATHLETES_TODAY.map(a => {
      const sevClass  = getSeverityClass(a.severity);
      const acrClass  = getAcrClass(a.acr);
      const trendSign = a.trend > 0 ? '↑' : a.trend < 0 ? '↓' : '—';
      const trendCls  = a.trend > 0 ? 'up' : a.trend < 0 ? 'down' : '';
      const readPct   = a.recovery || 0;

      const riskHtml = a.riskLevel === 'watch'
        ? `<span class="risk-badge watch">⚠ Watch</span>`
        : a.riskLevel === 'rest'
        ? `<span class="risk-badge rest">⛔ Rest</span>`
        : a.score === 0
        ? `<span class="risk-badge" style="color:var(--text-dim)">Not Logged</span>`
        : `<span class="risk-badge none">—</span>`;

      const scoreHtml = a.score > 0
        ? `<span class="score-badge ${sevClass}">${a.score}</span>`
        : `<span style="color:var(--text-dim);font-family:var(--font-mono)">—</span>`;

      const readColor = a.severity === 'green' ? 'var(--green)' : a.severity === 'yellow' ? 'var(--yellow)' : a.severity === 'red' ? 'var(--red)' : 'var(--text-dim)';

      return `
        <tr data-id="${a.id}">
          <td>
            <div class="athlete-cell">
              <div class="athlete-av" style="background:${a.color};color:${a.colorText}">${a.initials}</div>
              <div>
                <div class="athlete-name-text">${a.name}</div>
                <div class="athlete-pos-text">${a.pos} · #${a.jersey}</div>
              </div>
            </div>
          </td>
          <td>${scoreHtml}</td>
          <td>
            <div class="readiness-wrap">
              <div class="readiness-track">
                <div class="readiness-fill" style="width:${readPct}%;background:${readColor}"></div>
              </div>
              <div class="readiness-num" style="color:${readColor}">${a.recovery ?? '—'}</div>
            </div>
          </td>
          <td><span class="acr-val ${acrClass}">${a.acr ?? '—'}</span></td>
          <td>${riskHtml}</td>
          <td><span class="trend-val ${trendCls}">${trendSign}${Math.abs(a.trend)}</span></td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', () => {
        const a = ATHLETES_TODAY.find(x => x.id === row.dataset.id);
        if (a) openAthleteDetail(a);
      });
    });
  }

  function renderLoadBars(ATHLETES_TODAY) {
    const wrap = el('loadBarList');
    if (!wrap) return;
    const athletes = ATHLETES_TODAY.filter(a => a.acr !== null && isFinite(a.acr));
    wrap.innerHTML = athletes.map(a => {
      const pct   = Math.min(100, Math.round((a.acr / 2.0) * 100));
      const cls   = getAcrClass(a.acr);
      const color = cls === 'safe' ? 'var(--green)' : cls === 'watch' ? 'var(--yellow)' : 'var(--red)';
      return `
        <div class="load-bar-item">
          <div class="load-bar-name">${a.name.split(' ')[0]} ${a.name.split(' ')[1]?.[0] || ''}.</div>
          <div class="load-bar-track"><div class="load-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="load-bar-val" style="color:${color}">${a.acr}</div>
          <div class="load-bar-flag">${getAcrFlag(a.acr)}</div>
        </div>`;
    }).join('');

    const legend = el('loadLegend');
    if (legend) legend.innerHTML = `<span>✅ 0.8–1.3</span><span>⚠️ 1.3–1.5</span><span>⛔ 1.5+</span>`;
  }

  function renderAlerts(ATHLETES_TODAY) {
    const wrap = el('alertsList');
    if (!wrap) return;

    const alerts = [];
    ATHLETES_TODAY.filter(a => a.riskLevel === 'rest').forEach(a => {
      alerts.push({ cls: 'danger', icon: '⛔', title: `${a.name} — Rest Recommended`, body: `High risk flags today (${a.flags}).` });
    });
    ATHLETES_TODAY.filter(a => a.riskLevel === 'watch').forEach(a => {
      alerts.push({ cls: 'warn', icon: '⚠', title: `${a.name} — Monitor`, body: `Watch flags today (${a.flags}).` });
    });
    ATHLETES_TODAY.filter(a => a.score === 0).forEach(a => {
      alerts.push({ cls: 'info', icon: '📊', title: `${a.name} — Not Logged`, body: 'No recent logs. Prompt wellness + session check-in.' });
    });

    if (!alerts.length) {
      wrap.innerHTML = `<div class="alert ok"><div class="alert-icon">✅</div><div><div class="alert-title">All Clear</div><div>No risk flags today. Team load is well managed.</div></div></div>`;
      return;
    }
    wrap.innerHTML = alerts.map(al => `
      <div class="alert ${al.cls}">
        <div class="alert-icon">${al.icon}</div>
        <div><div class="alert-title">${al.title}</div><div>${al.body}</div></div>
      </div>`).join('');
  }

  function renderRosterMini(ATHLETES_TODAY) {
    const wrap = el('rosterMini');
    if (!wrap) return;
    wrap.innerHTML = ATHLETES_TODAY.slice(0, 5).map(a => {
      const readPct = a.recovery || 0;
      const color   = a.severity === 'green' ? 'var(--green)' : a.severity === 'yellow' ? 'var(--yellow)' : a.severity === 'red' ? 'var(--red)' : 'var(--text-dim)';
      return `
        <div class="roster-row" data-id="${a.id}">
          <div class="athlete-av" style="background:${a.color};color:${a.colorText};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${a.initials}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${a.name}</div>
            <div style="font-size:11px;color:var(--text-dim)">${a.pos} · #${a.jersey}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
            <div class="readiness-track" style="width:56px"><div class="readiness-fill" style="width:${readPct}%;background:${color}"></div></div>
            <div class="readiness-num" style="color:${color};font-size:11px">${a.score || '—'}</div>
          </div>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.roster-row').forEach(r => {
      r.addEventListener('click', () => {
        const a = ATHLETES_TODAY.find(x => x.id === r.dataset.id);
        if (a) openAthleteDetail(a);
      });
    });
  }

  function renderFeed(ATHLETES_TODAY) {
    const wrap = el('activityFeed');
    if (!wrap) return;

    // Build a small, honest feed from today's logs (no claims beyond data)
    const date = todayISO();
    const items = [];

    ATHLETES_TODAY.forEach(a => {
      const { sessions, wellness, nutrition } = logsForAthlete(a.id);
      const s = getLogByDate(sessions, date);
      const w = getLogByDate(wellness, date);
      const n = getLogByDate(nutrition, date);

      if (s) items.push({ icon: '🏃', cls: 'ok', text: `<strong>${a.name.split(' ')[0]} ${a.name.split(' ')[1]?.[0] || ''}.</strong> logged ${s.type} · ${s.minutes} min · sRPE ${s.rpe}`, time: 'Today' });
      if (w) items.push({ icon: '🌙', cls: 'accent', text: `<strong>${a.name.split(' ')[0]} ${a.name.split(' ')[1]?.[0] || ''}.</strong> wellness: sleep ${w.sleep_hours}h · soreness ${w.soreness}/10`, time: 'Today' });
      if (n) items.push({ icon: '🥗', cls: 'ok', text: `<strong>${a.name.split(' ')[0]} ${a.name.split(' ')[1]?.[0] || ''}.</strong> nutrition: ${n.calories} kcal · ${n.protein_g}g protein`, time: 'Today' });
    });

    if (!items.length) {
      wrap.innerHTML = `<div class="feed-item"><div class="feed-icon accent">ℹ️</div><div><div class="feed-text">No logs yet today. Use Wellness/Nutrition to add check-ins.</div><div class="feed-time">Today</div></div></div>`;
      return;
    }

    wrap.innerHTML = items.slice(0, 6).map(f => `
      <div class="feed-item">
        <div class="feed-icon ${f.cls}">${f.icon}</div>
        <div>
          <div class="feed-text">${f.text}</div>
          <div class="feed-time">${f.time}</div>
        </div>
      </div>`).join('');
  }

  // -----------------------------
  // Events (still demo)
  // -----------------------------
  const EVENTS = [
    { name: 'vs. Riverside Academy', detail: 'Fri Mar 3 · 7:00 PM · Home', days: 3, icon: '🏀', type: 'game' },
    { name: 'State Qualifier', detail: 'Tue Mar 7 · 2:00 PM · Away', days: 7, icon: '🏆', type: 'game' },
    { name: 'Film Session + Walk-thru', detail: 'Mon Mar 2 · 3:00 PM · Gym', days: 2, icon: '📹', type: 'practice' },
    { name: 'Team Recovery Day', detail: 'Sun Mar 1 · 10:00 AM · Facility', days: 1, icon: '🌿', type: 'recovery' },
  ];

  function renderEvents(containerId) {
    const wrap = el(containerId);
    if (!wrap) return;
    wrap.innerHTML = EVENTS.map(ev => `
      <div class="event-item">
        <div style="text-align:center;min-width:36px">
          <div class="event-days-num ${ev.days <= 3 ? 'soon' : ''}">${ev.days}</div>
          <div class="event-days-label">days</div>
        </div>
        <div>
          <div class="event-name">${ev.name}</div>
          <div class="event-detail">${ev.detail}</div>
        </div>
        <div style="font-size:17px;margin-left:auto">${ev.icon}</div>
      </div>`).join('');
  }

  // -----------------------------
  // Athlete list + detail
  // -----------------------------
  function renderAthletesView(filter = '') {
    const grid = el('athleteCardGrid');
    if (!grid) return;
    const ATHLETES_TODAY = athleteModelsForToday();

    const filtered = ATHLETES_TODAY.filter(a =>
      a.name.toLowerCase().includes(filter.toLowerCase()) ||
      a.pos.toLowerCase().includes(filter.toLowerCase())
    );

    const countSub = el('athleteCountSub');
    if (countSub) countSub.textContent = `${ATHLETES_TODAY.length} athletes on roster`;

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim)">No athletes match "${filter}"</div>`;
      return;
    }

    grid.innerHTML = filtered.map(a => {
      const t = getTierLabel(a.score);
      const color = a.severity === 'green' ? 'var(--green)' : a.severity === 'yellow' ? 'var(--yellow)' : a.severity === 'red' ? 'var(--red)' : 'var(--text-dim)';
      return `
        <div class="card" style="cursor:pointer;transition:transform 0.18s,border-color 0.18s" data-id="${a.id}">
          <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="athlete-av" style="background:${a.color};color:${a.colorText};width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:14px;font-weight:700;flex-shrink:0">${a.initials}</div>
              <div>
                <div style="font-weight:700;font-size:14px">${a.name}</div>
                <div style="font-size:12px;color:var(--text-dim)">${a.pos} · #${a.jersey}</div>
              </div>
              <div style="margin-left:auto;font-family:var(--font-display);font-size:28px;font-weight:800;color:${color}">${a.score || '—'}</div>
            </div>
            <div>
              <div class="readiness-track" style="width:100%;height:6px;margin-bottom:8px"><div class="readiness-fill" style="width:${a.recovery||0}%;background:${color}"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:12px">
                <div class="score-tier ${t.cls}" style="font-size:11px">${t.label}</div>
                <div style="color:var(--text-dim)">ACWR: <span style="color:${color}">${a.acr ?? '—'}</span></div>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        const a = ATHLETES_TODAY.find(x => x.id === card.dataset.id);
        if (a) openAthleteDetail(a);
      });
    });
  }

  function animateRing(fillEl, score, circumference = 444) {
    const offset = circumference - (score / 100) * circumference;
    requestAnimationFrame(() => requestAnimationFrame(() => { fillEl.style.strokeDashoffset = offset; }));
  }

  function openAthleteDetail(aModel) {
    switchView('athletes');

    STATE.ui.selected_athlete_id = aModel.id;
    saveState();

    const grid = el('athleteCardGrid');
    const detail = el('athleteDetail');
    if (grid) grid.style.display = 'none';
    if (detail) detail.style.display = 'flex';

    // Hero
    const t = getTierLabel(aModel.score);
    const color = aModel.severity === 'green' ? 'var(--green)' : aModel.severity === 'yellow' ? 'var(--yellow)' : aModel.severity === 'red' ? 'var(--red)' : 'var(--text-dim)';

    el('detailHero').innerHTML = `
      <div class="athlete-hero-av" style="background:${aModel.color};color:${aModel.colorText}">${aModel.initials}</div>
      <div style="flex:1">
        <div class="athlete-hero-name">${aModel.name}</div>
        <div class="athlete-hero-meta">${aModel.pos} · Jersey #${aModel.jersey} · ${(activeTeam().team?.name || '')}</div>
        <div class="athlete-chips">
          <div class="athlete-chip sport">🏀 ${(activeTeam().team?.sport || STATE.profile.sport).charAt(0).toUpperCase() + (activeTeam().team?.sport || STATE.profile.sport).slice(1)}</div>
          <div class="athlete-chip status" style="${aModel.riskLevel === 'rest' ? 'background:var(--red-dim);border-color:var(--red-border);color:var(--red)' : aModel.riskLevel === 'watch' ? 'background:var(--yellow-dim);border-color:var(--yellow-border);color:var(--yellow)' : 'background:var(--green-dim);border-color:var(--green-border);color:var(--green)'}">
            ${aModel.riskLevel === 'rest' ? '⛔ Rest' : aModel.riskLevel === 'watch' ? '⚠ Monitor' : aModel.score > 0 ? '✓ Active' : '⚪ Not Logged'}
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="font-family:var(--font-display);font-size:44px;font-weight:800;color:${color}">${aModel.score || '—'}</div>
        <div class="score-tier ${t.cls}" style="font-size:11px">${t.label}</div>
      </div>`;

    // Ring
    const ringFill = el('detailRingFill');
    ringFill.className = 'ring-fill' + (aModel.score >= 75 ? '' : aModel.score >= 50 ? ' warn' : ' danger');
    el('detailRingNum').textContent = aModel.score || '—';
    el('detailRingNum').className   = 'ring-number' + (aModel.score >= 75 ? '' : aModel.score >= 50 ? ' warn' : ' danger');

    const deltaEl = el('detailRingDelta');
    if (aModel.trend !== 0) {
      deltaEl.className   = 'ring-delta ' + (aModel.trend > 0 ? 'up' : 'down');
      deltaEl.textContent = (aModel.trend > 0 ? '↑' : '↓') + ' ' + Math.abs(aModel.trend) + ' pts';
    } else { deltaEl.textContent = ''; }

    animateRing(ringFill, aModel.score || 0, 440);

    // Tier + note
    el('detailTier').className   = 'score-tier ' + t.cls;
    el('detailTier').textContent  = t.label;
    el('detailScoreNote').innerHTML = aModel.insight;

    // Pillars (use computed)
    const piq = computePIQForAthlete(aModel.id, todayISO());
    const pillars = [
      { icon:'💪', name:'Load', value: piq.pillars.workload, color: piq.pillars.workload >= 75 ? 'var(--green)' : piq.pillars.workload >= 50 ? 'var(--yellow)' : 'var(--red)' },
      { icon:'🌙', name:'Recovery', value: piq.pillars.recovery, color: piq.pillars.recovery >= 75 ? 'var(--green)' : piq.pillars.recovery >= 50 ? 'var(--yellow)' : 'var(--red)' },
      { icon:'🥗', name:'Nutrition', value: piq.pillars.nutrition, color: piq.pillars.nutrition >= 75 ? 'var(--green)' : piq.pillars.nutrition >= 50 ? 'var(--yellow)' : 'var(--red)' },
      { icon:'⚡', name:'Consistency', value: piq.pillars.consistency, color: piq.pillars.consistency >= 75 ? 'var(--green)' : piq.pillars.consistency >= 50 ? 'var(--yellow)' : 'var(--red)' },
    ];
    el('detailPillars').innerHTML = pillars.map(p => `
      <div class="pillar">
        <div class="pillar-icon">${p.icon}</div>
        <div class="pillar-value" style="color:${p.color}">${p.value}</div>
        <div class="pillar-bar"><div class="pillar-fill" style="width:${p.value}%;background:${p.color}"></div></div>
        <div class="pillar-name">${p.name}</div>
      </div>`).join('');

    // Wellness
    const { wellness } = logsForAthlete(aModel.id);
    const w = getLogByDate(wellness, todayISO());
    const wellnessData = [
      { emoji:'😴', label:'Sleep',    value: w ? `${w.sleep_hours}h` : '—', color: w && w.sleep_hours >= 7.5 ? 'var(--green)' : w && w.sleep_hours >= 6 ? 'var(--yellow)' : 'var(--red)' },
      { emoji:'💢', label:'Soreness', value: w ? `${w.soreness}/10` : '—', color: w && w.soreness <= 3 ? 'var(--green)' : w && w.soreness <= 6 ? 'var(--yellow)' : 'var(--red)' },
      { emoji:'⚡', label:'Energy',   value: w ? `${w.energy}/10` : '—', color: w && w.energy >= 7 ? 'var(--green)' : w && w.energy >= 4 ? 'var(--yellow)' : 'var(--red)' },
    ];
    el('detailWellness').innerHTML = wellnessData.map(wi => `
      <div class="wellness-item">
        <div class="wellness-emoji">${wi.emoji}</div>
        <div class="wellness-label">${wi.label}</div>
        <div class="wellness-value" style="color:${wi.color}">${wi.value}</div>
      </div>`).join('');

    // Load bar
    const acr = piq.acwr;
    if (acr !== null && isFinite(acr)) {
      const acrCls = getAcrClass(acr);
      const acrColor = acrCls === 'safe' ? 'var(--green)' : acrCls === 'watch' ? 'var(--yellow)' : 'var(--red)';
      const pct = Math.min(100, Math.round((acr / 2.0) * 100));
      el('detailLoad').innerHTML = `
        <div class="load-bar-item">
          <div class="load-bar-name">ACWR</div>
          <div class="load-bar-track"><div class="load-bar-fill" style="width:${pct}%;background:${acrColor}"></div></div>
          <div class="load-bar-val" style="color:${acrColor}">${acr}</div>
          <div class="load-bar-flag">${getAcrFlag(acr)}</div>
        </div>`;
    } else {
      el('detailLoad').innerHTML = `<div style="font-size:13px;color:var(--text-dim)">No load data available.</div>`;
    }

    // Workout prescription (simple)
    el('detailWorkout').innerHTML = buildWorkoutPrescription(aModel.id);

    // PRs: Not implemented in elite v6 demo; keep placeholder if table exists
    const prTable = q('#detailPRs tbody');
    if (prTable) {
      prTable.innerHTML = `<tr><td colspan="4" style="color:var(--text-dim);text-align:center;padding:20px">PR tracking will be enabled in Phase 2 (cloud sync + coach approvals).</td></tr>`;
    }

    // Apply role-based visibility: athlete role shows "my athlete" only
  }

  function buildWorkoutPrescription(athlete_id) {
    const piq = computePIQForAthlete(athlete_id, todayISO());
    const risk = piq.risk.level;
    if (risk === 'rest') {
      return `
        <div class="alert danger">
          <div class="alert-icon">⛔</div>
          <div>
            <div class="alert-title">Rest Recommended</div>
            <div>Risk flags are elevated today. Prescription: light walking, mobility, and prioritize sleep.</div>
          </div>
        </div>`;
    }
    const type = (risk === 'watch') ? 'recovery' : 'practice';
    const session = generateSession(activeTeam().team?.sport || STATE.profile.sport, type, 60, risk === 'watch' ? 'low' : 'moderate', []);
    return buildWorkoutCardHTML(session, { allowStart: false });
  }

  // -----------------------------
  // Train view: Session generator
  // -----------------------------
  const SESSION_LIBRARY = [
    { type: '🔥 Strength', name: 'TRAP BAR POWER', meta: '50 min · High', color: 'orange' },
    { type: '💨 Speed', name: 'ACCELERATION COMPLEX', meta: '35 min · High', color: 'blue' },
    { type: '🌿 Recovery', name: 'ACTIVE RECOVERY DAY', meta: '25 min · Low', color: 'green' },
    { type: '🏀 Practice', name: 'SKILL MICROBLOCKS', meta: '60 min · Moderate', color: '' },
    { type: '⚡ Power', name: 'PLYOMETRIC CIRCUIT', meta: '40 min · High', color: 'orange' },
    { type: '🧘 Mobility', name: 'PRE-GAME ACTIVATION', meta: '30 min · Low', color: 'green' },
  ];

  function renderTrainView() {
    const lib = el('sessionLibrary');
    if (lib) {
      lib.innerHTML = SESSION_LIBRARY.map(s => `
        <div class="workout-card ${s.color}" style="cursor:pointer">
          <div class="workout-type-tag" style="${s.color === 'orange' ? 'color:var(--orange)' : s.color === 'blue' ? 'color:var(--blue)' : s.color === 'green' ? 'color:var(--green)' : ''}">${s.type}</div>
          <div class="workout-name">${s.name}</div>
          <div class="workout-meta"><span>${s.meta}</span></div>
        </div>`).join('');
    }
  }

  function generateSession(sport, type, duration, intensity, injuries) {
    const sportEmoji = { basketball:'🏀', football:'🏈', soccer:'⚽', baseball:'⚾', volleyball:'🏐', track:'🏃' };
    const typeLabel  = { practice:'Practice', strength:'Strength', speed:'Speed', conditioning:'Conditioning', recovery:'Recovery', competition:'Competition Prep' };
    const intLabel   = { low:'Low', moderate:'Moderate', high:'High' };

    const injNote = injuries.length ? ` · ${injuries.map(i => i.charAt(0).toUpperCase()+i.slice(1)+'-friendly').join(', ')}` : '';

    const blockSets = {
      practice: [
        { dot:'var(--blue)',   name:'Dynamic Warm-up',                   time: Math.round(duration * 0.16) },
        { dot:'var(--accent)', name:'Skill Microblocks — Sport-specific', time: Math.round(duration * 0.25) },
        { dot:'var(--orange)', name:'Strength Block' + (injuries.includes('knee') ? ' (knee-friendly)' : ''), time: Math.round(duration * 0.28) },
        { dot:'var(--yellow)', name:'Power & Conditioning',              time: Math.round(duration * 0.18) },
        { dot:'var(--green)',  name:'Cool-down + Mobility',              time: Math.round(duration * 0.13) },
      ],
      strength: [
        { dot:'var(--blue)',   name:'Warm-up + Movement Prep',           time: Math.round(duration * 0.14) },
        { dot:'var(--orange)', name:'Main Lift — Primary Pattern',       time: Math.round(duration * 0.32) },
        { dot:'var(--accent)', name:'Accessory Work — Volume Build',     time: Math.round(duration * 0.28) },
        { dot:'var(--yellow)', name:'Core & Stability',                  time: Math.round(duration * 0.16) },
        { dot:'var(--green)',  name:'Stretch + Recovery Protocol',       time: Math.round(duration * 0.10) },
      ],
      speed: [
        { dot:'var(--blue)',   name:'Neural Warm-up',                    time: Math.round(duration * 0.18) },
        { dot:'var(--accent)', name:'Acceleration Mechanics × 6 sets',  time: Math.round(duration * 0.30) },
        { dot:'var(--orange)', name:'Max Velocity Runs',                 time: Math.round(duration * 0.25) },
        { dot:'var(--yellow)', name:'Change of Direction Drills',        time: Math.round(duration * 0.17) },
        { dot:'var(--green)',  name:'Cool-down + PNF Stretch',           time: Math.round(duration * 0.10) },
      ],
      recovery: [
        { dot:'var(--blue)',   name:'Light Cardio — Zone 1',             time: Math.round(duration * 0.30) },
        { dot:'var(--green)',  name:'Mobility Flow',                     time: Math.round(duration * 0.30) },
        { dot:'var(--accent)', name:'Foam Rolling + Soft Tissue',        time: Math.round(duration * 0.25) },
        { dot:'var(--yellow)', name:'Breathing + Parasympathetic Reset', time: Math.round(duration * 0.15) },
      ],
      conditioning: [
        { dot:'var(--blue)',   name:'Dynamic Warm-up',                   time: Math.round(duration * 0.15) },
        { dot:'var(--orange)', name:'Aerobic Base Work — Steady State',  time: Math.round(duration * 0.30) },
        { dot:'var(--accent)', name:'Interval Circuits × 4 rounds',     time: Math.round(duration * 0.30) },
        { dot:'var(--yellow)', name:'Lactate Tolerance Drills',          time: Math.round(duration * 0.15) },
        { dot:'var(--green)',  name:'Cool-down',                         time: Math.round(duration * 0.10) },
      ],
      competition: [
        { dot:'var(--blue)',   name:'Pre-Game Activation',               time: Math.round(duration * 0.22) },
        { dot:'var(--accent)', name:'Plyometric Priming × 3 sets',      time: Math.round(duration * 0.25) },
        { dot:'var(--orange)', name:'Sport-Specific Movement Prep',      time: Math.round(duration * 0.28) },
        { dot:'var(--green)',  name:'Mental Cue + Team Walk-through',    time: Math.round(duration * 0.25) },
      ],
    };

    const blocks = blockSets[type] || blockSets.practice;

    return {
      sport, type, duration, intensity,
      typeTag: `${sportEmoji[sport] || '🏀'} ${typeLabel[type] || 'Practice'} · ${intLabel[intensity] || 'Moderate'}${injNote}`,
      name: type === 'recovery' ? 'ACTIVE RECOVERY SESSION'
          : type === 'strength' ? 'STRENGTH & POWER BLOCK'
          : type === 'speed'    ? 'SPEED & ACCELERATION'
          : type === 'competition' ? 'COMPETITION PREP'
          : type === 'conditioning' ? 'CONDITIONING CIRCUIT'
          : 'FULL PRACTICE SESSION',
      meta: [`⏱ ${duration} min`, `🔥 ${intLabel[intensity]}`, `${sportEmoji[sport] || '🏀'} ${sport.charAt(0).toUpperCase()+sport.slice(1)}`].join(' · '),
      blocks,
    };
  }

  function buildWorkoutCardHTML(session, opts={}) {
    const allowStart = opts.allowStart !== false;
    const blocksHtml = session.blocks.map(b => `
      <div class="block-item">
        <div class="block-dot" style="background:${b.dot}"></div>
        <div class="block-name">${b.name}</div>
        <div class="block-time">${b.time} min</div>
      </div>`).join('');

    return `
      <div class="workout-card">
        <div class="workout-type-tag">${session.typeTag}</div>
        <div class="workout-name">${session.name}</div>
        <div class="workout-meta">${session.meta}</div>
        <div class="block-list">${blocksHtml}</div>
        <div style="display:flex;gap:9px;margin-top:14px">
          <button class="btn btn-primary btn-full" style="font-size:13px" ${allowStart ? '' : 'disabled'}>${allowStart ? '▷ Start Session' : 'Session Preview'}</button>
          <button class="btn btn-ghost" style="font-size:13px" id="btnSaveSession">Save</button>
        </div>
      </div>`;
  }

  function renderGeneratedSession() {
    const sport     = el('buildSport')?.value || (activeTeam().team?.sport || STATE.profile.sport);
    const type      = el('buildType')?.value || 'practice';
    const duration  = +((el('buildDuration')?.value) || 60);
    const intensity = (el('buildIntensity')?.value) || 'moderate';
    const injuries  = qa('#injuryChips .inj-chip.active').map(c => c.dataset.injury);

    const session = generateSession(sport, type, duration, intensity, injuries);
    const wrap = el('generatedSessionWrap');
    if (wrap) wrap.innerHTML = buildWorkoutCardHTML(session);
    const saved = el('sessionSaved');
    if (saved) saved.style.display = 'none';

    const saveBtn = el('btnSaveSession');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (saved) saved.style.display = 'inline-flex';
        toast('Session saved to library ✓');
      });
    }

    toast('Session generated ⚡');
  }

  // -----------------------------
  // Analytics (team)
  // -----------------------------
  function renderAnalytics() {
    const sub = el('analyticsSub');
    const { team } = activeTeam();
    if (sub) sub.textContent = `${team?.name || 'Team'} · ${team?.season || 'Season'}`;

    const ATHLETES_TODAY = athleteModelsForToday();
    const logged = ATHLETES_TODAY.filter(a => a.score > 0);
    const avg = logged.length ? Math.round(logged.reduce((s,a)=>s+a.score,0)/logged.length) : 0;
    const logRate = Math.round((logged.length / Math.max(1, ATHLETES_TODAY.length)) * 100);

    const grid = el('analyticsStatGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="stat-card accent">
          <div class="stat-label">Team Avg PIQ</div>
          <div class="stat-value">${avg}</div>
          <div class="stat-sub up">Updated from logs</div>
        </div>
        <div class="stat-card green">
          <div class="stat-label">Logging Rate</div>
          <div class="stat-value">${logRate}%</div>
          <div class="stat-sub up">${logged.length} / ${ATHLETES_TODAY.length} athletes</div>
        </div>
        <div class="stat-card yellow">
          <div class="stat-label">Avg Recovery</div>
          <div class="stat-value">${Math.round((logged.reduce((s,a)=>s+(a.recovery||0),0)/Math.max(1, logged.length))||0)}%</div>
          <div class="stat-sub">Based on wellness</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Risk Flags</div>
          <div class="stat-value">${ATHLETES_TODAY.filter(a => a.riskLevel === 'rest' || a.riskLevel === 'watch').length}</div>
          <div class="stat-sub">Today</div>
        </div>`;
    }

    // Table
    const tbody = el('analyticsBody');
    if (tbody) {
      tbody.innerHTML = ATHLETES_TODAY.filter(a => a.score > 0).map(a => {
        const hist = a.weekHistory || [];
        const w4 = hist[1] ?? '—';
        const w3 = hist[2] ?? '—';
        const w2 = hist[4] ?? '—';
        const now = a.score;
        const delta = a.trend;
        const cls = delta >= 0 ? 'up' : 'down';
        const acrCls = getAcrClass(a.acr);
        return `
          <tr>
            <td>
              <div class="athlete-cell">
                <div class="athlete-av" style="background:${a.color};color:${a.colorText};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${a.initials}</div>
                <div class="athlete-name-text">${a.name}</div>
              </div>
            </td>
            <td style="font-family:var(--font-mono);color:var(--text-dim)">${w4}</td>
            <td style="font-family:var(--font-mono);color:var(--text-dim)">${w3}</td>
            <td style="font-family:var(--font-mono);color:var(--text-dim)">${w2}</td>
            <td><span class="score-badge ${getSeverityClass(a.severity)}">${now}</span></td>
            <td><span class="trend-val ${cls}">${delta >= 0 ? '↑' : '↓'}${Math.abs(delta)}</span></td>
            <td><span class="acr-val ${acrCls}">${a.acr ?? '—'}</span></td>
          </tr>`;
      }).join('');
    }
  }

  // -----------------------------
  // Wellness view
  // -----------------------------
  function setWellnessFormFromExisting(athlete_id) {
    const { wellness } = logsForAthlete(athlete_id);
    const w = getLogByDate(wellness, todayISO());
    el('wSleep').value = w?.sleep_hours ?? '';
    el('wSleepQ').value = w?.sleep_quality ?? '';
    el('wSoreness').value = w?.soreness ?? '';
    el('wEnergy').value = w?.energy ?? '';
    el('wStress').value = w?.stress ?? '';
    el('wMood').value = w?.mood ?? '';
    el('wNote').value = w?.note ?? '';
  }

  function renderWellness7(athlete_id) {
    const wrap = el('wellness7');
    if (!wrap) return;
    const { wellness } = logsForAthlete(athlete_id);
    const dates = dateRangeISO(7, todayISO());
    wrap.innerHTML = dates.map(d => {
      const w = getLogByDate(wellness, d);
      const score = recoveryScoreFromWellness(w);
      const color = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';
      return `
        <div class="load-bar-item">
          <div class="load-bar-name">${d.slice(5)}</div>
          <div class="load-bar-track"><div class="load-bar-fill" style="width:${score}%;background:${color}"></div></div>
          <div class="load-bar-val" style="color:${color}">${score}</div>
          <div class="load-bar-flag">🌙</div>
        </div>`;
    }).join('');
  }

  function saveWellnessFromForm(athlete_id) {
    const date = todayISO();
    const { team } = activeTeam();
    const flags = qa('#wInjuryChips .inj-chip.active').map(b => b.dataset.flag).filter(f => f && f !== 'none');

    const row = {
      id: uuid(),
      athlete_id,
      team_id: team?.id,
      date,
      sleep_hours: Number(el('wSleep').value) || null,
      sleep_quality: Number(el('wSleepQ').value) || null,
      soreness: Number(el('wSoreness').value) || null,
      energy: Number(el('wEnergy').value) || null,
      stress: Number(el('wStress').value) || null,
      mood: Number(el('wMood').value) || null,
      flags,
      note: (el('wNote').value || '').slice(0, 200),
      created_at: new Date().toISOString()
    };

    // Replace existing for today
    STATE.logs.wellness = STATE.logs.wellness.filter(x => !(x.athlete_id === athlete_id && x.date === date));
    STATE.logs.wellness.push(row);
    saveState();
    toast('Wellness saved ✓');
  }

  // -----------------------------
  // Nutrition view
  // -----------------------------
  function setNutritionFormFromExisting(athlete_id) {
    const { nutrition } = logsForAthlete(athlete_id);
    const n = getLogByDate(nutrition, todayISO());
    el('nCals').value = n?.calories ?? '';
    el('nWater').value = n?.water_oz ?? '';
    el('nProtein').value = n?.protein_g ?? '';
    el('nCarbs').value = n?.carbs_g ?? '';
    el('nFat').value = n?.fat_g ?? '';
    el('nNote').value = n?.note ?? '';
  }

  function renderNutritionTargets(athlete_id) {
    const a = athleteById(athlete_id);
    const t = nutritionTargetsForAthlete(a);
    const text = el('nutritionTargetsText');
    if (text) {
      text.textContent = `Targets (auto): ${t.calories} kcal · ${t.protein_g}g protein · ${t.carbs_g}g carbs · ${t.fat_g}g fat · ${t.water_oz} oz water.`;
    }
  }

  function renderNutritionPillar(athlete_id) {
    const a = athleteById(athlete_id);
    const targets = nutritionTargetsForAthlete(a);
    const { nutrition } = logsForAthlete(athlete_id);
    const n = getLogByDate(nutrition, todayISO());
    const score = nutritionScoreFromLog(n, targets);
    const fill = el('nutRingFill');
    const num = el('nutRingNum');
    if (num) num.textContent = n ? score : '—';
    if (fill) {
      const cls = score >= 75 ? '' : score >= 50 ? 'warn' : 'danger';
      fill.className = 'ring-fill' + (cls ? ` ${cls}` : '');
      // circumference for r=70 ~ 439.8, using 444 token in css; keep same
      const circumference = 444;
      fill.style.strokeDasharray = circumference;
      fill.style.strokeDashoffset = circumference;
      animateRing(fill, n ? score : 0, circumference);
    }
    const head = el('nutritionHeadline');
    const note = el('nutritionNote');
    if (head) head.textContent = n ? 'Nutrition logged' : 'Log nutrition to unlock your score';
    if (note) {
      note.textContent = n
        ? `Nutrition pillar score ${score}/100 based on today vs your targets.`
        : 'Protein, carbs, fats, and hydration contribute to the PIQ Nutrition pillar.';
    }
  }

  function renderNutrition7(athlete_id) {
    const wrap = el('nutrition7');
    if (!wrap) return;
    const a = athleteById(athlete_id);
    const t = nutritionTargetsForAthlete(a);
    const { nutrition } = logsForAthlete(athlete_id);
    const dates = dateRangeISO(7, todayISO());
    wrap.innerHTML = dates.map(d => {
      const n = getLogByDate(nutrition, d);
      const score = nutritionScoreFromLog(n, t);
      const color = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';
      return `
        <div class="load-bar-item">
          <div class="load-bar-name">${d.slice(5)}</div>
          <div class="load-bar-track"><div class="load-bar-fill" style="width:${n ? score : 0}%;background:${color}"></div></div>
          <div class="load-bar-val" style="color:${color}">${n ? score : '—'}</div>
          <div class="load-bar-flag">🥗</div>
        </div>`;
    }).join('');
  }

  function saveNutritionFromForm(athlete_id) {
    const date = todayISO();
    const { team } = activeTeam();
    const row = {
      id: uuid(),
      athlete_id,
      team_id: team?.id,
      date,
      calories: Number(el('nCals').value) || null,
      water_oz: Number(el('nWater').value) || null,
      protein_g: Number(el('nProtein').value) || null,
      carbs_g: Number(el('nCarbs').value) || null,
      fat_g: Number(el('nFat').value) || null,
      note: (el('nNote').value || '').slice(0, 200),
      created_at: new Date().toISOString()
    };
    STATE.logs.nutrition = STATE.logs.nutrition.filter(x => !(x.athlete_id === athlete_id && x.date === date));
    STATE.logs.nutrition.push(row);
    saveState();
    toast('Nutrition saved ✓');
  }

  // -----------------------------
  // Settings (team/district)
  // -----------------------------
  function applySettingsFromForm() {
    const { school, team } = activeTeam();
    if (!school || !team) return;

    const newName = (el('settingTeamName')?.value || team.name).trim();
    const newSeason = (el('settingSeason')?.value || team.season).trim();
    const newSport = (el('settingSport')?.value || team.sport).trim().toLowerCase();

    team.name = newName || team.name;
    team.season = newSeason || team.season;
    team.sport = newSport || team.sport;

    // Keep profile sport in sync for athlete prescriptions
    STATE.profile.sport = team.sport;

    saveState();
    toast('Settings saved ✓');
    renderDashboard();
  }

  function exportData() {
    const data = JSON.stringify(STATE, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performanceiq-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export downloaded ✓');
  }

  function resetData() {
    if (!confirm('Reset to demo data? This cannot be undone.')) return;
    STATE = initialState();
    saveState();
    toast('Reset complete ↺');
    init();
  }

  // -----------------------------
  // Navigation / Router
  // -----------------------------
  function switchView(viewId) {
    if (STATE.ui.current_view === viewId) return;
    STATE.ui.current_view = viewId;
    saveState();

    qa('.view').forEach(v => v.classList.remove('active'));
    qa('.nav-btn').forEach(b => b.classList.remove('active'));

    const viewEl = el('view-' + viewId);
    const navEl = q(`[data-view="${viewId}"]`);
    if (viewEl) viewEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    // Render per-view
    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'athletes') {
      renderAthletesView();
      if (el('athleteCardGrid')) el('athleteCardGrid').style.display = '';
      if (el('athleteDetail')) el('athleteDetail').style.display = 'none';
    }
    if (viewId === 'analytics') renderAnalytics();
    if (viewId === 'train') renderTrainView();
    if (viewId === 'schedule') renderEvents('fullEventList');

    if (viewId === 'wellness') {
      const athlete_id = resolveActiveAthleteForPersonalViews();
      setWellnessFormFromExisting(athlete_id);
      renderWellness7(athlete_id);
      const sub = el('wellnessSub');
      if (sub) sub.textContent = `${todayISO()} · ${(athleteById(athlete_id)?.name || 'Athlete')}`;
    }

    if (viewId === 'nutrition') {
      const athlete_id = resolveActiveAthleteForPersonalViews();
      setNutritionFormFromExisting(athlete_id);
      renderNutritionTargets(athlete_id);
      renderNutritionPillar(athlete_id);
      renderNutrition7(athlete_id);
      const sub = el('nutritionSub');
      if (sub) sub.textContent = `${todayISO()} · ${(athleteById(athlete_id)?.name || 'Athlete')}`;
    }

    if (viewId === 'settings') {
      setTopbar();
    }
  }

  function resolveActiveAthleteForPersonalViews() {
    const role = currentRole();
    if (role === 'athlete') return STATE.profile.active_athlete_id;
    // coach/admin: use selected athlete if any, else first athlete
    return STATE.ui.selected_athlete_id || teamAthletes()[0]?.id || STATE.profile.active_athlete_id;
  }

  function applyRoleVisibility() {
    const role = currentRole();

    // Hide/show nav buttons based on caps
    const map = {
      dashboard: true,
      athletes: hasCap('team') || hasCap('me') || hasCap('analytics'),
      analytics: hasCap('analytics'),
      train: hasCap('train'),
      schedule: hasCap('schedule'),
      wellness: hasCap('wellness'),
      nutrition: hasCap('nutrition'),
      settings: hasCap('settings') || hasCap('district') || hasCap('export')
    };

    qa('.nav-btn[data-view]').forEach(btn => {
      const v = btn.dataset.view;
      const show = map[v] !== false;
      btn.style.display = show ? '' : 'none';
    });

    // Default view if current is not allowed
    const current = STATE.ui.current_view || 'dashboard';
    if (map[current] === false) {
      switchView('dashboard');
    }
  }

  // -----------------------------
  // Onboarding (minimal, uses existing modal in HTML)
  // -----------------------------
  let obStep = 1;
  let obSelectedRole = STATE.profile.role || 'coach';
  let obSelectedSport = STATE.profile.sport || 'basketball';

  function setObStep(step) {
    obStep = step;
    qa('.modal-step').forEach(s => s.classList.remove('active'));
    const s = el(`obStep${step}`);
    if (s) s.classList.add('active');
    const prog = el('obProgress');
    if (prog) prog.style.width = `${Math.round((step / 3) * 100)}%`;
  }

  function initOnboarding() {
    const modal = el('onboardingModal');
    if (!modal) return;

    const seen = localStorage.getItem(LS_SEEN);
    if (!seen) modal.style.display = 'flex';

    qa('#roleGrid .role-card').forEach(card => {
      card.addEventListener('click', () => {
        qa('#roleGrid .role-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        obSelectedRole = card.dataset.role || 'coach';
      });
    });

    qa('#sportGrid .sport-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        qa('#sportGrid .sport-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        obSelectedSport = chip.dataset.sport || 'basketball';
      });
    });

    // Step buttons
    el('obNext1')?.addEventListener('click', () => setObStep(2));
    el('obBack2')?.addEventListener('click', () => setObStep(1));
    el('obNext2')?.addEventListener('click', () => {
      const session = generateSession(obSelectedSport, 'practice', 60, 'moderate', []);
      const wrap = el('obFirstSession');
      if (wrap) {
        wrap.innerHTML = buildWorkoutCardHTML(session, { allowStart: false });
        qa('button', wrap).forEach(b => b.style.display = 'none');
      }
      setObStep(3);
    });
    el('obBack3')?.addEventListener('click', () => setObStep(2));

    el('obSkip')?.addEventListener('click', () => {
      modal.style.display = 'none';
      localStorage.setItem(LS_SEEN, '1');
      toast('Welcome to PerformanceIQ ⚡');
    });

    el('obFinish')?.addEventListener('click', () => {
      // Apply to state
      STATE.profile.role = obSelectedRole;
      STATE.profile.sport = obSelectedSport;

      // Sync team sport
      const { team } = activeTeam();
      if (team) team.sport = obSelectedSport;

      saveState();
      localStorage.setItem(LS_SEEN, '1');
      modal.style.display = 'none';
      applyRoleVisibility();
      renderDashboard();
      toast('Welcome to PerformanceIQ ⚡');
    });

    setObStep(1);
  }

  // -----------------------------
  // Wire events
  // -----------------------------
  function wireEvents() {
    // Nav
    qa('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Search athletes
    el('athleteSearch')?.addEventListener('input', (e) => {
      if (STATE.ui.current_view !== 'athletes') switchView('athletes');
      renderAthletesView(e.target.value);
    });
    el('athleteFilterInput')?.addEventListener('input', (e) => {
      renderAthletesView(e.target.value);
    });

    // Athlete detail back
    el('backToList')?.addEventListener('click', () => {
      el('athleteDetail').style.display = 'none';
      el('athleteCardGrid').style.display = '';
      renderAthletesView();
    });
    el('viewAllAthletes')?.addEventListener('click', () => switchView('athletes'));
    el('rosterMore')?.addEventListener('click', () => switchView('athletes'));

    // Train controls
    el('btnGenerate')?.addEventListener('click', renderGeneratedSession);
    el('btnGenerateInline')?.addEventListener('click', renderGeneratedSession);
    el('btnPushToday')?.addEventListener('click', () => toast('Session pushed to Today ✓'));

    qa('#injuryChips .inj-chip').forEach(chip => {
      chip.addEventListener('click', () => chip.classList.toggle('active'));
    });

    // Wellness injury chips
    qa('#wInjuryChips .inj-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (chip.dataset.flag === 'none') {
          qa('#wInjuryChips .inj-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          return;
        }
        // toggling non-none removes "none"
        q('#wInjuryChips .inj-chip[data-flag="none"]')?.classList.remove('active');
        chip.classList.toggle('active');
      });
    });

    el('btnSaveWellness')?.addEventListener('click', () => {
      const athlete_id = resolveActiveAthleteForPersonalViews();
      saveWellnessFromForm(athlete_id);
      renderWellness7(athlete_id);
      renderDashboard();
    });

    el('btnAutoWellness')?.addEventListener('click', () => {
      el('wSleep').value = '7.8';
      el('wSleepQ').value = '8';
      el('wSoreness').value = '3';
      el('wEnergy').value = '8';
      el('wStress').value = '3';
      el('wMood').value = '8';
      toast('Demo values filled');
    });

    el('btnSaveNutrition')?.addEventListener('click', () => {
      const athlete_id = resolveActiveAthleteForPersonalViews();
      saveNutritionFromForm(athlete_id);
      renderNutritionTargets(athlete_id);
      renderNutritionPillar(athlete_id);
      renderNutrition7(athlete_id);
      renderDashboard();
    });

    el('btnAutoNutrition')?.addEventListener('click', () => {
      el('nCals').value = '2800';
      el('nWater').value = '96';
      el('nProtein').value = '160';
      el('nCarbs').value = '320';
      el('nFat').value = '80';
      toast('Demo values filled');
    });

    // Refresh
    el('btnRefresh')?.addEventListener('click', () => {
      renderDashboard();
      toast('Data refreshed ↺');
    });

    // Exports
    el('btnExportData')?.addEventListener('click', exportData);
    el('btnResetData')?.addEventListener('click', resetData);

    // Settings save
    el('btnSaveSettings')?.addEventListener('click', applySettingsFromForm);
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    applyRoleVisibility();
    initOnboarding();
    wireEvents();

    // Default to last view
    const view = STATE.ui.current_view || 'dashboard';
    switchView(view);

    // Ensure dashboard renders once at load
    renderDashboard();
  }

  init();

  // Expose minimal debug (no secrets)
  window.__PIQ_DEBUG__ = {
    getState: () => JSON.parse(JSON.stringify(STATE)),
    computePIQForAthlete: (id, dateISO) => computePIQForAthlete(id, dateISO || todayISO())
  };
})();

// js/views/dashboard.js — PerformanceIQ
// Role-aware dashboard. Pulls live data from your actual schema.

import { getProfile }              from '../core/supabase.js'
import { getTodayWorkout, getStreak, getWorkouts } from '../services/workoutService.js'
import { getTodayReadiness, getLatestPIQScore }    from '../services/readinessService.js'
import { getUnreadCount }          from '../services/notificationService.js'
import { navigate }                from '../core/router.js'

export async function render(container) {
  const profile = getProfile()

  // Show skeleton immediately
  container.innerHTML = _skeleton()

  // Fetch in parallel
  const [todayWorkout, readiness, piqScore, streak, recentWorkouts, unread] = await Promise.all([
    getTodayWorkout(),
    getTodayReadiness(),
    getLatestPIQScore(),
    getStreak(),
    getWorkouts({ limit: 5 }),
    getUnreadCount()
  ])

  const role = profile?.role ?? 'athlete'

  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">
        ${_greeting()}, <em class="hl">${profile?.display_name?.split(' ')[0] ?? 'Athlete'}</em>
      </h1>
      <p class="view-page-subtitle">
        ${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
        ${unread > 0 ? `· <span style="color:var(--accent-red)">${unread} notification${unread>1?'s':''}</span>` : ''}
      </p>
    </div>

    <!-- KPI Strip -->
    <div class="kpi-strip">
      ${_kpiCard('PIQ Score', piqScore?.piq_score ?? profile?.piq_score ?? '—', 'kv-green',
          piqScore?.injury_risk ? `Risk: ${piqScore.injury_risk}` : 'Your composite score', 'ks-muted')}
      ${_kpiCard('Readiness', readiness?.score ?? profile?.readiness_score ?? '—', 'kv-blue',
          readiness?.tier ? _tierLabel(readiness.tier) : 'Log today to update', 'ks-muted')}
      ${_kpiCard('Streak', streak, 'kv-green', streak === 1 ? 'day' : 'days', 'ks-muted')}
      ${_kpiCard('This Week', _weekCount(recentWorkouts), 'kv-navy', 'workouts done', 'ks-muted')}
    </div>

    <!-- Today + Sidebar -->
    <div class="two-col">
      <div>
        <!-- Today's Workout -->
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head">
            <span class="panel-title">Today's Training</span>
            <button class="btn-outline" style="width:auto;padding:6px 14px;font-size:11px"
              onclick="navigate('/builder')">+ New</button>
          </div>
          ${todayWorkout ? _workoutCard(todayWorkout) : _noWorkout()}
        </div>

        <!-- Recent sessions -->
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Recent Sessions</span>
            <button style="font-size:12px;color:var(--accent-green);background:none;border:none;cursor:pointer"
              onclick="navigate('/progress')">View all →</button>
          </div>
          ${recentWorkouts.length
            ? recentWorkouts.slice(0,5).map(_sessionRow).join('')
            : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">No sessions yet — start training!</div>`}
        </div>
      </div>

      <!-- Right panel -->
      <div>
        <!-- Readiness snapshot -->
        <div class="panel" style="margin-bottom:14px">
          <div class="panel-head"><span class="panel-title">Readiness</span></div>
          <div class="rpanel-section">
            ${readiness ? _readinessSnapshot(readiness) : _noReadiness()}
          </div>
        </div>

        <!-- PIQ breakdown -->
        ${piqScore ? `
        <div class="panel" style="margin-bottom:14px">
          <div class="panel-head"><span class="panel-title">PIQ Breakdown</span></div>
          <div class="rpanel-section">
            ${_piqBar('Consistency', piqScore.consistency, 'pf-green')}
            ${_piqBar('Readiness',   piqScore.readiness,   'pf-blue')}
            ${_piqBar('Compliance',  piqScore.compliance,  'pf-amber')}
            ${_piqBar('Load Mgmt',   piqScore.load_mgmt,   'pf-red')}
          </div>
        </div>` : ''}

        <!-- Quick links -->
        <div class="panel">
          <div class="panel-head"><span class="panel-title">Quick Actions</span></div>
          <div style="padding:12px;display:flex;flex-direction:column;gap:8px">
            ${_quickLink('💚', 'Log Readiness',  '/readiness')}
            ${_quickLink('📚', 'Exercise Library','/library')}
            ${_quickLink('🥗', 'Nutrition Log',   '/nutrition')}
            ${_quickLink('⭐', 'PIQ Score',        '/piq-score')}
          </div>
        </div>
      </div>
    </div>
  `

  // Wire navigate calls
  container.querySelectorAll('[onclick]').forEach(el => {
    const fn = el.getAttribute('onclick')
    if (fn?.startsWith('navigate(')) {
      const path = fn.match(/'([^']+)'/)?.[1]
      if (path) el.addEventListener('click', () => navigate(path))
      el.removeAttribute('onclick')
    }
  })
}

// ── HELPERS ───────────────────────────────────────────────────

function _greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function _kpiCard(label, value, valClass, sub, subClass) {
  return `
    <div class="kpi-card">
      <div class="kpi-lbl">${label}</div>
      <div class="kpi-val ${valClass}">${value}</div>
      <div class="kpi-sub ${subClass}">${sub}</div>
    </div>`
}

function _workoutCard(w) {
  const done = w.status === 'completed'
  return `
    <div style="padding:16px 20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary)">${w.title}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
            ${w.day_type ?? ''} ${w.sport ? '· ' + w.sport : ''} ${w.duration_min ? '· ' + w.duration_min + ' min' : ''}
          </div>
        </div>
        <span class="session-badge ${done ? 'sb-done' : 'sb-next'}">${done ? 'Done' : 'Up Next'}</span>
      </div>
      ${w.exercises?.length ? `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
          ${w.exercises.length} exercise${w.exercises.length !== 1 ? 's' : ''}
        </div>` : ''}
      ${!done ? `
        <button onclick="navigate('/today')" style="
          width:100%;padding:10px;background:var(--accent-green);color:white;
          border:none;border-radius:8px;font-family:'Oswald',sans-serif;
          font-size:14px;font-weight:700;letter-spacing:0.06em;cursor:pointer">
          START SESSION →
        </button>` : ''}
      ${w.notes ? `<div style="margin-top:10px;font-size:12px;color:var(--text-muted);font-style:italic">${w.notes}</div>` : ''}
    </div>`
}

function _noWorkout() {
  return `
    <div style="padding:28px 20px;text-align:center">
      <div style="font-size:32px;margin-bottom:8px">🏋️</div>
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px">No session scheduled today</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Build a workout or choose a program template</div>
      <button onclick="navigate('/builder')" class="btn-outline" style="width:auto;padding:8px 20px">
        Build Workout
      </button>
    </div>`
}

function _sessionRow(w) {
  const done    = w.status === 'completed'
  const skipped = w.status === 'skipped'
  return `
    <div class="session-row" onclick="navigate('/progress')">
      <div class="session-icon ${done ? 'si-done' : skipped ? 'si-future' : 'si-today'}">
        ${done ? '✅' : skipped ? '⏭' : '📋'}
      </div>
      <div style="flex:1;min-width:0">
        <div class="session-name">${w.title}</div>
        <div class="session-meta">${w.scheduled_date} · ${w.day_type ?? 'training'}</div>
      </div>
      <span class="session-badge ${done ? 'sb-done' : skipped ? 'sb-sat' : 'sb-next'}">
        ${done ? 'Done' : skipped ? 'Skipped' : 'Planned'}
      </span>
    </div>`
}

function _readinessSnapshot(r) {
  const tier = r.tier ?? 'moderate'
  const color = tier === 'high' ? 'var(--accent-green)' : tier === 'low' ? 'var(--accent-red)' : 'var(--accent-amber)'
  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-size:36px;font-family:'Oswald',sans-serif;font-weight:700;color:${color}">${r.score}</div>
      <div>
        <div style="font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.06em">${tier}</div>
        <div style="font-size:11px;color:var(--text-muted)">Today's readiness</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--text-muted)">
      <div>😴 Sleep: ${r.sleep_hrs ?? '—'}h</div>
      <div>⚡ Soreness: ${r.soreness ?? '—'}</div>
      <div>🔋 Battery: ${r.body_battery ?? '—'}</div>
      <div>💧 Hydration: ${r.hydration ?? '—'}</div>
    </div>`
}

function _noReadiness() {
  return `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">No check-in yet today</div>
      <button onclick="navigate('/readiness')" class="btn-outline" style="width:auto;padding:6px 16px;font-size:11px">
        Log Now
      </button>
    </div>`
}

function _piqBar(label, value, fillClass) {
  const v = Math.round(value ?? 0)
  return `
    <div class="progress-row">
      <div class="prog-lbl-row">
        <span class="prog-lbl">${label}</span>
        <span class="prog-meta">${v}%</span>
      </div>
      <div class="prog-track">
        <div class="prog-fill ${fillClass}" style="width:${v}%"></div>
      </div>
    </div>`
}

function _quickLink(icon, label, path) {
  return `
    <button onclick="navigate('${path}')" style="
      display:flex;align-items:center;gap:10px;padding:10px 12px;
      background:transparent;border:1px solid var(--card-border);border-radius:8px;
      cursor:pointer;text-align:left;font-size:13px;font-weight:500;
      color:var(--text-primary);transition:background 0.15s;width:100%"
      onmouseover="this.style.background='var(--accent-green-dim)'"
      onmouseout="this.style.background='transparent'">
      <span style="font-size:16px">${icon}</span>${label}
    </button>`
}

function _tierLabel(tier) {
  return tier === 'high' ? '✅ Ready to train' : tier === 'moderate' ? '⚠️ Train smart' : '🔴 Consider recovery'
}

function _weekCount(workouts) {
  const monday = new Date()
  monday.setDate(monday.getDate() - monday.getDay() + 1)
  monday.setHours(0,0,0,0)
  return workouts.filter(w =>
    w.status === 'completed' && new Date(w.scheduled_date) >= monday
  ).length
}

function _skeleton() {
  return `
    <div style="padding:0">
      <div class="piq-skeleton" style="height:32px;width:240px;border-radius:8px;margin-bottom:8px"></div>
      <div class="piq-skeleton" style="height:14px;width:180px;border-radius:6px;margin-bottom:24px"></div>
      <div class="kpi-strip">
        ${Array(4).fill('<div class="piq-skeleton" style="height:96px;border-radius:12px"></div>').join('')}
      </div>
    </div>`
}

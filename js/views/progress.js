// js/views/progress.js — PerformanceIQ
import { getWorkouts } from '../services/workoutService.js'
import { getReadinessHistory } from '../services/readinessService.js'
import { navigate } from '../core/router.js'

export async function render(container) {
  container.innerHTML = _skeleton()
  const [workouts, readiness] = await Promise.all([
    getWorkouts({ limit: 30 }),
    getReadinessHistory(30)
  ])

  const completed = workouts.filter(w => w.status === 'completed')
  const totalMin  = completed.reduce((s, w) => s + (w.duration_min ?? 0), 0)
  const avgRpe    = completed.filter(w => w.rpe_actual).length
    ? Math.round(completed.filter(w=>w.rpe_actual).reduce((s,w)=>s+w.rpe_actual,0) / completed.filter(w=>w.rpe_actual).length * 10) / 10
    : '—'

  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">Training <em class="hl">Progress</em></h1>
      <p class="view-page-subtitle">Last 30 days</p>
    </div>

    <div class="kpi-strip" style="margin-bottom:22px">
      ${_kpi('Workouts Done', completed.length, 'kv-green', 'this month')}
      ${_kpi('Total Time',    totalMin >= 60 ? Math.round(totalMin/60)+'h' : totalMin+'m', 'kv-blue', 'training volume')}
      ${_kpi('Avg RPE',       avgRpe, 'kv-navy', 'intensity level')}
      ${_kpi('Readiness Logs', readiness.length, 'kv-green', 'check-ins')}
    </div>

    <div class="two-col">
      <div class="panel">
        <div class="panel-head"><span class="panel-title">Session History</span></div>
        ${workouts.length ? workouts.slice(0,20).map(w => {
          const done    = w.status === 'completed'
          const skipped = w.status === 'skipped'
          const date    = new Date(w.scheduled_date + 'T12:00:00')
          const label   = date.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
          return `
            <div class="session-row">
              <div class="session-icon ${done?'si-done':skipped?'si-future':'si-today'}">${done?'✅':skipped?'⏭':'📋'}</div>
              <div style="flex:1;min-width:0">
                <div class="session-name">${w.title}</div>
                <div class="session-meta">${label} · ${w.day_type??'training'} ${w.rpe_actual?'· RPE '+w.rpe_actual:''}</div>
              </div>
              <span class="session-badge ${done?'sb-done':skipped?'sb-sat':'sb-next'}">${done?'Done':skipped?'Skip':'Plan'}</span>
            </div>`
        }).join('') : `
          <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">
            No sessions yet. <button onclick="navigate('/today')" style="background:none;border:none;color:var(--accent-green);cursor:pointer;font-size:13px">Start training →</button>
          </div>`}
      </div>

      <div class="panel">
        <div class="panel-head"><span class="panel-title">Readiness Trend</span></div>
        ${readiness.length ? readiness.slice().reverse().slice(0,14).map(r => {
          const tier  = r.tier ?? 'moderate'
          const color = tier==='high'?'#24C054':tier==='low'?'#EF4444':'#F59E0B'
          const date  = new Date(r.log_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})
          return `
            <div class="session-row">
              <div style="width:36px;height:36px;border-radius:8px;background:${color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <span style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;color:${color}">${r.score}</span>
              </div>
              <div style="flex:1"><div class="session-name">${date}</div>
              <div class="session-meta">${r.soreness?'Soreness: '+r.soreness:''}</div></div>
              <span style="font-size:11px;font-weight:600;color:${color};text-transform:uppercase">${tier}</span>
            </div>`
        }).join('') : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">No readiness data yet.</div>`}
      </div>
    </div>
  `

  container.querySelectorAll('[onclick]').forEach(el => {
    const path = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
    if (path) { el.addEventListener('click', () => navigate(path)); el.removeAttribute('onclick') }
  })
}

function _kpi(label, value, valClass, sub) {
  return `<div class="kpi-card"><div class="kpi-lbl">${label}</div><div class="kpi-val ${valClass}">${value}</div><div class="kpi-sub ks-muted">${sub}</div></div>`
}
function _skeleton() {
  return `<div><div class="piq-skeleton" style="height:32px;width:200px;border-radius:8px;margin-bottom:8px"></div><div class="piq-skeleton" style="height:14px;width:140px;border-radius:6px;margin-bottom:24px"></div><div class="kpi-strip">${Array(4).fill('<div class="piq-skeleton" style="height:96px;border-radius:12px"></div>').join('')}</div></div>`
}

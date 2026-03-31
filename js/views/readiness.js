// js/views/readiness.js — PerformanceIQ
// Readiness check-in form matched to your actual readiness_logs schema.

import { logReadiness, getTodayReadiness, getReadinessHistory } from '../services/readinessService.js'
import { navigate } from '../core/router.js'

export async function render(container) {
  container.innerHTML = _skeleton()

  const [existing, history] = await Promise.all([
    getTodayReadiness(),
    getReadinessHistory(14)
  ])

  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">Daily <em class="hl">Readiness</em></h1>
      <p class="view-page-subtitle">How are you feeling today?</p>
    </div>

    <div class="two-col">
      <div>
        ${existing ? _alreadyLogged(existing) : _checkInForm()}
      </div>

      <div>
        <!-- History panel -->
        <div class="panel">
          <div class="panel-head"><span class="panel-title">Last 14 Days</span></div>
          ${history.length ? _historyList(history) : `
            <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
              No history yet. Start logging daily!
            </div>`}
        </div>
      </div>
    </div>
  `

  if (!existing) _bindForm(container)
}

// ── ALREADY LOGGED ────────────────────────────────────────────

function _alreadyLogged(r) {
  const tier    = r.tier ?? 'moderate'
  const color   = tier === 'high' ? '#24C054' : tier === 'low' ? '#EF4444' : '#F59E0B'
  const tierLbl = tier === 'high' ? '✅ Ready to train' : tier === 'low' ? '🔴 Recovery day' : '⚠️ Train smart'

  return `
    <div class="panel">
      <div class="panel-head"><span class="panel-title">Today's Check-in</span></div>
      <div style="padding:24px 20px;text-align:center">
        <div style="font-size:64px;font-family:'Oswald',sans-serif;font-weight:700;color:${color};line-height:1">${r.score}</div>
        <div style="font-size:14px;font-weight:600;color:${color};margin-top:6px">${tierLbl}</div>
        <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left">
          ${_statChip('😴 Sleep', r.sleep_hrs ? r.sleep_hrs + 'h' : '—')}
          ${_statChip('💪 Soreness', r.soreness || '—')}
          ${_statChip('🔋 Battery', r.body_battery ? r.body_battery + '%' : '—')}
          ${_statChip('💧 Hydration', r.hydration || '—')}
          ${r.hrv ? _statChip('❤️ HRV', r.hrv) : ''}
          ${r.notes ? `<div style="grid-column:1/-1;font-size:12px;color:var(--text-muted);font-style:italic;padding:8px 12px;background:var(--content-bg);border-radius:6px">"${r.notes}"</div>` : ''}
        </div>
        <button onclick="navigate('/today')" class="btn-outline" style="margin-top:20px;width:auto;padding:10px 24px">
          Go to Training →
        </button>
      </div>
    </div>`
}

function _statChip(label, value) {
  return `
    <div style="background:var(--content-bg);border-radius:8px;padding:10px 12px">
      <div style="font-size:11px;color:var(--text-muted)">${label}</div>
      <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-top:2px">${value}</div>
    </div>`
}

// ── CHECK-IN FORM ─────────────────────────────────────────────

function _checkInForm() {
  return `
    <div class="panel">
      <div class="panel-head"><span class="panel-title">Log Today's Readiness</span></div>
      <form id="readiness-form" style="padding:16px 20px;display:flex;flex-direction:column;gap:18px" novalidate>

        <!-- Sleep -->
        <div>
          <label class="rpanel-title">Hours of Sleep</label>
          <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
            <input type="range" id="sleep-hrs" name="sleepHrs" min="3" max="12" step="0.5" value="7.5" style="flex:1"
              oninput="document.getElementById('sleep-val').textContent=this.value+'h'">
            <span id="sleep-val" style="font-family:'Oswald',sans-serif;font-size:20px;font-weight:700;color:var(--accent-green);min-width:40px">7.5h</span>
          </div>
        </div>

        <!-- Soreness -->
        <div>
          <label class="rpanel-title">Muscle Soreness</label>
          <div style="display:flex;gap:8px;margin-top:8px">
            ${['Low','Medium','High'].map(s => `
              <button type="button" class="soreness-btn ${s==='Low'?'active':''}" data-val="${s}"
                style="flex:1;padding:10px;border:1.5px solid ${s==='Low'?'var(--accent-green)':'var(--card-border)'};
                border-radius:8px;background:${s==='Low'?'var(--accent-green-dim)':'transparent'};
                font-size:13px;font-weight:600;cursor:pointer;color:var(--text-primary)">
                ${s==='Low'?'🟢':s==='Medium'?'🟡':'🔴'} ${s}
              </button>`).join('')}
          </div>
        </div>

        <!-- Body Battery -->
        <div>
          <label class="rpanel-title">Energy Level (Body Battery)</label>
          <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
            <input type="range" id="battery" name="bodyBattery" min="0" max="100" value="70" style="flex:1"
              oninput="document.getElementById('battery-val').textContent=this.value+'%'">
            <span id="battery-val" style="font-family:'Oswald',sans-serif;font-size:20px;font-weight:700;color:var(--accent-blue);min-width:44px">70%</span>
          </div>
        </div>

        <!-- Hydration -->
        <div>
          <label class="rpanel-title">Hydration</label>
          <select id="hydration" name="hydration" style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg);margin-top:8px">
            <option value="On target">💧 On target</option>
            <option value="Slightly behind">😐 Slightly behind</option>
            <option value="Behind">⚠️ Behind</option>
            <option value="Very dehydrated">🔴 Very dehydrated</option>
          </select>
        </div>

        <!-- HRV (optional) -->
        <div>
          <label class="rpanel-title">HRV (optional — from Garmin/Apple Watch)</label>
          <input type="text" id="hrv" name="hrv" placeholder="e.g. 62ms"
            style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;
            font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg);margin-top:8px">
        </div>

        <!-- Notes -->
        <div>
          <label class="rpanel-title">Notes (optional)</label>
          <textarea id="readiness-notes" name="notes"
            placeholder="Anything worth noting — extra stress, poor sleep, minor pain..."
            style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;
            font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg);
            resize:vertical;min-height:60px;margin-top:8px"></textarea>
        </div>

        <div id="readiness-error" style="display:none;background:#FEE2E2;border:1px solid #FCA5A5;color:#991B1B;padding:10px 14px;border-radius:8px;font-size:13px"></div>

        <button type="submit" id="readiness-submit" style="
          width:100%;padding:13px;background:var(--accent-green);color:white;border:none;
          border-radius:8px;font-family:'Oswald',sans-serif;font-size:15px;font-weight:700;
          letter-spacing:0.06em;cursor:pointer">
          SAVE CHECK-IN
        </button>
      </form>
    </div>`
}

// ── HISTORY LIST ──────────────────────────────────────────────

function _historyList(history) {
  return history.slice().reverse().map(r => {
    const tier  = r.tier ?? 'moderate'
    const color = tier === 'high' ? '#24C054' : tier === 'low' ? '#EF4444' : '#F59E0B'
    const date  = new Date(r.log_date + 'T12:00:00')
    const label = date.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
    return `
      <div class="session-row">
        <div style="width:44px;height:44px;border-radius:10px;background:${color}22;
          display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-family:'Oswald',sans-serif;font-size:16px;font-weight:700;color:${color}">${r.score}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="session-name">${label}</div>
          <div class="session-meta">${r.soreness ? 'Soreness: ' + r.soreness : ''} ${r.sleep_hrs ? '· Sleep ' + r.sleep_hrs + 'h' : ''}</div>
        </div>
        <span style="font-size:11px;font-weight:600;color:${color};text-transform:uppercase">${tier}</span>
      </div>`
  }).join('')
}

// ── BIND ──────────────────────────────────────────────────────

function _bindForm(container) {
  let soreness = 'Low'

  // Soreness buttons
  container.querySelectorAll('.soreness-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      soreness = btn.dataset.val
      container.querySelectorAll('.soreness-btn').forEach(b => {
        const active = b.dataset.val === soreness
        b.style.borderColor = active ? 'var(--accent-green)' : 'var(--card-border)'
        b.style.background  = active ? 'var(--accent-green-dim)' : 'transparent'
      })
    })
  })

  // Navigate buttons
  container.querySelectorAll('[onclick]').forEach(el => {
    const path = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
    if (path) { el.addEventListener('click', () => navigate(path)); el.removeAttribute('onclick') }
  })

  // Form submit
  const form   = container.querySelector('#readiness-form')
  const errEl  = container.querySelector('#readiness-error')
  const subBtn = container.querySelector('#readiness-submit')

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    errEl.style.display = 'none'
    subBtn.disabled     = true
    subBtn.textContent  = 'Saving…'

    try {
      await logReadiness({
        sleepHrs:    +container.querySelector('#sleep-hrs').value,
        bodyBattery: +container.querySelector('#battery').value,
        hydration:   container.querySelector('#hydration').value,
        hrv:         container.querySelector('#hrv').value.trim() || null,
        notes:       container.querySelector('#readiness-notes').value.trim(),
        soreness
      })
      await render(container)
    } catch (err) {
      errEl.textContent   = err.message ?? 'Failed to save. Try again.'
      errEl.style.display = 'block'
      subBtn.disabled     = false
      subBtn.textContent  = 'SAVE CHECK-IN'
    }
  })
}

function _skeleton() {
  return `<div>
    <div class="piq-skeleton" style="height:32px;width:220px;border-radius:8px;margin-bottom:8px"></div>
    <div class="piq-skeleton" style="height:14px;width:160px;border-radius:6px;margin-bottom:24px"></div>
    <div class="two-col">
      <div class="piq-skeleton" style="height:400px;border-radius:12px"></div>
      <div class="piq-skeleton" style="height:300px;border-radius:12px"></div>
    </div>
  </div>`
}

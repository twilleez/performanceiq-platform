/**
 * Player — Readiness Check-In View
 *
 * FIX [Error-4]: PIQ Score now updates live after check-in is saved.
 * Listens for 'piq:stateChanged' with key='readiness' and patches the
 * score/color DOM nodes directly — no navigation or full re-render needed.
 *
 * Also preserves [P0-1] fix: getReadinessScoreElite() returns object, use .raw/.color
 */
import { buildSidebar }           from '../../components/nav.js';
import { getCurrentRole }         from '../../core/auth.js';
import { patchReadinessCheckIn, getReadinessCheckIn } from '../../state/state.js';
import { getReadinessScoreElite } from '../../state/selectorsElite.js';
import { showToast }              from '../../core/notifications.js';

function _ratingField(id, label, subLabel, options, currentVal) {
  return `
  <div style="margin-bottom:14px">
    <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);margin-bottom:3px;letter-spacing:.01em">${label}</div>
    <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:7px">${subLabel}</div>
    <div style="display:flex;gap:4px">
      ${options.map((opt, i) => {
        const val = i + 1; const sel = currentVal === val;
        return `<button class="rating-btn" data-field="${id}" data-val="${val}"
          style="flex:1;padding:8px 4px;border-radius:8px;border:1px solid ${sel?'var(--piq-green)':'var(--border)'};
          background:${sel?'var(--piq-green)':'var(--surface-2)'};color:${sel?'#0d1b3e':'var(--text-muted)'};
          font-size:11px;font-weight:${sel?'700':'500'};cursor:pointer;transition:all .15s">${opt}</button>`;
      }).join('')}
    </div>
  </div>`;
}

export function renderPlayerReadiness() {
  const role    = getCurrentRole() || 'player';
  const checkin = getReadinessCheckIn();

  // [P0-1 preserved] Correct destructuring of elite score object
  const scoreObj = getReadinessScoreElite();
  const rawScore = scoreObj.raw   ?? 72;
  const color    = scoreObj.color ?? '#f59e0b';
  const explain  = scoreObj.explain ?? '';

  const today        = new Date().toDateString();
  const hasCheckedIn = checkin.date === today && checkin.sleepQuality > 0;

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/readiness')}
  <main class="page-main">
    <div class="page-header">
      <h1>Readiness <span>check-in</span></h1>
      <p>Your daily readiness directly impacts your PIQ Score and today's training intensity.</p>
    </div>

    ${hasCheckedIn
      ? `<div style="background:#22c95514;border:1px solid #22c95540;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
          <span style="font-size:24px">✅</span>
          <div>
            <div style="font-weight:700;font-size:13.5px;color:var(--piq-green)">Today's check-in complete</div>
            <div style="font-size:12px;color:var(--text-muted)">Readiness: <strong id="live-score-badge" style="color:${color}">${rawScore}</strong> — training adjusted accordingly.</div>
          </div>
         </div>`
      : `<div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
          <span style="font-size:24px">⚡</span>
          <div>
            <div style="font-weight:700;font-size:13.5px;color:#f59e0b">Check in now for an accurate readiness score</div>
            <div style="font-size:12px;color:var(--text-muted)">Takes 60 seconds. Directly updates your PIQ Score and workout intensity.</div>
          </div>
         </div>`}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">
      <div class="panel">
        <div class="panel-title">Daily check-in</div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 16px">Rate each factor honestly. Private — used only to optimize your training.</div>

        ${_ratingField('sleep-quality', 'Sleep quality',   'How well did you sleep?',        ['Poor','Fair','OK','Good','Excellent'], checkin.sleepQuality)}
        ${_ratingField('energy-level',  'Energy level',    'How energized do you feel?',     ['Low','Below avg','Moderate','Good','High'], checkin.energyLevel)}
        ${_ratingField('soreness',      'Muscle soreness', 'How sore are your muscles?',     ['None','Mild','Moderate','High','Severe'], checkin.soreness)}
        ${_ratingField('mood',          'Mood',            'How is your mental state today?',['Poor','Low','Neutral','Good','Great'], checkin.mood)}
        ${_ratingField('stress-level',  'Stress level',    'Academic / social stress today?',['None','Low','Moderate','High','Very high'], checkin.stressLevel)}

        <div class="b-field" style="margin-top:12px">
          <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:5px">Sleep hours</label>
          <input type="number" id="checkin-sleep-hours" min="0" max="12" step="0.5" value="${checkin.sleepHours||''}" placeholder="e.g. 7.5">
        </div>
        <div class="b-field" style="margin-top:8px">
          <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:5px">Hydration (oz today)</label>
          <input type="number" id="checkin-hydration" min="0" max="200" step="4" value="${checkin.hydration||''}" placeholder="e.g. 48">
        </div>
        <div class="b-field" style="margin-top:8px">
          <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:5px">Notes <span style="font-weight:400;font-size:11px">(optional)</span></label>
          <textarea id="checkin-notes" rows="2"
            style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:8px;font-size:13px;color:var(--text-primary);resize:vertical;font-family:inherit"
            placeholder="Any soreness, illness, or stress to flag…">${checkin.notes||''}</textarea>
        </div>

        <button class="btn-primary" id="submit-checkin-btn" style="width:100%;margin-top:16px;font-size:13.5px;padding:12px">
          ${hasCheckedIn ? 'Update check-in' : 'Submit check-in'}
        </button>
        <div id="checkin-saved" style="display:none;color:var(--piq-green);font-size:12.5px;margin-top:8px;text-align:center">
          ✅ Check-in saved — PIQ Score updated
        </div>
      </div>

      <!-- [Error-4 FIX] Score panel: all score elements get IDs for live DOM update -->
      <div class="panel">
        <div class="panel-title">Current readiness</div>
        <div style="text-align:center;padding:20px 0">
          <div id="live-score-big" style="font-size:56px;font-weight:900;color:${color};line-height:1;transition:color .3s">${rawScore}</div>
          <div id="live-score-explain" style="font-size:13px;color:var(--text-muted);margin-top:8px;line-height:1.5">${explain}</div>
        </div>

        <div id="live-factor-bars">
          ${_factorBars(checkin)}
        </div>

        <div style="margin-top:14px;padding:12px;background:var(--surface-2);border-radius:10px;font-size:12px;color:var(--text-muted);line-height:1.6">
          Calculated from 5 wellness factors weighted by Halson 2014 sleep review + IOC 2016 athlete monitoring consensus.
        </div>
      </div>
    </div>
  </main>
</div>`;
}

function _factorBars(checkin) {
  return [
    { label:'Sleep',    val: checkin.sleepQuality || 0, max:5, inv:false },
    { label:'Energy',   val: checkin.energyLevel  || 0, max:5, inv:false },
    { label:'Soreness', val: checkin.soreness      || 0, max:5, inv:true  },
    { label:'Mood',     val: checkin.mood          || 0, max:5, inv:false },
    { label:'Stress',   val: checkin.stressLevel   || 0, max:5, inv:true  },
  ].map(f => {
    const display = f.inv ? (5 - f.val) : f.val;
    const pct = Math.max(0, Math.round((display / f.max) * 100));
    const fc  = pct >= 60 ? 'var(--piq-green)' : pct >= 40 ? '#f59e0b' : '#ef4444';
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span style="font-size:12px;color:var(--text-muted)">${f.label}</span>
        <span style="font-size:12px;font-weight:700;color:${fc}">${f.val}/${f.max}</span>
      </div>
      <div style="height:5px;background:var(--surface-2);border-radius:3px">
        <div style="height:5px;width:${pct}%;background:${fc};border-radius:3px;transition:width .3s"></div>
      </div>
    </div>`;
  }).join('');
}

// ── EVENT WIRING ──────────────────────────────────────────────

// [Error-4 FIX] Named handler so we can remove it when view unloads
let _stateHandler = null;

document.addEventListener('piq:viewRendered', () => {
  const submitBtn = document.getElementById('submit-checkin-btn');
  if (!submitBtn) return;

  const ratings = {};

  // Wire rating buttons
  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      ratings[field] = parseInt(btn.dataset.val);
      document.querySelectorAll(`.rating-btn[data-field="${field}"]`).forEach(b => {
        const sel = parseInt(b.dataset.val) === ratings[field];
        b.style.background  = sel ? 'var(--piq-green)' : 'var(--surface-2)';
        b.style.color       = sel ? '#0d1b3e' : 'var(--text-muted)';
        b.style.fontWeight  = sel ? '700' : '500';
        b.style.borderColor = sel ? 'var(--piq-green)' : 'var(--border)';
      });
    });
  });

  // Submit handler
  submitBtn.addEventListener('click', () => {
    if (submitBtn.disabled) return;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Saving…';

    patchReadinessCheckIn({
      date:         new Date().toDateString(),
      sleepQuality: ratings['sleep-quality'] || 0,
      energyLevel:  ratings['energy-level']  || 0,
      soreness:     ratings['soreness']      || 0,
      mood:         ratings['mood']          || 0,
      stressLevel:  ratings['stress-level']  || 0,
      sleepHours:   parseFloat(document.getElementById('checkin-sleep-hours')?.value) || 0,
      hydration:    parseFloat(document.getElementById('checkin-hydration')?.value)   || 0,
      notes:        document.getElementById('checkin-notes')?.value.trim() || '',
    });
    // patchReadinessCheckIn() dispatches 'piq:stateChanged' → handler below updates DOM

    const saved = document.getElementById('checkin-saved');
    if (saved) saved.style.display = 'block';
    submitBtn.textContent       = 'Check-in saved ✓';
    submitBtn.style.background  = 'var(--piq-green)';
    submitBtn.style.color       = '#0d1b3e';

    setTimeout(() => {
      submitBtn.disabled         = false;
      submitBtn.textContent      = 'Update check-in';
      submitBtn.style.background = '';
      submitBtn.style.color      = '';
    }, 3000);
  });

  // [Error-4 FIX] Listen for state change and update score display live
  // Remove previous listener first to prevent accumulation
  if (_stateHandler) {
    document.removeEventListener('piq:stateChanged', _stateHandler);
  }

  _stateHandler = (e) => {
    if (e.detail?.key !== 'readiness') return;

    const updated = getReadinessScoreElite();
    const raw     = updated.raw   ?? 72;
    const col     = updated.color ?? '#f59e0b';
    const exp     = updated.explain ?? '';

    // Update big score number
    const bigEl = document.getElementById('live-score-big');
    if (bigEl) { bigEl.textContent = raw; bigEl.style.color = col; }

    // Update explain text
    const expEl = document.getElementById('live-score-explain');
    if (expEl) expEl.textContent = exp;

    // Update badge in completion banner
    const badgeEl = document.getElementById('live-score-badge');
    if (badgeEl) { badgeEl.textContent = raw; badgeEl.style.color = col; }

    // Update factor bars with fresh check-in data
    const barsEl  = document.getElementById('live-factor-bars');
    const checkin = getReadinessCheckIn();
    if (barsEl) barsEl.innerHTML = _factorBars(checkin);

    // Also update any PIQ score displays on the same page
    _updatePIQDisplays();
  };

  document.addEventListener('piq:stateChanged', _stateHandler);
});

/**
 * [Error-4 FIX] Update any PIQ score/readiness displays elsewhere on the page.
 * Looks for elements with data-live="piq" or data-live="readiness" and updates them.
 * Views can opt-in by adding data-live="piq" to their score display elements.
 */
function _updatePIQDisplays() {
  const scoreObj = getReadinessScoreElite();

  document.querySelectorAll('[data-live="readiness"]').forEach(el => {
    el.textContent = scoreObj.raw ?? 72;
    el.style.color = scoreObj.color ?? '#f59e0b';
  });
}

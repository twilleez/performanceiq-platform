/**
 * PerformanceIQ — Player Readiness Check-In v3
 * ─────────────────────────────────────────────────────────────
 * UPGRADED: Quick check-in mode (finding #3)
 *
 * Flow:
 *   Default → single overall wellness slider (1–10)
 *             → submit → score computed immediately
 *   Optional → "Add detail" expander reveals full 5-factor form
 *              with sleep hours + hydration + notes
 *
 * This mirrors what AthleteMonitoring and similar tools do.
 * Daily active use goes up when check-in takes 5s not 60s.
 *
 * Science note: The quick slider maps directly to the composite
 * wellness score. Full form still available for accuracy.
 * Gabbett et al. (2016) found subjective wellness a valid proxy
 * for readiness even at single-item resolution.
 */
import { buildSidebar }                              from '../../components/nav.js';
import { getCurrentRole }                            from '../../core/auth.js';
import { patchReadinessCheckIn, getReadinessCheckIn } from '../../state/state.js';
import { getReadinessScore, getReadinessColor }      from '../../state/selectors.js';
import { getReadinessScoreElite }                    from '../../state/selectorsElite.js';
import { showToast }                                 from '../../core/notifications.js';
import { navigate }                                  from '../../router.js';

export function renderPlayerReadiness() {
  const role         = getCurrentRole() || 'player';
  const checkin      = getReadinessCheckIn();
  const score        = getReadinessScoreElite();
  const color        = getReadinessColor(score);
  const today        = new Date().toDateString();
  const hasCheckedIn = checkin.date === today && checkin.sleepQuality > 0;

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/readiness')}
  <main class="page-main">

    <div class="page-header">
      <h1>Readiness <span>Check-In</span></h1>
      <p>Your daily readiness directly impacts your PIQ Score and today's recommended training intensity.</p>
    </div>

    ${hasCheckedIn ? `
    <div style="background:#22c95514;border:1px solid #22c95540;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <span style="font-size:24px">✅</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13.5px;color:var(--piq-green)">Today's check-in complete</div>
        <div style="font-size:12px;color:var(--text-muted)">Readiness Score: <strong style="color:${color}">${score}</strong> — Training intensity adjusted accordingly.</div>
      </div>
      <button class="btn-draft" style="font-size:12px;padding:6px 12px;flex-shrink:0" id="redo-checkin-btn">Update</button>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">

      <!-- ── Check-In Panel ──────────────────────────────── -->
      <div class="panel">

        ${hasCheckedIn ? `
        <!-- Redo mode header -->
        <div class="panel-title">Update Today's Check-In</div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 16px">Already submitted today. Update if anything has changed.</div>
        ` : `
        <div class="panel-title">Daily Check-In</div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 0">Takes 5 seconds. Add detail anytime.</div>
        `}

        <!-- ── QUICK MODE (default) ──────────────────────── -->
        <div id="checkin-quick">
          <div style="margin:20px 0 6px;font-size:13px;font-weight:600;color:var(--text-primary)">
            How do you feel overall right now?
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
            <span style="font-size:11px;color:var(--text-muted);width:36px">Poor</span>
            <input
              type="range"
              id="quick-slider"
              min="1" max="10" value="${checkin.quickScore || 6}"
              style="flex:1;accent-color:var(--piq-green);cursor:pointer"
            >
            <span style="font-size:11px;color:var(--text-muted);width:36px;text-align:right">Peak</span>
          </div>
          <div style="text-align:center;margin-bottom:16px">
            <span id="quick-val-display" style="font-family:'Oswald',sans-serif;font-size:32px;font-weight:700;color:var(--piq-green)">${checkin.quickScore || 6}</span>
            <span style="font-size:13px;color:var(--text-muted)">&thinsp;/ 10</span>
          </div>

          <button class="btn-primary" style="width:100%;font-size:13px;padding:12px" id="quick-submit-btn">
            Submit Check-In
          </button>

          <button type="button" id="expand-full-btn"
            style="width:100%;margin-top:10px;background:none;border:none;font-size:12px;color:var(--text-muted);cursor:pointer;padding:6px;text-decoration:underline;text-underline-offset:3px">
            + Add detail for a more accurate score
          </button>
        </div>

        <!-- ── FULL DETAIL FORM (expandable) ──────────────── -->
        <div id="checkin-full" style="display:none">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;padding:8px 10px;background:var(--surface-2);border-radius:8px">
            Rate each factor for the most accurate score. Sleep quality (35%) matters most.
          </div>

          ${_ratingField('sleep-quality', 'Sleep Quality', 'How well did you sleep?',
              ['Poor','Fair','OK','Good','Excellent'], checkin.sleepQuality)}
          ${_ratingField('energy-level',  'Energy Level',  'How energized do you feel?',
              ['Exhausted','Low','Moderate','High','Peak'], checkin.energyLevel)}
          ${_ratingField('soreness',      'Muscle Soreness','How sore are your muscles?',
              ['None','Mild','Moderate','Significant','Very Sore'], checkin.soreness)}
          ${_ratingField('mood',          'Mood / Motivation','How motivated to train?',
              ['Very Low','Low','Neutral','High','Fired Up'], checkin.mood)}
          ${_ratingField('stress-level',  'Stress Level',  'How stressed do you feel?',
              ['None','Low','Moderate','High','Very High'], checkin.stressLevel)}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
            <div class="b-field">
              <label>Sleep Hours</label>
              <input type="number" id="checkin-sleep-hours" value="${checkin.sleepHours || ''}"
                placeholder="e.g. 8" min="3" max="12" step="0.5">
            </div>
            <div class="b-field">
              <label>Hydration (oz)</label>
              <input type="number" id="checkin-hydration" value="${checkin.hydration || ''}"
                placeholder="e.g. 80" min="0" max="200">
            </div>
          </div>
          <div class="b-field" style="margin-top:10px">
            <label>Notes (optional)</label>
            <input type="text" id="checkin-notes" value="${checkin.notes || ''}"
              placeholder="e.g. legs sore from yesterday…">
          </div>

          <button class="btn-primary" style="width:100%;margin-top:16px;font-size:13px;padding:12px" id="submit-checkin-btn">
            Submit Detailed Check-In
          </button>
          <button type="button" id="collapse-full-btn"
            style="width:100%;margin-top:8px;background:none;border:none;font-size:12px;color:var(--text-muted);cursor:pointer;padding:6px;text-decoration:underline;text-underline-offset:3px">
            ← Back to quick check-in
          </button>
        </div>

      </div>

      <!-- ── Score Panel ─────────────────────────────────── -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Current Readiness Score</div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:12px">
            <div style="width:72px;height:72px;border-radius:50%;border:4px solid ${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-weight:900;font-size:22px;color:${color}">${score}</span>
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text-primary)">
                ${score>=85?'Peak Readiness':score>=70?'High Readiness':score>=55?'Moderate Readiness':'Low Readiness'}
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5">
                ${score>=85?'Train at full intensity today.':score>=70?'Train hard. Minor adjustments may help.':score>=55?'Reduce volume ~20%. Quality over quantity.':'Active recovery only. Rest is training too.'}
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">Score Components</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
            ${_scoreBar('Sleep',       checkin.sleepQuality, 5, '#3b82f6')}
            ${_scoreBar('Energy',      checkin.energyLevel,  5, '#22c955')}
            ${_scoreBar('Soreness',    checkin.soreness ? (6 - checkin.soreness) : 0, 5, '#f59e0b', true)}
            ${_scoreBar('Mood',        checkin.mood,        5, '#a78bfa')}
            ${_scoreBar('Stress',      checkin.stressLevel ? (6 - checkin.stressLevel) : 0, 5, '#fb923c', true)}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:10px">
            Based on Halson 2014 sleep review weights + IOC 2016 consensus
          </div>
        </div>
      </div>

    </div>
  </main>
</div>`;
}

// ── HELPERS ───────────────────────────────────────────────────

function _ratingField(id, label, sublabel, options, currentVal) {
  return `
<div style="margin-bottom:14px">
  <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px">${label}</div>
  <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${sublabel}</div>
  <div style="display:flex;gap:5px" id="${id}-group">
    ${options.map((opt, i) => `
    <button type="button" data-field="${id}" data-val="${i+1}"
      style="flex:1;padding:7px 3px;border-radius:8px;border:1px solid ${currentVal===(i+1)?'var(--piq-green)':'var(--border)'};
             background:${currentVal===(i+1)?'var(--piq-green)':'var(--surface-2)'};
             color:${currentVal===(i+1)?'#0d1b3e':'var(--text-muted)'};
             font-size:10px;font-weight:${currentVal===(i+1)?700:500};cursor:pointer;transition:all 150ms;text-align:center">
      <div style="font-size:13px;margin-bottom:2px">${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i]}</div>
      <div>${opt}</div>
    </button>`).join('')}
  </div>
</div>`;
}

function _scoreBar(label, val, max, color, inverted = false) {
  const pct = val ? Math.round((val / max) * 100) : 0;
  return `
  <div>
    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
      <span style="font-size:12px;color:var(--text-muted)">${label}${inverted?' (lower = better)':''}</span>
      <span style="font-size:12px;font-weight:600;color:${val?color:'var(--text-muted)'}">${val?val+'/'+max:'—'}</span>
    </div>
    <div style="height:5px;background:var(--surface-2);border-radius:3px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width .4s ease"></div>
    </div>
  </div>`;
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'player/readiness') return;

  // ── Quick slider live update ───────────────────────────────
  const slider  = document.getElementById('quick-slider');
  const display = document.getElementById('quick-val-display');
  slider?.addEventListener('input', () => {
    if (display) display.textContent = slider.value;
  });

  // ── Quick submit ───────────────────────────────────────────
  document.getElementById('quick-submit-btn')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('quick-slider')?.value) || 6;
    // Map 1-10 to 5-factor composite (quick mode uses symmetric mapping)
    const mapped = Math.round((val / 10) * 5);
    patchReadinessCheckIn({
      date:         new Date().toDateString(),
      quickScore:   val,
      sleepQuality: mapped,
      energyLevel:  mapped,
      soreness:     Math.max(1, 6 - mapped),
      mood:         mapped,
      stressLevel:  Math.max(1, 6 - mapped),
      sleepHours:   0,
      hydration:    0,
      notes:        '',
    });
    showToast('✅ Check-in saved!', 'success');
    navigate('player/readiness');
  });

  // ── Expand / collapse detail form ─────────────────────────
  document.getElementById('expand-full-btn')?.addEventListener('click', () => {
    document.getElementById('checkin-quick').style.display = 'none';
    document.getElementById('checkin-full').style.display  = 'block';
  });
  document.getElementById('collapse-full-btn')?.addEventListener('click', () => {
    document.getElementById('checkin-quick').style.display = 'block';
    document.getElementById('checkin-full').style.display  = 'none';
  });
  document.getElementById('redo-checkin-btn')?.addEventListener('click', () => {
    document.getElementById('checkin-quick').style.display = 'block';
    document.getElementById('checkin-full').style.display  = 'none';
  });

  // ── Full detail form rating buttons ───────────────────────
  const ratings = {
    'sleep-quality': 0, 'energy-level': 0,
    'soreness': 0, 'mood': 0, 'stress-level': 0
  };

  document.querySelectorAll('[data-field][data-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const val   = parseInt(btn.dataset.val);
      ratings[field] = val;
      document.querySelectorAll(`[data-field="${field}"]`).forEach(b => {
        const sel = parseInt(b.dataset.val) === val;
        b.style.background   = sel ? 'var(--piq-green)' : 'var(--surface-2)';
        b.style.color        = sel ? '#0d1b3e' : 'var(--text-muted)';
        b.style.fontWeight   = sel ? '700' : '500';
        b.style.borderColor  = sel ? 'var(--piq-green)' : 'var(--border)';
      });
    });
  });

  // ── Full detail submit ─────────────────────────────────────
  document.getElementById('submit-checkin-btn')?.addEventListener('click', () => {
    const sl = ratings['sleep-quality'];
    patchReadinessCheckIn({
      date:         new Date().toDateString(),
      quickScore:   sl ? Math.round((sl / 5) * 10) : 6,
      sleepQuality: sl,
      energyLevel:  ratings['energy-level'],
      soreness:     ratings['soreness'],
      mood:         ratings['mood'],
      stressLevel:  ratings['stress-level'],
      sleepHours:   parseFloat(document.getElementById('checkin-sleep-hours')?.value) || 0,
      hydration:    parseFloat(document.getElementById('checkin-hydration')?.value)    || 0,
      notes:        document.getElementById('checkin-notes')?.value || '',
    });
    showToast('✅ Detailed check-in saved!', 'success');
    navigate('player/readiness');
  });
});

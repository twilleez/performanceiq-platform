/**
 * PerformanceIQ — Player Readiness Check-In v4
 * ─────────────────────────────────────────────────────────────
 * PHASE 1 UPGRADE: Added fatigueLevel field.
 * Engine 1 (calcReadiness) uses 5 factors with Halson 2014 weights:
 *   sleep 30% · energy 15% · soreness 20% · fatigue 15% · stress 10% · mood 10%
 * Without fatigueLevel the engine was running on 4 factors with a
 * mis-weighted composite. This closes the gap.
 *
 * UX: Quick mode (single slider) + expandable detail form.
 * Quick mode maps slider → symmetric 5-factor estimates.
 * Detail form captures all 6 factors + sleep hours + hydration + notes.
 */

import { buildSidebar }                          from '../../components/nav.js';
import { getCurrentRole }                        from '../../core/auth.js';
import { addCheckIn, getReadinessCheckIn }            from '../../state/state.js';
import { getReadinessScore, getReadinessColor, getReadinessResult,
         getPIQScore, getStreak }  from '../../state/selectors.js';
import { showToast }                             from '../../core/notifications.js';
import { navigate }                              from '../../router.js';

export function renderSoloReadiness() {
  const role         = getCurrentRole() || 'solo';
  const ci           = getReadinessCheckIn();
  const result       = getReadinessResult();
  const score        = result.score;
  const color        = getReadinessColor(score);
  const today        = new Date().toDateString();
  const hasCheckedIn = ci.date === today && ci.sleepQuality > 0;

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/readiness')}
  <main class="page-main">

    <div class="page-header">
      <h1>Readiness <span>Check-In</span></h1>
      <p>Daily check-in feeds the readiness engine and adjusts your PIQ score and workout intensity.</p>
    </div>

    ${hasCheckedIn ? `
    <div style="background:#22c95514;border:1px solid #22c95540;border-radius:12px;
                padding:13px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <span style="font-size:22px">✅</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13.5px;color:var(--piq-green)">Today's check-in complete</div>
        <div style="font-size:12px;color:var(--text-muted)">
          Score: <strong style="color:${color}">${score}</strong> — ${result.label}
          ${result.acwr ? ` · ACWR ${result.acwr}` : ''}
        </div>
      </div>
      <button class="btn-draft" style="font-size:12px;padding:6px 12px;flex-shrink:0" id="redo-checkin-btn">Update</button>
    </div>` : `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;
                padding:13px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <span style="font-size:22px">⚡</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13.5px;color:#f59e0b">Log today's check-in for an accurate score</div>
        <div style="font-size:12px;color:var(--text-muted)">Takes 5 seconds. 5-factor engine runs immediately.</div>
      </div>
    </div>`}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">

      <!-- ── Check-In Panel ──────────────────────────────── -->
      <div class="panel">
        <div class="panel-title">${hasCheckedIn ? 'Update Check-In' : 'Daily Check-In'}</div>

        <!-- Quick mode (default) -->
        <div id="checkin-quick">
          <div style="margin:16px 0 6px;font-size:13px;font-weight:600;color:var(--text-primary)">
            Overall wellness right now?
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
            <span style="font-size:11px;color:var(--text-muted);width:32px">Poor</span>
            <input type="range" id="quick-slider" min="1" max="10"
              value="${ci.quickScore || 6}"
              style="flex:1;accent-color:var(--piq-green);cursor:pointer">
            <span style="font-size:11px;color:var(--text-muted);width:32px;text-align:right">Peak</span>
          </div>
          <div style="text-align:center;margin-bottom:16px">
            <span id="quick-val-display"
              style="font-family:'Oswald',sans-serif;font-size:36px;font-weight:700;color:var(--piq-green)">
              ${ci.quickScore || 6}
            </span>
            <span style="font-size:13px;color:var(--text-muted)">&thinsp;/ 10</span>
          </div>
          <button class="btn-primary" id="quick-submit-btn" style="width:100%;font-size:13px;padding:12px">
            Submit Check-In
          </button>
          <button type="button" id="expand-full-btn"
            style="width:100%;margin-top:10px;background:none;border:none;font-size:12px;
                   color:var(--text-muted);cursor:pointer;padding:6px;
                   text-decoration:underline;text-underline-offset:3px">
            + Add detail for a more accurate score
          </button>
        </div>

        <!-- Detail form (expandable) -->
        <div id="checkin-full" style="display:none">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;padding:8px 10px;
                      background:var(--surface-2);border-radius:8px;line-height:1.5">
            5-factor engine (Halson 2014): Sleep 30% · Soreness 20% · Fatigue 15% · Stress 10% · Mood 10% · Energy 15%
          </div>

          ${_ratingField('sleep-quality',  'Sleep Quality',    'How well did you sleep?',
              ['Poor','Fair','OK','Good','Excellent'], ci.sleepQuality)}
          ${_ratingField('energy-level',   'Energy Level',     'How energized do you feel?',
              ['Exhausted','Low','Moderate','High','Peak'], ci.energyLevel)}
          ${_ratingField('fatigue-level',  'Fatigue',          'How fatigued do you feel overall?',
              ['None','Slight','Moderate','High','Exhausted'], ci.fatigueLevel)}
          ${_ratingField('soreness',       'Muscle Soreness',  'How sore are your muscles?',
              ['None','Mild','Moderate','Significant','Very Sore'], ci.soreness)}
          ${_ratingField('mood',           'Mood / Motivation','How motivated to train?',
              ['Very Low','Low','Neutral','High','Fired Up'], ci.mood)}
          ${_ratingField('stress-level',   'Stress Level',     'School, life, work stress?',
              ['None','Low','Moderate','High','Very High'], ci.stressLevel)}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
            <div class="b-field">
              <label>Sleep Hours</label>
              <input type="number" id="ci-sleep-hours" value="${ci.sleepHours||''}"
                placeholder="e.g. 8" min="3" max="12" step="0.5">
            </div>
            <div class="b-field">
              <label>Hydration (oz)</label>
              <input type="number" id="ci-hydration" value="${ci.hydration||''}"
                placeholder="e.g. 80" min="0" max="200">
            </div>
          </div>
          <div class="b-field" style="margin-top:10px">
            <label>Notes (optional)</label>
            <input type="text" id="ci-notes" value="${ci.notes||''}"
              placeholder="e.g. legs sore from yesterday…">
          </div>

          <button class="btn-primary" id="detail-submit-btn"
            style="width:100%;margin-top:16px;font-size:13px;padding:12px">
            Submit Detailed Check-In
          </button>
          <button type="button" id="collapse-full-btn"
            style="width:100%;margin-top:8px;background:none;border:none;font-size:12px;
                   color:var(--text-muted);cursor:pointer;padding:6px;
                   text-decoration:underline;text-underline-offset:3px">
            ← Back to quick check-in
          </button>
        </div>
      </div>

      <!-- ── Score Panel ─────────────────────────────────── -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Current Readiness Score</div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:12px">
            <div style="width:72px;height:72px;border-radius:50%;border:4px solid ${color};
                        display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-weight:900;font-size:22px;color:${color}">${score}</span>
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text-primary)">${result.label}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5">
                ${result.detail || ''}
              </div>
            </div>
          </div>
          ${result.acwr ? `
          <div style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:12px;
               background:${result.acwrZone==='sweet-spot'?'#22c95514':result.acwrZone==='danger'?'#ef444414':'#f59e0b14'};
               color:${result.acwrZone==='sweet-spot'?'var(--piq-green)':result.acwrZone==='danger'?'#ef4444':'#f59e0b'}">
            ACWR ${result.acwr} — ${result.acwrMsg.replace(/ ACWR [0-9.]+/,'')}
          </div>` : ''}
        </div>

        <div class="panel">
          <div class="panel-title">Score Factors</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:9px">
            ${_scoreBar('Sleep Quality',  ci.sleepQuality,  5, '#3b82f6')}
            ${_scoreBar('Energy',         ci.energyLevel,   5, '#22c955')}
            ${_scoreBar('Fatigue (inv)',  ci.fatigueLevel ? (6 - ci.fatigueLevel) : 0, 5, '#f59e0b', true)}
            ${_scoreBar('Soreness (inv)', ci.soreness ? (6 - ci.soreness) : 0, 5, '#fb923c', true)}
            ${_scoreBar('Mood',           ci.mood,          5, '#a78bfa')}
            ${_scoreBar('Stress (inv)',   ci.stressLevel ? (6 - ci.stressLevel) : 0, 5, '#ef4444', true)}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:10px">
            Weights: Halson Sports Med 2014 · ACWR: Gabbett BJSM 2016
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
      style="flex:1;padding:7px 3px;border-radius:8px;
             border:1px solid ${currentVal===(i+1)?'var(--piq-green)':'var(--border)'};
             background:${currentVal===(i+1)?'var(--piq-green)':'var(--surface-2)'};
             color:${currentVal===(i+1)?'#0d1b3e':'var(--text-muted)'};
             font-size:10px;font-weight:${currentVal===(i+1)?700:500};cursor:pointer;
             transition:all 150ms;text-align:center">
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
      <span style="font-size:12px;color:var(--text-muted)">${label}</span>
      <span style="font-size:12px;font-weight:600;color:${val?color:'var(--text-muted)'}">
        ${val ? val+'/'+max : '—'}
      </span>
    </div>
    <div style="height:5px;background:var(--surface-2);border-radius:3px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width .4s ease"></div>
    </div>
  </div>`;
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  const route = e.detail?.route || '';
  if (!route.endsWith('/readiness')) return;

  // Quick slider live display
  const slider  = document.getElementById('quick-slider');
  const display = document.getElementById('quick-val-display');
  slider?.addEventListener('input', () => {
    if (display) display.textContent = slider.value;
  });

  // Quick submit — maps 1-10 to 5-factor symmetric estimate
  document.getElementById('quick-submit-btn')?.addEventListener('click', () => {
    const val    = parseInt(slider?.value) || 6;
    const mapped = Math.round((val / 10) * 5);
    const inv    = Math.max(1, 6 - mapped);
    const fields = {
      quickScore:   val,
      sleepQuality: mapped,
      energyLevel:  mapped,
      fatigueLevel: inv,
      soreness:     inv,
      mood:         mapped,
      stressLevel:  inv,
    };
    addCheckIn(fields, {
      piqSnapshot: {
        piq:      getPIQScore(),
        readiness: Math.round((
          (mapped/5)*100*.30 + (mapped/5)*100*.15 +
          ((6-inv)/5)*100*.20 + ((6-inv)/5)*100*.15 +
          ((6-inv)/5)*100*.10 + (mapped/5)*100*.10
        )),
        streak: getStreak(),
      }
    });
    showToast('✅ Check-in saved!', 'success');
    navigate(route);
  });

  // Expand / collapse
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

  // Detail form rating buttons
  const ratings = {
    'sleep-quality':0, 'energy-level':0, 'fatigue-level':0,
    'soreness':0, 'mood':0, 'stress-level':0,
  };

  document.querySelectorAll('[data-field][data-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const val   = parseInt(btn.dataset.val);
      ratings[field] = val;
      document.querySelectorAll(`[data-field="${field}"]`).forEach(b => {
        const sel = parseInt(b.dataset.val) === val;
        b.style.background  = sel ? 'var(--piq-green)' : 'var(--surface-2)';
        b.style.color       = sel ? '#0d1b3e'          : 'var(--text-muted)';
        b.style.fontWeight  = sel ? '700'              : '500';
        b.style.borderColor = sel ? 'var(--piq-green)' : 'var(--border)';
      });
    });
  });

  // Detail submit
  document.getElementById('detail-submit-btn')?.addEventListener('click', () => {
    const fields = {
      quickScore:   ratings['sleep-quality'] ? Math.round((ratings['sleep-quality'] / 5) * 10) : 6,
      sleepQuality: ratings['sleep-quality'],
      energyLevel:  ratings['energy-level'],
      fatigueLevel: ratings['fatigue-level'],
      soreness:     ratings['soreness'],
      mood:         ratings['mood'],
      stressLevel:  ratings['stress-level'],
      sleepHours:   parseFloat(document.getElementById('ci-sleep-hours')?.value) || 0,
      hydration:    parseFloat(document.getElementById('ci-hydration')?.value)   || 0,
      notes:        document.getElementById('ci-notes')?.value || '',
    };
    addCheckIn(fields, {
      piqSnapshot: {
        piq:       getPIQScore(),
        readiness: getReadinessScore(),
        streak:    getStreak(),
      }
    });
    showToast('✅ Detailed check-in saved!', 'success');
    navigate(route);
  });
});

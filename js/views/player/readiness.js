/**
 * Player — Readiness Check-In View
 * Daily wellness assessment feeding directly into PIQ Score.
 * Coach-aware: readiness scores are visible to your coaching staff.
 *
 * Science basis:
 *   Sleep weighting 0.30 — Halson SL, Sports Med 2014
 *   HRV / stress monitoring — Plews et al. 2013
 *   5-factor composite — Foster et al. 2001, IOC Consensus 2016
 */
import { buildSidebar }             from '../../components/nav.js';
import { getCurrentRole }           from '../../core/auth.js';
import { patchReadinessCheckIn,
         getReadinessCheckIn }      from '../../state/state.js';
import { getReadinessScore,
         getReadinessColor,
         getReadinessExplain,
         getScoreBreakdown }        from '../../state/selectors.js';

export function renderPlayerReadiness() {
  const role     = getCurrentRole() || 'player';
  const checkin  = getReadinessCheckIn();
  const score    = getReadinessScore();
  const color    = getReadinessColor(score);
  const explain  = getReadinessExplain(score);
  const sb       = getScoreBreakdown();
  const today    = new Date().toDateString();
  const hasCheckedIn = checkin.date === today && checkin.sleepQuality > 0;

  const tierLabel =
    score >= 85 ? 'Peak' :
    score >= 70 ? 'High' :
    score >= 55 ? 'Moderate' : 'Low';

  const intensityRec =
    score >= 85 ? 'Train at full prescribed intensity. Execute your planned session.' :
    score >= 70 ? 'Train at 85–90% intensity. Focus on technique and power.' :
    score >= 55 ? 'Reduce volume 15–20%. Prioritize movement quality over load.' :
    'Active recovery only. Pliability, mobility, and light movement. No heavy loading.';

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/readiness')}
  <main class="page-main">

    <div class="page-header">
      <h1>Readiness <span>Check-In</span></h1>
      <p>Daily wellness check — directly impacts your PIQ Score and today's training intensity</p>
    </div>

    ${hasCheckedIn ? `
    <div style="background:#22c95514;border:1px solid #22c95540;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <span style="font-size:24px">✅</span>
      <div>
        <div style="font-weight:700;font-size:13.5px;color:var(--piq-green)">Today's check-in complete</div>
        <div style="font-size:12px;color:var(--text-muted)">Readiness Score: <strong style="color:${color}">${score}</strong> · ${tierLabel} · ${intensityRec}</div>
      </div>
    </div>` : `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <span style="font-size:24px">⚡</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13.5px;color:#f59e0b">Check in now for an accurate readiness score</div>
        <div style="font-size:12px;color:var(--text-muted)">Takes 60 seconds. Updates your PIQ Score and coach's view of your readiness.</div>
      </div>
    </div>`}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

      <!-- ── CHECK-IN FORM ─────────────────────────────────────── -->
      <div class="panel">
        <div class="panel-title">Daily Check-In</div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 16px">
          Rate each factor honestly. Your coach can see your readiness score and overall trend — not your individual ratings.
        </div>

        ${_ratingField('sleep-quality', 'Sleep Quality', 'How well did you sleep?',
          ['Poor','Fair','OK','Good','Excellent'], checkin.sleepQuality)}
        ${_ratingField('energy-level', 'Energy Level', 'How energized do you feel right now?',
          ['Exhausted','Low','Moderate','High','Peak'], checkin.energyLevel)}
        ${_ratingField('soreness', 'Muscle Soreness', 'How sore are your muscles?',
          ['None','Mild','Moderate','Significant','Very Sore'], checkin.soreness)}
        ${_ratingField('mood', 'Mood / Motivation', 'How motivated are you to train?',
          ['Very Low','Low','Neutral','High','Fired Up'], checkin.mood)}
        ${_ratingField('stress-level', 'Stress Level', 'How stressed do you feel (school, life, etc.)?',
          ['None','Low','Moderate','High','Very High'], checkin.stressLevel)}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
          <div class="b-field">
            <label>Sleep Hours</label>
            <input type="number" id="checkin-sleep-hours" value="${checkin.sleepHours||''}"
              placeholder="e.g. 8" min="3" max="12" step="0.5">
          </div>
          <div class="b-field">
            <label>Hydration (oz)</label>
            <input type="number" id="checkin-hydration" value="${checkin.hydration||''}"
              placeholder="e.g. 80" min="0" max="200">
          </div>
        </div>
        <div class="b-field" style="margin-top:10px">
          <label>Notes (optional)</label>
          <input type="text" id="checkin-notes" value="${checkin.notes||''}"
            placeholder="e.g. tight left hamstring, slept late...">
        </div>

        <button class="btn-primary" style="width:100%;margin-top:16px" id="submit-checkin-btn">
          Submit Check-In
        </button>
        <p id="checkin-saved" style="color:var(--piq-green-dark);font-size:13px;margin-top:10px;display:none">
          Check-in saved. Your coach has been notified of your readiness status.
        </p>
      </div>

      <!-- ── READINESS PANEL ──────────────────────────────────── -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Your Readiness Score</div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:14px">
            <div style="width:76px;height:76px;border-radius:50%;border:5px solid ${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-weight:900;font-size:24px;color:${color}">${score}</span>
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text-primary)">${tierLabel} Readiness</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.55">${explain.replace(/^[^ ]+ /,'')}</div>
            </div>
          </div>
          <div style="margin-top:14px;padding:10px 14px;border-radius:8px;background:var(--surface-2)">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:4px">TODAY'S INTENSITY RECOMMENDATION</div>
            <div style="font-size:12.5px;color:var(--text-primary);line-height:1.5">${intensityRec}</div>
          </div>
        </div>

        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Coach Visibility</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px">
              <span style="color:var(--text-muted)">Readiness score</span>
              <span style="font-weight:700;color:${color}">${score} — ${tierLabel}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px">
              <span style="color:var(--text-muted)">PIQ Score</span>
              <span style="font-weight:700;color:var(--text-primary)">${sb.total}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px">
              <span style="color:var(--text-muted)">Check-in status</span>
              <span style="font-weight:700;color:${hasCheckedIn?'var(--piq-green)':'#f59e0b'}">${hasCheckedIn?'Complete':'Pending'}</span>
            </div>
            <div style="margin-top:6px;padding:10px;border-radius:8px;background:#3b82f611;border:1px solid #3b82f630;font-size:12px;color:var(--text-muted)">
              Your coach sees your readiness score and trend. Individual ratings (sleep, stress, soreness) are private to you.
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">Why This Matters</div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px">
            ${[
              ['Sleep (30%)', 'Largest single readiness driver. Targets 8–9h for competitive athletes (Halson 2014).'],
              ['Energy (25%)', 'Reflects CNS fatigue and recovery quality from prior sessions.'],
              ['Soreness (20%)', 'Indicates muscle damage load. High soreness = reduce eccentric work.'],
              ['Mood (15%)', 'Mental readiness directly affects skill execution and decision-making.'],
              ['Stress (10%)', 'Academic and life stress elevates cortisol, reducing adaptation capacity.'],
            ].map(([label, desc]) => `
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px">${label}</div>
              <div style="font-size:11.5px;color:var(--text-muted);line-height:1.5">${desc}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

  </main>
</div>`;
}

// ── RATING FIELD HELPER ──────────────────────────────────────────────────────
function _ratingField(id, label, sublabel, options, currentVal) {
  return `
<div style="margin-bottom:14px">
  <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px">${label}</div>
  <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${sublabel}</div>
  <div style="display:flex;gap:5px" id="${id}-group">
    ${options.map((opt, i) => {
      const sel = currentVal === (i + 1);
      return `<button type="button" class="rating-btn"
        data-field="${id}" data-val="${i+1}"
        style="flex:1;padding:7px 2px;border-radius:8px;border:1px solid ${sel?'var(--piq-green)':'var(--border)'};
               background:${sel?'var(--piq-green)':'var(--surface-2)'};
               color:${sel?'#0d1b3e':'var(--text-muted)'};
               font-size:10px;font-weight:${sel?'700':'500'};cursor:pointer;text-align:center;transition:all 150ms">
        <div style="font-size:13px;margin-bottom:2px">${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i]}</div>
        <div>${opt}</div>
      </button>`;
    }).join('')}
  </div>
</div>`;
}

// ── WIRE INTERACTIONS ────────────────────────────────────────────────────────
document.addEventListener('piq:viewRendered', () => {
  if (!document.getElementById('submit-checkin-btn')) return;

  const ratings = {
    'sleep-quality': 0, 'energy-level': 0,
    'soreness': 0, 'mood': 0, 'stress-level': 0,
  };

  // Pre-populate from existing checkin
  const existing = getReadinessCheckIn();
  if (existing.sleepQuality)  ratings['sleep-quality'] = existing.sleepQuality;
  if (existing.energyLevel)   ratings['energy-level']  = existing.energyLevel;
  if (existing.soreness)      ratings['soreness']       = existing.soreness;
  if (existing.mood)          ratings['mood']           = existing.mood;
  if (existing.stressLevel)   ratings['stress-level']   = existing.stressLevel;

  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const val   = parseInt(btn.dataset.val);
      ratings[field] = val;
      document.querySelectorAll(`[data-field="${field}"]`).forEach(b => {
        const sel = parseInt(b.dataset.val) === val;
        b.style.background  = sel ? 'var(--piq-green)' : 'var(--surface-2)';
        b.style.color       = sel ? '#0d1b3e' : 'var(--text-muted)';
        b.style.fontWeight  = sel ? '700' : '500';
        b.style.borderColor = sel ? 'var(--piq-green)' : 'var(--border)';
      });
    });
  });

  document.getElementById('submit-checkin-btn')?.addEventListener('click', () => {
    patchReadinessCheckIn({
      date:         new Date().toDateString(),
      sleepQuality: ratings['sleep-quality'],
      energyLevel:  ratings['energy-level'],
      soreness:     ratings['soreness'],
      mood:         ratings['mood'],
      stressLevel:  ratings['stress-level'],
      sleepHours:   parseFloat(document.getElementById('checkin-sleep-hours')?.value) || 0,
      hydration:    parseFloat(document.getElementById('checkin-hydration')?.value)   || 0,
      notes:        document.getElementById('checkin-notes')?.value || '',
    });
    const msg = document.getElementById('checkin-saved');
    const btn = document.getElementById('submit-checkin-btn');
    if (msg) msg.style.display = 'block';
    if (btn) { btn.textContent = 'Check-In Saved ✓'; btn.style.background = 'var(--piq-green)'; btn.disabled = true; }
  });
});

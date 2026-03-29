/**
 * Solo — Readiness Check-In View v2 (fixed)
 * Daily readiness assessment feeding directly into PIQ Score.
 *
 * FIX: Previously called getReadinessScoreElite() and assigned the
 * full object { score, raw, color, explain, … } to `score`, then
 * passed that object as a number argument to getReadinessColor(score)
 * which returned undefined, causing `.replace()` on undefined.
 *
 * Corrected: destructure the Elite object immediately so `score`,
 * `color`, and `explain` are always the correct primitive types.
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
import { getReadinessScoreElite }   from '../../state/selectorsElite.js';

export function renderSoloReadiness() {
  const role    = getCurrentRole() || 'solo';
  const checkin = getReadinessCheckIn();
  const today   = new Date().toDateString();
  const hasCheckedIn = checkin.date === today && checkin.sleepQuality > 0;

  // ── Correct extraction — always numbers/strings, never objects ──
  const scoreNum = getReadinessScore();          // plain number via selectors.js
  const color    = getReadinessColor(scoreNum);  // hex string
  const explain  = getReadinessExplain(scoreNum); // string

  // Elite object for richer display (ring offset, factors, trend)
  const elite    = getReadinessScoreElite();
  const offset   = elite.ringOffset ?? Math.round(((100 - scoreNum) / 100) * 289);
  const sb       = getScoreBreakdown();

  const tierLabel =
    scoreNum >= 85 ? 'Peak' :
    scoreNum >= 70 ? 'High' :
    scoreNum >= 55 ? 'Moderate' : 'Low';

  const intensityRec =
    scoreNum >= 85 ? 'Train at full prescribed intensity — your body is primed.' :
    scoreNum >= 70 ? 'Train at 85–90% intensity. Focus on technique and power.' :
    scoreNum >= 55 ? 'Reduce volume 15–20%. Prioritize movement quality over load.' :
    'Active recovery only. Pliability, mobility, light movement. No heavy loading.';

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo', 'solo/readiness')}
  <main class="page-main">

    <div class="page-header">
      <h1>Readiness <span>Check-In</span></h1>
      <p>Your daily readiness directly impacts your PIQ Score and today's recommended training intensity.</p>
    </div>

    ${hasCheckedIn ? `
    <div style="background:#22c95514;border:1px solid #22c95540;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <span style="font-size:24px">✅</span>
      <div>
        <div style="font-weight:700;font-size:13.5px;color:var(--piq-green)">Today's check-in complete</div>
        <div style="font-size:12px;color:var(--text-muted)">Readiness Score: <strong style="color:${color}">${scoreNum}</strong> · ${tierLabel} · ${intensityRec}</div>
      </div>
    </div>` : `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <span style="font-size:24px">⚡</span>
      <div>
        <div style="font-weight:700;font-size:13.5px;color:#f59e0b">Check in now for an accurate readiness score</div>
        <div style="font-size:12px;color:var(--text-muted)">Takes 60 seconds. Directly updates your PIQ Score and today's workout intensity.</div>
      </div>
    </div>`}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">

      <!-- ── CHECK-IN FORM ─────────────────────────────────────── -->
      <div class="panel">
        <div class="panel-title">Daily Check-In</div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 16px">
          Rate each factor honestly. This data is private and used only to optimize your training.
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
            <label>Sleep Hours Last Night</label>
            <input type="number" id="checkin-sleep-hours" value="${checkin.sleepHours||''}"
              placeholder="e.g. 8" min="3" max="12" step="0.5">
          </div>
          <div class="b-field">
            <label>Hydration Yesterday (oz)</label>
            <input type="number" id="checkin-hydration" value="${checkin.hydration||''}"
              placeholder="e.g. 80" min="0" max="200">
          </div>
        </div>
        <div class="b-field" style="margin-top:10px">
          <label>Notes (optional)</label>
          <input type="text" id="checkin-notes" value="${checkin.notes||''}"
            placeholder="e.g. legs sore from yesterday, slept late...">
        </div>

        <button class="btn-primary" style="width:100%;margin-top:16px" id="submit-checkin-btn">
          Submit Check-In
        </button>
        <p id="checkin-saved" style="color:var(--piq-green-dark);font-size:13px;margin-top:10px;display:none">
          Check-in saved! Your readiness score and workout intensity have been updated.
        </p>
      </div>

      <!-- ── SCORE + INFO PANELS ──────────────────────────────── -->
      <div>

        <!-- Current Score -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Current Readiness Score</div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:14px">
            <div style="position:relative;flex-shrink:0">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" stroke-width="7"/>
                <circle cx="40" cy="40" r="32" fill="none" stroke="${color}" stroke-width="7"
                  stroke-dasharray="201" stroke-dashoffset="${Math.round(((100-scoreNum)/100)*201)}"
                  stroke-linecap="round" transform="rotate(-90 40 40)"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                <span style="font-weight:900;font-size:18px;color:${color}">${scoreNum}</span>
              </div>
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text-primary)">${tierLabel} Readiness</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.55">${explain.replace(/^[^ ]+ /,'')}</div>
            </div>
          </div>
          <div style="margin-top:12px;padding:10px 14px;border-radius:8px;background:var(--surface-2)">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:4px">TODAY'S RECOMMENDATION</div>
            <div style="font-size:12.5px;color:var(--text-primary);line-height:1.5">${intensityRec}</div>
          </div>
        </div>

        <!-- Readiness Formula -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Readiness Formula</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin:6px 0 12px">
            Your readiness score is calculated from today's check-in:
          </div>
          ${[
            ['Sleep Quality',     '30%', 'Most important recovery factor (Halson 2014)'],
            ['Energy Level',      '25%', 'Reflects CNS recovery and glycogen status'],
            ['Muscle Soreness',   '20%', 'Inverted: less sore = higher score'],
            ['Mood / Motivation', '15%', 'Mental readiness affects physical output'],
            ['Stress Level',      '10%', 'Inverted: lower stress = higher score'],
          ].map(([label, weight, note]) => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
            <div style="min-width:38px;text-align:center;padding:3px 5px;border-radius:6px;background:var(--piq-green)20;
                        color:var(--piq-green);font-size:11px;font-weight:700;flex-shrink:0">${weight}</div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">${label}</div>
              <div style="font-size:11px;color:var(--text-muted)">${note}</div>
            </div>
          </div>`).join('')}
        </div>

        <!-- Recovery Science -->
        <div class="panel">
          <div class="panel-title">Recovery Science</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-top:8px">
            <p style="margin:0 0 8px"><strong style="color:var(--text-primary)">Sleep:</strong>
              8–10 hours is optimal for adolescent athletes. Sleep deprivation reduces reaction time,
              decision-making, and injury resilience (Walker 2017; AASM guidelines).</p>
            <p style="margin:0 0 8px"><strong style="color:var(--text-primary)">HRV Principle:</strong>
              Heart rate variability is the gold standard for readiness monitoring. Daily check-ins
              approximate this without a wearable device (Plews et al. 2013).</p>
            <p style="margin:0"><strong style="color:var(--text-primary)">TB12 Method:</strong>
              "Recovery is the most underrated part of training. You can't perform at your best
              if your body hasn't recovered from the last session."</p>
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
        style="flex:1;padding:7px 2px;border-radius:8px;
               border:1px solid ${sel?'var(--piq-green)':'var(--border)'};
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

  // Pre-populate from existing check-in
  const existing = getReadinessCheckIn();
  if (existing.sleepQuality) ratings['sleep-quality'] = existing.sleepQuality;
  if (existing.energyLevel)  ratings['energy-level']  = existing.energyLevel;
  if (existing.soreness)     ratings['soreness']       = existing.soreness;
  if (existing.mood)         ratings['mood']           = existing.mood;
  if (existing.stressLevel)  ratings['stress-level']   = existing.stressLevel;

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

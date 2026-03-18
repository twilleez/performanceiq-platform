/**
 * Player — Readiness Check-In View v2
 * Daily readiness assessment feeding directly into PIQ Score.
 * Based on HRV research, sleep science, and athlete monitoring best practices.
 */
import { buildSidebar }          from '../../components/nav.js';
import { getCurrentRole }        from '../../core/auth.js';
import { patchReadinessCheckIn, getReadinessCheckIn } from '../../state/state.js';
import { getReadinessScore, getReadinessColor, getScoreBreakdown } from '../../state/selectors.js';

export function renderPlayerReadiness() {
  const role    = getCurrentRole() || 'player';
  const checkin = getReadinessCheckIn();
  const score   = getReadinessScore();
  const color   = getReadinessColor(score);
  const today   = new Date().toDateString();
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
      <div>
        <div style="font-weight:700;font-size:13.5px;color:var(--piq-green)">Today's check-in complete</div>
        <div style="font-size:12px;color:var(--text-muted)">Readiness Score: <strong style="color:${color}">${score}</strong> — Your training intensity has been adjusted accordingly.</div>
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

      <!-- Check-In Form -->
      <div class="panel">
        <div class="panel-title">Daily Check-In</div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 16px">Rate each factor honestly. This data is private and used only to optimize your training.</div>

        ${_ratingField('sleep-quality', 'Sleep Quality', 'How well did you sleep?', ['Poor','Fair','OK','Good','Excellent'], checkin.sleepQuality)}
        ${_ratingField('energy-level', 'Energy Level', 'How energized do you feel right now?', ['Exhausted','Low','Moderate','High','Peak'], checkin.energyLevel)}
        ${_ratingField('soreness', 'Muscle Soreness', 'How sore are your muscles?', ['None','Mild','Moderate','Significant','Very Sore'], checkin.soreness)}
        ${_ratingField('mood', 'Mood / Motivation', 'How motivated are you to train?', ['Very Low','Low','Neutral','High','Fired Up'], checkin.mood)}
        ${_ratingField('stress-level', 'Stress Level', 'How stressed do you feel (school, life, etc.)?', ['None','Low','Moderate','High','Very High'], checkin.stressLevel)}

        <div class="b-field" style="margin-top:14px">
          <label>Sleep Hours Last Night</label>
          <input type="number" id="checkin-sleep-hours" value="${checkin.sleepHours || ''}" placeholder="e.g. 8" min="3" max="12" step="0.5">
        </div>
        <div class="b-field" style="margin-top:10px">
          <label>Hydration Yesterday (oz)</label>
          <input type="number" id="checkin-hydration" value="${checkin.hydration || ''}" placeholder="e.g. 80" min="0" max="200">
        </div>
        <div class="b-field" style="margin-top:10px">
          <label>Notes (optional)</label>
          <input type="text" id="checkin-notes" value="${checkin.notes || ''}" placeholder="e.g. legs sore from yesterday, slept late...">
        </div>

        <button class="btn-primary" style="width:100%;margin-top:16px" id="submit-checkin-btn">
          Submit Check-In
        </button>
        <p id="checkin-saved" style="color:var(--piq-green-dark);font-size:13px;margin-top:10px;display:none">
          Check-in saved! Your readiness score and workout intensity have been updated.
        </p>
      </div>

      <!-- Score Breakdown -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Current Readiness Score</div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:12px">
            <div style="width:72px;height:72px;border-radius:50%;border:4px solid ${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-weight:900;font-size:22px;color:${color}">${score}</span>
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text-primary)">${score>=85?'Peak Readiness':score>=70?'High Readiness':score>=55?'Moderate Readiness':'Low Readiness'}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5">${score>=85?'Train at full intensity. Your body is fully primed.':score>=70?'Train hard. Minor adjustments may help.':score>=55?'Reduce volume 15-20%. Focus on quality.':'Recovery day recommended. Prioritize pliability.'}</div>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Readiness Formula</div>
          <div style="font-size:12px;color:var(--text-muted);margin:6px 0 12px">Your readiness score is calculated from today's check-in data:</div>
          ${[
            ['Sleep Quality', '30%', 'Most important recovery factor (Walker, 2017)'],
            ['Energy Level', '25%', 'Reflects CNS recovery and glycogen status'],
            ['Muscle Soreness', '20%', 'Inverted: less sore = higher score'],
            ['Mood / Motivation', '15%', 'Mental readiness affects physical output'],
            ['Stress Level', '10%', 'Inverted: lower stress = higher score'],
          ].map(([label, weight, note]) => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="width:44px;text-align:center;padding:3px 6px;border-radius:8px;background:var(--piq-green)20;color:var(--piq-green);font-size:11px;font-weight:700;flex-shrink:0">${weight}</div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">${label}</div>
              <div style="font-size:11px;color:var(--text-muted)">${note}</div>
            </div>
          </div>`).join('')}
        </div>

        <div class="panel">
          <div class="panel-title">Recovery Science</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:8px">
            <p style="margin:0 0 8px"><strong>Sleep:</strong> 8-10 hours is optimal for adolescent athletes. Sleep deprivation reduces reaction time, decision-making, and injury resilience (Walker, 2017; AASM guidelines).</p>
            <p style="margin:0 0 8px"><strong>HRV Principle:</strong> Heart rate variability is the gold standard for readiness monitoring. Daily check-ins approximate this without a wearable device.</p>
            <p style="margin:0"><strong>TB12:</strong> "Recovery is the most underrated part of training. You can't perform at your best if your body hasn't recovered from the last session."</p>
          </div>
        </div>
      </div>

    </div>
  </main>
</div>`;
}

function _ratingField(id, label, sublabel, options, currentVal) {
  return `
<div style="margin-bottom:14px">
  <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px">${label}</div>
  <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${sublabel}</div>
  <div style="display:flex;gap:6px" id="${id}-group">
    ${options.map((opt, i) => `
    <button type="button" class="rating-btn ${currentVal === (i+1) ? 'sel' : ''}"
      data-field="${id}" data-val="${i+1}"
      style="flex:1;padding:7px 4px;border-radius:8px;border:1px solid var(--border);background:${currentVal===(i+1)?'var(--piq-green)':'var(--surface-2)'};color:${currentVal===(i+1)?'#0d1b3e':'var(--text-muted)'};font-size:10px;font-weight:${currentVal===(i+1)?'700':'500'};cursor:pointer;transition:all 150ms;text-align:center">
      <div style="font-size:14px;margin-bottom:2px">${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i]}</div>
      <div>${opt}</div>
    </button>`).join('')}
  </div>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  if (!document.getElementById('submit-checkin-btn')) return;

  const ratings = { 'sleep-quality': 0, 'energy-level': 0, 'soreness': 0, 'mood': 0, 'stress-level': 0 };

  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const val   = parseInt(btn.dataset.val);
      ratings[field] = val;
      document.querySelectorAll(`[data-field="${field}"]`).forEach(b => {
        const isSelected = parseInt(b.dataset.val) === val;
        b.style.background = isSelected ? 'var(--piq-green)' : 'var(--surface-2)';
        b.style.color       = isSelected ? '#0d1b3e' : 'var(--text-muted)';
        b.style.fontWeight  = isSelected ? '700' : '500';
        b.style.borderColor = isSelected ? 'var(--piq-green)' : 'var(--border)';
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
      hydration:    parseFloat(document.getElementById('checkin-hydration')?.value) || 0,
      notes:        document.getElementById('checkin-notes')?.value || '',
    });
    const msg = document.getElementById('checkin-saved');
    if (msg) { msg.style.display = 'block'; }
    const btn = document.getElementById('submit-checkin-btn');
    if (btn) { btn.textContent = 'Check-In Saved'; btn.style.background = 'var(--piq-green)'; }
  });
});

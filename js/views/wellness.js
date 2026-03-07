// js/views/wellness.js — Daily wellness log view

import { state } from '../state/state.js';
import { computeReadiness } from '../engine/readinessEngine.js';

export function renderWellness() {
  const w = state.wellness;

  return `
    <div class="page-header">
      <h1 class="page-title">Wellness Log</h1>
      <p class="page-subtitle">How are you feeling today? Your answers shape today's training plan.</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start;">
      <!-- Log Form -->
      <div class="card card-xl">
        <p class="section-label" style="margin-bottom:20px;">Friday, March 6</p>

        <!-- Sleep -->
        <div class="wellness-item" style="margin-bottom:24px;">
          <div class="wellness-row">
            <span class="wellness-label">🌙 Sleep Duration</span>
            <span class="wellness-val" id="val-sleep">${w.sleep_hours}h</span>
          </div>
          <input type="range" min="4" max="10" step="0.5" value="${w.sleep_hours}" id="slider-sleep" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);">
            <span>4h</span><span>6h</span><span>8h</span><span>10h</span>
          </div>
          <div id="why-sleep" class="alert alert-info" style="margin-top:8px;font-size:12px;">${getSleepWhy(w.sleep_hours)}</div>
        </div>

        <!-- Soreness -->
        <div class="wellness-item" style="margin-bottom:24px;">
          <div class="wellness-row">
            <span class="wellness-label">💪 Muscle Soreness</span>
            <span class="wellness-val" id="val-soreness">${w.soreness}</span>
          </div>
          <input type="range" min="1" max="10" step="1" value="${w.soreness}" id="slider-soreness" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);">
            <span>1 Fresh</span><span style="flex:1"></span><span>10 Severe</span>
          </div>
          <div id="why-soreness" class="alert ${w.soreness > 6 ? 'alert-danger' : w.soreness > 4 ? 'alert-warning' : 'alert-success'}" style="margin-top:8px;font-size:12px;">${getSorenessWhy(w.soreness)}</div>
        </div>

        <!-- Stress -->
        <div class="wellness-item" style="margin-bottom:24px;">
          <div class="wellness-row">
            <span class="wellness-label">🧠 Mental Stress</span>
            <span class="wellness-val" id="val-stress">${w.stress}</span>
          </div>
          <input type="range" min="1" max="10" step="1" value="${w.stress}" id="slider-stress" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);">
            <span>1 Relaxed</span><span style="flex:1"></span><span>10 Maxed</span>
          </div>
          <div id="why-stress" class="alert ${w.stress > 6 ? 'alert-danger' : w.stress > 4 ? 'alert-warning' : 'alert-success'}" style="margin-top:8px;font-size:12px;">${getStressWhy(w.stress)}</div>
        </div>

        <!-- Energy -->
        <div class="wellness-item" style="margin-bottom:24px;">
          <div class="wellness-row">
            <span class="wellness-label">⚡ Energy Level</span>
            <span class="wellness-val" id="val-energy">${w.energy}</span>
          </div>
          <input type="range" min="1" max="10" step="1" value="${w.energy}" id="slider-energy" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);">
            <span>1 Drained</span><span style="flex:1"></span><span>10 Energized</span>
          </div>
        </div>

        <!-- Mood -->
        <div class="wellness-item" style="margin-bottom:32px;">
          <div class="wellness-row">
            <span class="wellness-label">😊 Mood / Motivation</span>
            <span class="wellness-val" id="val-mood">${w.mood}</span>
          </div>
          <input type="range" min="1" max="10" step="1" value="${w.mood}" id="slider-mood" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);">
            <span>1 Low</span><span style="flex:1"></span><span>10 Motivated</span>
          </div>
        </div>

        <button class="btn btn-primary" id="save-wellness" style="width:100%;justify-content:center;">
          Save Wellness Log
        </button>
        <div id="save-confirm" style="display:none;" class="alert alert-success" style="margin-top:12px;">
          ✓ Wellness logged. Your session has been updated.
        </div>
      </div>

      <!-- Live Preview -->
      <div style="position:sticky;top:24px;">
        <div class="card" id="readiness-preview">
          ${renderReadinessPreview(w)}
        </div>
        <div class="card" style="margin-top:16px;">
          <p class="section-label" style="margin-bottom:12px;">Why This Matters</p>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">
            <p style="margin-bottom:8px;">Your wellness log directly controls today's training intensity. High soreness or poor sleep shifts your session to a recovery focus — protecting you from injury and overtraining.</p>
            <p>The algorithm uses your inputs to compute a <strong style="color:var(--text-primary)">Readiness Score</strong> that modifies load, reps, and session type automatically.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderReadinessPreview(w) {
  const r = computeReadiness(w);
  const levels = { green: 'var(--green)', yellow: 'var(--yellow)', orange: 'var(--orange)', red: 'var(--red)' };
  const levelMap = { green: 'GO', yellow: 'MODERATE', orange: 'CAUTION', red: 'RECOVER' };
  const levelEmoji = { green: '⚡', yellow: '⚠️', orange: '🔶', red: '🛑' };

  const rl = r.score >= 80 ? 'green' : r.score >= 65 ? 'yellow' : r.score >= 50 ? 'orange' : 'red';

  return `
    <p class="section-label" style="margin-bottom:12px;">Live Readiness Preview</p>
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-family:var(--font-display);font-weight:900;font-size:64px;line-height:1;color:${levels[rl]};" id="preview-score">${r.score}</div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:${levels[rl]};margin-top:4px;">${levelEmoji[rl]} ${levelMap[rl]}</div>
    </div>
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:12px;" id="preview-why">${r.why}</div>
    <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:10px 12px;">
      <p style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Recommendation</p>
      <p style="font-size:13px;color:var(--text-secondary);" id="preview-rec">${r.recommendation}</p>
    </div>
  `;
}

export function afterRenderWellness() {
  const sliders = [
    { id: 'slider-sleep',    val: 'val-sleep',    key: 'sleep_hours', format: v => `${v}h`, why: getSleepWhy,    whyId: 'why-sleep' },
    { id: 'slider-soreness', val: 'val-soreness', key: 'soreness',    format: v => v,       why: getSorenessWhy, whyId: 'why-soreness' },
    { id: 'slider-stress',   val: 'val-stress',   key: 'stress',      format: v => v,       why: getStressWhy,  whyId: 'why-stress' },
    { id: 'slider-energy',   val: 'val-energy',   key: 'energy',      format: v => v,       why: null,          whyId: null },
    { id: 'slider-mood',     val: 'val-mood',     key: 'mood',        format: v => v,       why: null,          whyId: null },
  ];

  sliders.forEach(({ id, val, key, format, why, whyId }) => {
    const slider = document.getElementById(id);
    if (!slider) return;
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      document.getElementById(val).textContent = format(value);
      state.wellness[key] = value;

      // Update why copy
      if (why && whyId) {
        const el = document.getElementById(whyId);
        if (el) el.textContent = why(value);
      }

      // Update live preview
      const preview = document.getElementById('readiness-preview');
      if (preview) preview.innerHTML = renderReadinessPreview(state.wellness);
    });
  });

  document.getElementById('save-wellness')?.addEventListener('click', () => {
    state.wellness.logged = true;
    const confirm = document.getElementById('save-confirm');
    if (confirm) {
      confirm.style.display = 'block';
      setTimeout(() => { confirm.style.display = 'none'; }, 3000);
    }
  });
}

function getSleepWhy(hours) {
  if (hours >= 8.5) return '💚 Excellent recovery sleep. Your CNS is well-rested.';
  if (hours >= 7.5) return '✅ Good sleep quality. Minor fatigue is unlikely.';
  if (hours >= 6.5) return '⚠️ Slightly under target. Expect a small readiness penalty.';
  if (hours >= 5.5) return '🔶 Sub-optimal sleep. Load will be reduced today.';
  return '🛑 Significant sleep deficit. Recovery session strongly recommended.';
}

function getSorenessWhy(soreness) {
  if (soreness <= 2) return '💚 Muscles feel fresh — ready for a high-intensity session.';
  if (soreness <= 4) return '✅ Normal DOMS. This is within the healthy training range.';
  if (soreness <= 6) return '⚠️ Elevated soreness. Reduce heavy loading and avoid failure sets.';
  if (soreness <= 8) return '🔶 High soreness — muscles need more recovery time. Active recovery only.';
  return '🛑 Severe soreness detected. No training recommended today.';
}

function getStressWhy(stress) {
  if (stress <= 2) return '💚 Low stress — your nervous system is ready to perform.';
  if (stress <= 4) return '✅ Manageable stress load. Normal training is fine.';
  if (stress <= 6) return '⚠️ Moderate stress will blunt training adaptations. Scale back if needed.';
  if (stress <= 8) return '🔶 High stress elevates cortisol, reducing recovery. Lighter session today.';
  return '🛑 Extreme stress load. Training under this state increases injury risk significantly.';
}

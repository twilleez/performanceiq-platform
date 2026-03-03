// /js/views/wellness.js
// FIX: wellnessMount was looked up with $('wellnessMount') but the element didn't exist
//      in the original HTML. Now it exists in the updated index.html.
// FIX: bindWellnessEvents was binding btnSaveWellness which also didn't exist — now it does.
// IMPROVEMENT: Live PIQ preview updates as sliders move.
// IMPROVEMENT: Added date display for most-recent entry.

import { STATE, ATHLETES, saveAthletes } from '../state/state.js';
import { toast } from '../services/toast.js';
import { computePIQ } from '../features/piqScore.js';
import { computeAthleteScoreV1 } from '../features/scoring.js';

function todayKey() { return new Date().toISOString().slice(0, 10); }

function ensureScoreSnapshotForToday(athlete) {
  athlete.history = athlete.history || {};
  athlete.history.score = Array.isArray(athlete.history.score) ? athlete.history.score : [];

  const dk = todayKey();
  if (athlete.history.score.some(s => s?.date === dk)) return;

  const breakdown = computeAthleteScoreV1(athlete, { state: STATE });
  athlete.history.score.push({
    date:          dk,
    total:         breakdown.total,
    subscores:     breakdown.subscores,
    injuryPenalty: breakdown.injuryPenalty,
    created_at:    new Date().toISOString(),
  });
}

function sliderRow(label, id, def, helpText = '') {
  return `
    <div class="form-row">
      <label class="label" for="${id}">
        ${label}
        <span class="val" id="${id}Val">${def}</span>/10
        ${helpText ? `<span class="small-muted" style="font-weight:400;margin-left:4px">${helpText}</span>` : ''}
      </label>
      <input type="range" min="0" max="10" step="1" value="${def}" id="${id}" aria-label="${label}" style="width:100%" />
    </div>
  `;
}

function getFormData(root) {
  const num = id => Number(root.querySelector('#' + id)?.value || 0);
  return {
    athleteId: String(root.querySelector('#wellAthlete')?.value || ''),
    sleep:     num('wellSleep'),
    soreness:  num('wellSoreness'),
    stress:    num('wellStress'),
    mood:      num('wellMood'),
    readiness: num('wellReady'),
  };
}

export function renderWellness() {
  const host = document.getElementById('wellnessMount');
  const sub  = document.getElementById('wellnessSub');

  if (sub) sub.textContent = 'Log daily wellness to drive PIQ and risk insights.';
  if (!host) return;

  host.innerHTML = '';

  if (!ATHLETES.length) {
    host.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">No athletes</div>
        <div class="empty-sub">Add athletes first (Onboarding or Import).</div>
      </div>`;
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'form-card';
  wrap.innerHTML = `
    <div class="form-row">
      <label class="label" for="wellAthlete">Athlete</label>
      <select class="select" id="wellAthlete" aria-label="Select athlete"></select>
    </div>

    ${sliderRow('Sleep quality',  'wellSleep',    8, '(higher = better)')}
    ${sliderRow('Soreness',       'wellSoreness', 3, '(higher = more sore)')}
    ${sliderRow('Stress',         'wellStress',   3, '(higher = more stressed)')}
    ${sliderRow('Mood',           'wellMood',     7, '(higher = better)')}
    ${sliderRow('Readiness',      'wellReady',    7, '(higher = more ready)')}

    <div style="margin-top:12px;padding:12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
      <div class="stat-label" style="margin-bottom:4px">PIQ Preview</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div id="wellPIQNum" style="font-family:var(--font-display);font-size:32px;font-weight:900;color:var(--accent)">—</div>
        <div id="wellPIQBar" style="flex:1;height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden">
          <div id="wellPIQFill" style="height:100%;border-radius:3px;background:var(--accent);width:0%;transition:width .3s"></div>
        </div>
        <div id="wellPIQLabel" style="font-size:12px;color:var(--muted);min-width:60px;text-align:right">—</div>
      </div>
    </div>

    <!-- Recent entries for selected athlete -->
    <div id="wellHistory" style="margin-top:14px"></div>
  `;
  host.appendChild(wrap);

  const sel = wrap.querySelector('#wellAthlete');
  ATHLETES.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.name;
    sel.appendChild(opt);
  });

  function bindSliderLabel(id) {
    const r = wrap.querySelector('#' + id);
    const v = wrap.querySelector('#' + id + 'Val');
    if (!r || !v) return;
    const sync = () => { v.textContent = r.value; };
    r.addEventListener('input', sync);
    sync();
  }
  ['wellSleep', 'wellSoreness', 'wellStress', 'wellMood', 'wellReady'].forEach(bindSliderLabel);

  function updatePreview() {
    const data = getFormData(wrap);
    const piq  = computePIQ(data);
    const numEl   = wrap.querySelector('#wellPIQNum');
    const fillEl  = wrap.querySelector('#wellPIQFill');
    const labelEl = wrap.querySelector('#wellPIQLabel');
    if (numEl)   numEl.textContent   = piq.score;
    if (fillEl)  fillEl.style.width  = piq.score + '%';
    if (labelEl) labelEl.textContent = piq.score >= 80 ? '🟢 Ready' : piq.score >= 55 ? '🟡 Monitor' : '🔴 At Risk';
  }

  function renderHistory() {
    const histEl = wrap.querySelector('#wellHistory');
    if (!histEl) return;
    const id = wrap.querySelector('#wellAthlete')?.value;
    const a  = ATHLETES.find(x => x.id === id);
    const entries = (a?.history?.wellness || []).slice(-5).reverse();
    if (!entries.length) { histEl.innerHTML = ''; return; }

    histEl.innerHTML = `
      <div class="stat-label" style="margin-bottom:8px">Recent Entries</div>
      ${entries.map(e => `
        <div style="display:flex;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.06);font-size:12px;color:var(--muted)">
          <span style="min-width:80px">${e.date || '—'}</span>
          <span>Sleep ${e.sleep}/10</span>
          <span>Sore ${e.soreness}/10</span>
          <span>Stress ${e.stress}/10</span>
          <span>Mood ${e.mood}/10</span>
          <span>Ready ${e.readiness}/10</span>
        </div>
      `).join('')}
    `;
  }

  wrap.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', updatePreview));
  sel.addEventListener('change', renderHistory);

  updatePreview();
  renderHistory();
}

let __wellnessBound = false;

export function bindWellnessEvents() {
  if (__wellnessBound) return;
  __wellnessBound = true;

  document.getElementById('btnSaveWellness')?.addEventListener('click', () => {
    const root = document.getElementById('wellnessMount');
    if (!root) return;

    const wrap = root.querySelector('.form-card') || root;
    const data = getFormData(wrap);

    if (!data.athleteId) { toast('Select an athlete'); return; }

    const a = ATHLETES.find(x => x.id === data.athleteId);
    if (!a) { toast('Athlete not found'); return; }

    a.history = a.history || {};
    a.history.wellness = Array.isArray(a.history.wellness) ? a.history.wellness : [];
    a.history.wellness.push({
      date:      todayKey(),
      sleep:     data.sleep,
      soreness:  data.soreness,
      stress:    data.stress,
      mood:      data.mood,
      readiness: data.readiness,
      created_at: new Date().toISOString(),
    });

    ensureScoreSnapshotForToday(a);
    saveAthletes();

    const piq  = computePIQ(data).score;
    const perf = computeAthleteScoreV1(a, { state: STATE }).total;

    toast(`Wellness saved ✓  PIQ ${piq} · PerformanceIQ ${perf}`);

    // Re-render to show updated history
    renderWellness();
  });
}

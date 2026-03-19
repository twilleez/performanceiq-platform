/**
 * parent/home.js — Phase 15C
 * Fix 05: Readiness banner with action copy
 * Phase 3 preview: "Is my athlete ready today?" single answer
 */
import { state }           from '../../state/state.js';
import { router }          from '../../core/router.js';
import { getReadinessCopy } from '../../components/readiness-copy.js';
import { ROUTES }          from '../../app.js';

export function renderParentHome(container) {
  const s          = state.getAll();
  const wellness   = s.wellness || [];
  const lastW      = wellness[wellness.length - 1] || {};

  // Derive level from athlete's wellness
  const levelScore = (
    ((lastW.sleep    || 5) / 10) +
    (1 - (lastW.soreness || 5) / 10) +
    (1 - (lastW.stress   || 5) / 10)
  ) / 3;

  const level = levelScore >= 0.72 ? 'high' : levelScore >= 0.45 ? 'moderate' : 'low';
  const copy  = getReadinessCopy(level);

  const VERDICT = {
    high:     { text: 'READY TO PLAY',        color: '#00E599', bg: 'rgba(0,229,153,0.08)', border: 'rgba(0,229,153,0.2)' },
    moderate: { text: 'LIGHT LOAD DAY',       color: '#FFD166', bg: 'rgba(255,209,102,0.08)', border: 'rgba(255,209,102,0.2)' },
    low:      { text: 'REST RECOMMENDED',     color: '#FF4757', bg: 'rgba(255,71,87,0.08)',  border: 'rgba(255,71,87,0.2)' },
  };
  const verdict = VERDICT[level] || VERDICT.moderate;

  // Athlete name fallback
  const athleteName = s.athleteName || 'Your Athlete';

  container.innerHTML = `
    <div class="view-screen parent-home">

      <div class="view-header">
        <div class="view-title">PARENT PORTAL</div>
        <div class="view-subtitle">Monitoring ${athleteName}</div>
      </div>

      <!-- Phase 3: Single "ready today?" verdict -->
      <div class="parent-verdict-card" style="
        background: ${verdict.bg};
        border: 1px solid ${verdict.border};
        border-radius: 16px;
        padding: 28px 24px;
        text-align: center;
        margin-bottom: 20px;
      ">
        <div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;
             letter-spacing:0.1em;font-family:'Barlow Condensed',sans-serif;margin-bottom:12px;">
          TODAY'S READINESS
        </div>
        <div style="font-family:'Oswald',sans-serif;font-size:30px;font-weight:700;
             color:${verdict.color};letter-spacing:0.04em;margin-bottom:12px;">
          ${copy.emoji} ${verdict.text}
        </div>
        <p style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.55;max-width:280px;margin:0 auto;">
          ${_parentReason(lastW, level)}
        </p>
        <!-- Fix 05: action copy appended by applyReadinessCopy() -->
      </div>

      <!-- Readiness banner (for Fix 05 hook) -->
      <div class="readiness-banner card" style="display:none"
           data-readiness-level="${level}"></div>

      <!-- Wellness snapshot -->
      <div class="section-label" style="margin-bottom:12px;">WELLNESS SNAPSHOT</div>
      <div class="wellness-snapshot-grid card">
        ${_wellnessTile('😴', 'Sleep',    lastW.sleep    || '—', 10, '#00D4FF')}
        ${_wellnessTile('💪', 'Soreness', lastW.soreness || '—', 10, '#FF6B35', true)}
        ${_wellnessTile('🧠', 'Stress',   lastW.stress   || '—', 10, '#FFD166', true)}
        ${_wellnessTile('⚡', 'Fatigue',  lastW.fatigue  || '—', 10, '#FF4757', true)}
      </div>

      ${!wellness.length ? `
        <div class="info-banner" style="margin-top:16px;padding:14px 16px;background:rgba(0,212,255,0.06);
             border:1px solid rgba(0,212,255,0.15);border-radius:10px;font-size:12.5px;
             color:rgba(255,255,255,0.5);line-height:1.5;">
          ℹ️ No wellness data yet. Ask ${athleteName} to log their daily check-in for real-time readiness tracking.
        </div>
      ` : ''}

    </div>
  `;

  // Fix 05 — applyReadinessCopy() is called by app.js after render
  // The hidden .readiness-banner element with data-readiness-level provides the hook
}

function _wellnessTile(icon, label, val, max, color, invert = false) {
  const numVal = typeof val === 'number' ? val : 5;
  const barPct = invert ? (1 - numVal / max) * 100 : (numVal / max) * 100;
  return `
    <div class="wellness-tile">
      <div class="wt-icon">${icon}</div>
      <div class="wt-label">${label}</div>
      <div class="wt-val" style="color:${color}">${val}</div>
      <div class="wt-bar-bg">
        <div class="wt-bar-fill" style="width:${barPct.toFixed(0)}%;background:${color}"></div>
      </div>
    </div>
  `;
}

function _parentReason(w, level) {
  if (!w || !Object.keys(w).length) {
    return 'Wellness data not logged yet today. The verdict will update once your athlete checks in.';
  }
  if (level === 'high') {
    return `Sleep was good (${w.sleep}/10), soreness is low (${w.soreness}/10), and stress levels are manageable. A full training session is appropriate today.`;
  }
  if (level === 'moderate') {
    return `Some fatigue or soreness has been logged today. A lighter session or active recovery is recommended to avoid overload.`;
  }
  return `Recovery indicators are low today — sleep quality or stress may be affecting readiness. Rest or gentle movement is the right call.`;
}

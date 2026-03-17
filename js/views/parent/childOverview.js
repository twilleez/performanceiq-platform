/**
 * Parent Child View — detailed athlete profile for parent
 */
import { buildSidebar }   from '../../components/nav.js';
import { getRoster }      from '../../state/state.js';
import { getScoreBreakdown } from '../../state/selectors.js';

export function renderParentChild() {
  const roster   = getRoster();
  const athlete  = roster[0] || { name: 'Jake Williams', readiness: 82, piq: 79, streak: 5, sport: 'basketball', position: 'SG' };
  const breakdown = getScoreBreakdown();
  const readinessColor = athlete.readiness>=80?'#22c955':athlete.readiness<60?'#ef4444':'#f59e0b';

  const componentRows = [
    { label: 'Training Consistency', key: 'consistency', icon: '🔥' },
    { label: 'Readiness Index',      key: 'readiness',   icon: '💚' },
    { label: 'Workout Compliance',   key: 'compliance',  icon: '✅' },
    { label: 'Load Management',      key: 'load',        icon: '⚖️' },
  ].map(c => {
    const comp = breakdown[c.key];
    return `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12.5px;color:var(--text-primary)">${c.icon} ${c.label}</span>
        <span style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${comp.raw}</span>
      </div>
      <div style="height:7px;background:var(--surface-2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${comp.raw}%;background:var(--piq-green);border-radius:4px"></div>
      </div>
    </div>`;
  }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/child')}
  <main class="page-main">
    <div class="page-header">
      <h1>${athlete.name}</h1>
      <p>${athlete.position||'—'} · ${athlete.sport||'—'} · Athlete Profile</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Readiness</div><div class="kpi-val" style="color:${readinessColor}">${athlete.readiness}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${athlete.piq}</div><div class="kpi-chg">${breakdown.tier}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${athlete.streak}d</div><div class="kpi-chg">Active days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Status</div><div class="kpi-val" style="font-size:14px">${athlete.readiness>=80?'✅ Ready':athlete.readiness<60?'⚠️ Caution':'→ Moderate'}</div><div class="kpi-chg">Today</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">PIQ Score Breakdown</div>
        <div style="margin-top:12px">${componentRows}</div>
        <div style="margin-top:12px;padding:12px;background:var(--surface-2);border-radius:10px;font-size:12px;color:var(--text-muted)">
          The PIQ Score is a composite of training consistency, readiness, compliance, and load management. Higher scores indicate better overall training quality.
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">What This Means for Your Athlete</div>
        <div style="margin-top:12px">
          ${athlete.readiness>=80
            ? `<div style="padding:12px;background:#22c95522;border-radius:10px;margin-bottom:10px;font-size:13px;color:var(--text-primary)">✅ <strong>Ready to train hard.</strong> ${athlete.name} is showing strong readiness today — good sleep, balanced load, and consistent training.</div>`
            : athlete.readiness<60
            ? `<div style="padding:12px;background:#ef444422;border-radius:10px;margin-bottom:10px;font-size:13px;color:var(--text-primary)">⚠️ <strong>Recovery recommended.</strong> ${athlete.name}'s readiness is low. Encourage rest, hydration, and a lighter session today.</div>`
            : `<div style="padding:12px;background:#f59e0b22;border-radius:10px;margin-bottom:10px;font-size:13px;color:var(--text-primary)">→ <strong>Moderate readiness.</strong> ${athlete.name} can train but should avoid maximum intensity efforts today.</div>`}
          <div style="font-size:12.5px;color:var(--text-muted);line-height:1.7">
            <strong>Important:</strong> These scores are derived from logged training data. For any concerns about pain, injury, or health, please consult a qualified medical professional.
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

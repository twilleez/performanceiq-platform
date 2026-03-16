import { buildSidebar }       from '../../components/nav.js';
import { getScoreBreakdown }  from '../../state/selectors.js';
import { getCurrentUser }     from '../../core/auth.js';

export function renderSoloScore() {
  const sb   = getScoreBreakdown();
  const user = getCurrentUser();
  const rows = [
    { label:'Training Consistency', detail:'Streak + total sessions', key:'consistency', icon:'📅' },
    { label:'Readiness Index',       detail:'Sleep, load, recovery',    key:'readiness',   icon:'💚' },
    { label:'Workout Compliance',    detail:'% of sessions completed',  key:'compliance',  icon:'✅' },
    { label:'Load Management',       detail:'RPE balance over 7 days',  key:'load',        icon:'⚖️' },
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/score')}
  <main class="page-main">
    <div class="page-header">
      <h1>PIQ <span>Score</span></h1>
      <p>${user?.name||'Solo Athlete'} · Performance Intelligence Quotient</p>
    </div>
    <div class="piq-score-hero">
      <div class="piq-score-val">${sb.total}</div>
      <div class="piq-score-lbl">Performance IQ Score</div>
      <div class="piq-score-tier">${sb.tier}</div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Score Breakdown</div>
        ${rows.map(r => `
        <div class="score-breakdown-row">
          <div>
            <div class="score-bd-label">${r.icon} ${r.label}</div>
            <div class="score-bd-detail">${r.detail}</div>
          </div>
          <div class="score-bd-wt">${Math.round(sb[r.key].weight*100)}%</div>
          <div class="score-bd-val">${sb[r.key].raw}</div>
        </div>`).join('')}
        <div class="divider"></div>
        <div class="score-breakdown-row" style="padding-top:0">
          <div><div class="score-bd-label" style="font-size:15px">Total PIQ</div></div>
          <div></div>
          <div class="score-bd-val" style="font-size:30px;color:var(--piq-green-dark)">${sb.total}</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">How to Improve</div>
        <div class="w-row"><div class="w-icon">📅</div><div class="w-info"><div class="w-name">Log every session</div><div class="w-meta">Consistency = 35% of your score</div></div></div>
        <div class="w-row"><div class="w-icon">💚</div><div class="w-info"><div class="w-name">Track readiness daily</div><div class="w-meta">Sleep and recovery matter</div></div></div>
        <div class="w-row"><div class="w-icon">⚖️</div><div class="w-info"><div class="w-name">Manage load</div><div class="w-meta">Target RPE 6–7 average</div></div></div>
        <div style="margin-top:16px">
          <button class="btn-primary" style="width:auto;padding:10px 20px" data-route="solo/builder">Build a Workout →</button>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

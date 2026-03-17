/**
 * Player PIQ Score View — full breakdown
 */
import { buildSidebar }         from '../../components/nav.js';
import { getScoreBreakdown, getReadinessScore,
         getReadinessColor }    from '../../state/selectors.js';
import { getCurrentUser }       from '../../core/auth.js';

export function renderPlayerScore() {
  const user = getCurrentUser();
  const sb   = getScoreBreakdown();
  const r    = getReadinessScore();
  const rc   = getReadinessColor(r);

  const rows = [
    { label:'Training Consistency', detail:'Streak + total sessions logged', key:'consistency', icon:'📅' },
    { label:'Readiness Index',       detail:'Sleep, load, nutrition, mood',    key:'readiness',   icon:'💚' },
    { label:'Workout Compliance',    detail:'% of sessions completed',         key:'compliance',  icon:'✅' },
    { label:'Load Management',       detail:'RPE balance over last 7 sessions',key:'load',        icon:'⚖️' },
  ];

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/score')}
  <main class="page-main">
    <div class="page-header">
      <h1>PIQ <span>Score</span></h1>
      <p>${user?.name||'Athlete'} · Performance Intelligence Quotient</p>
    </div>

    <!-- Hero score -->
    <div class="piq-score-hero">
      <div class="piq-score-val">${sb.total}</div>
      <div class="piq-score-lbl">Performance IQ Score</div>
      <div class="piq-score-tier">${sb.tier}</div>
    </div>

    <div class="panels-2">
      <!-- Breakdown -->
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
          <div><div class="score-bd-label" style="font-size:15px">Total PIQ Score</div></div>
          <div></div>
          <div class="score-bd-val" style="font-size:30px;color:var(--piq-green-dark)">${sb.total}</div>
        </div>
      </div>

      <!-- Tier guide + tips -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Score Tiers</div>
          ${[['Elite','90–99','Exceptional performance across all pillars'],
             ['Advanced','80–89','Strong fundamentals + great consistency'],
             ['Developing','70–79','Solid base with room to grow'],
             ['Building','60–69','Consistency improvements unlock gains'],
             ['Getting Started','0–59','Log sessions to build your score']
            ].map(([tier,range,desc])=>`
          <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
            <span class="tag ${sb.tier===tier?'tag-green':'tag-navy'}" style="flex-shrink:0">${tier}</span>
            <div>
              <div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${range}</div>
              <div style="font-size:11.5px;color:var(--text-muted)">${desc}</div>
            </div>
          </div>`).join('')}
        </div>

        <div class="panel">
          <div class="panel-title">How to Improve</div>
          <div class="w-row"><div class="w-icon">📅</div><div class="w-info"><div class="w-name">Log every session</div><div class="w-meta">Consistency (35%) is the biggest driver</div></div></div>
          <div class="w-row"><div class="w-icon">💚</div><div class="w-info"><div class="w-name">Track readiness daily</div><div class="w-meta">Sleep and recovery directly affect your score</div></div></div>
          <div class="w-row"><div class="w-icon">⚖️</div><div class="w-info"><div class="w-name">Manage training load</div><div class="w-meta">Aim for RPE 6–7 average over the week</div></div></div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

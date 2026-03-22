/**
 * PerformanceIQ — Solo PIQ Score View
 */
import { buildSidebar }           from '../../components/nav.js';
import { getCurrentUser }         from '../../core/auth.js';
import { getScoreBreakdown }      from '../../state/selectors.js';
import { getScoreBreakdownElite } from '../../state/selectorsElite.js';

export function renderSoloScore() {
  const sb   = getScoreBreakdownElite();
  const user = getCurrentUser();

  const pillars = [
    { label:'Training Consistency', detail:'Streak + total sessions logged',       key:'consistency', icon:'🔥', weight:'30%', color:'#22c955' },
    { label:'Readiness Index',      detail:'Sleep, energy, mood, soreness, stress', key:'readiness',   icon:'💚', weight:'25%', color:'#3b82f6' },
    { label:'Workout Compliance',   detail:'% of sessions completed',              key:'compliance',  icon:'✅', weight:'20%', color:'#f59e0b' },
    { label:'Load Management',      detail:'ACWR sweet spot (0.8–1.3)',             key:'load',        icon:'⚖️', weight:'15%', color:'#a78bfa' },
    { label:'Profile Completeness', detail:'Sport, position, goals filled in',     key:'profile',     icon:'👤', weight:'10%', color:'#60a5fa' },
  ];

  const tierColor = sb.total >= 85 ? '#22c955' : sb.total >= 70 ? '#3b82f6' : sb.total >= 55 ? '#f59e0b' : '#ef4444';

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/score')}
  <main class="page-main">
    <div class="page-header">
      <h1>PIQ <span>Score</span></h1>
      <p>${user?.name||'Solo Athlete'} · Performance Intelligence Quotient</p>
    </div>

    <!-- Hero score -->
    <div style="text-align:center;padding:32px 24px;background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border:1px solid ${tierColor}40;border-radius:16px;margin-bottom:20px">
      <div style="font-family:'Oswald',sans-serif;font-size:72px;font-weight:700;line-height:1;color:${tierColor}">${sb.total}</div>
      <div style="font-size:14px;color:rgba(255,255,255,.6);margin-top:8px">Performance Intelligence Quotient</div>
      <div style="display:inline-block;margin-top:10px;padding:4px 20px;border-radius:20px;background:${tierColor}22;color:${tierColor};font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;border:1px solid ${tierColor}40">${sb.tier || 'DEVELOPING'}</div>
    </div>

    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Score Breakdown</div>
        <div style="margin-top:12px">
          ${pillars.map(p => {
            const comp = sb[p.key];
            const val  = comp?.raw || 0;
            return `
            <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
                <div>
                  <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${p.icon} ${p.label}</div>
                  <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${p.detail}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:12px">
                  <div style="font-size:18px;font-weight:700;color:${p.color}">${val}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${p.weight} weight</div>
                </div>
              </div>
              <div style="height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${val}%;background:${p.color};border-radius:3px;transition:width .5s"></div>
              </div>
            </div>`;
          }).join('')}
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px">
            <span style="font-size:15px;font-weight:700;color:var(--text-primary)">Total PIQ Score</span>
            <span style="font-size:28px;font-weight:700;color:${tierColor}">${sb.total}</span>
          </div>
        </div>
      </div>

      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">How to Improve</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
            ${[
              ['📅','Log every session','Consistency = 30% of your score','solo/log'],
              ['💚','Check in daily','Sleep & readiness = 25%','solo/readiness'],
              ['⚖️','Manage load','Keep ACWR 0.8–1.3 (Gabbett 2016)','solo/today'],
              ['👤','Complete profile','Unlocks personalised programming','solo/settings'],
            ].map(([icon,title,sub,route]) => `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--surface-2);border-radius:10px;cursor:pointer" data-route="${route}">
              <span style="font-size:18px;flex-shrink:0">${icon}</span>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${title}</div>
                <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${sub}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Score Tiers</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            ${[['Elite','85–99','#22c955'],['Strong','70–84','#3b82f6'],['Developing','55–69','#f59e0b'],['Needs Work','0–54','#ef4444']].map(([label,range,color]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;background:${color}15;border:1px solid ${color}30">
              <span style="font-size:13px;font-weight:600;color:${color}">${label}</span>
              <span style="font-size:12px;color:var(--text-muted)">${range}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

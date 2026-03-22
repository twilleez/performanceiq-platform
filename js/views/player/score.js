import { buildSidebar } from '../../components/nav.js';
import { getCurrentRole, getCurrentUser } from '../../core/auth.js';
import { getScoreBreakdown, getReadinessColor } from '../../state/selectors.js';
export function renderPlayerScore() {
  const role = getCurrentRole() || 'player';
  const user = getCurrentUser();
  const sb = getScoreBreakdown();
  const color = getReadinessColor(sb.total);
  const pillars = [
    {key:'consistency',label:'Training Consistency',weight:'30%',icon:'📅',tip:'Log sessions daily to maximize this pillar.'},
    {key:'readiness',  label:'Readiness Index',    weight:'30%',icon:'💚',tip:'Daily check-in improves accuracy by 35%.'},
    {key:'compliance', label:'Workout Compliance', weight:'20%',icon:'✅',tip:'Complete >80% of prescribed sessions.'},
    {key:'load',       label:'Load Management',    weight:'10%',icon:'⚖️',tip:'ACWR 0.8–1.3 is the sweet spot (Gabbett 2016).'},
    {key:'profile',    label:'Profile Completeness',weight:'10%',icon:'👤',tip:'Complete your athletic profile for accuracy.'},
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role,role+'/score')}
  <main class="page-main">
    <div class="page-header"><h1>PIQ <span>Score</span></h1><p>${user?.name||'Athlete'} · Performance Intelligence Quotient</p></div>
    <div style="text-align:center;padding:32px 20px;background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border-radius:16px;margin-bottom:24px;border:1px solid #22c95530">
      <div style="font-family:'Oswald',sans-serif;font-size:72px;font-weight:700;color:${color};line-height:1">${sb.total}</div>
      <div style="font-size:14px;color:rgba(255,255,255,.6);margin-top:6px">Performance IQ Score</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;color:${color};letter-spacing:4px;margin-top:8px">${sb.tier||'DEVELOPING'}</div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Score Breakdown</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:14px">
          ${pillars.map(p => {
            const val = sb[p.key]?.raw || 0;
            return `<div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
                <div><span style="margin-right:6px">${p.icon}</span><span style="font-size:13px;font-weight:600;color:var(--text-primary)">${p.label}</span><span style="font-size:11px;color:var(--text-muted);margin-left:6px">${p.weight}</span></div>
                <span style="font-size:14px;font-weight:700;color:${getReadinessColor(val)}">${val}</span>
              </div>
              <div style="height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${val}%;background:${getReadinessColor(val)};border-radius:3px;transition:width .6s ease"></div>
              </div>
              <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px">${p.tip}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">How to Improve</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
            ${[['📅','Log every session','Consistency is 30% of your score'],['💚','Daily check-in','Takes 5 seconds, adds 35% accuracy'],['✅','Complete workouts','Compliance drives 20% of your score'],['👤','Complete profile','Unlock personalized programming']].map(([icon,title,desc])=>`
            <div style="display:flex;gap:10px;padding:10px;background:var(--surface-2);border-radius:10px">
              <span style="font-size:18px">${icon}</span>
              <div><div style="font-size:13px;font-weight:600;color:var(--text-primary)">${title}</div><div style="font-size:11.5px;color:var(--text-muted)">${desc}</div></div>
            </div>`).join('')}
          </div>
        </div>
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border-color:#22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:8px">SCIENCE</div>
          <div style="font-size:12.5px;color:#c8d8e8;line-height:1.6">PIQ is a 5-pillar composite based on NSCA load management, HRV research (Buchheit 2013), and IOC 2016 athlete monitoring consensus.</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
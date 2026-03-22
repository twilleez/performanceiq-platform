import { buildSidebar } from '../../components/nav.js';
import { getCurrentRole, getCurrentUser } from '../../core/auth.js';
import { getAthleteProfile } from '../../state/state.js';
import { getPIQScore, getStreak } from '../../state/selectors.js';
export function renderPlayerRecruiting() {
  const role = getCurrentRole() || 'player';
  const user = getCurrentUser();
  const profile = getAthleteProfile();
  const piq = getPIQScore();
  const schools = [
    {name:'State University',div:'Division I',sport:'Basketball',interest:'High',color:'#22c955'},
    {name:'Regional College',div:'Division II',sport:'Basketball',interest:'Medium',color:'#3b82f6'},
    {name:'Community College',div:'JUCO',sport:'Basketball',interest:'High',color:'#f59e0b'},
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role,role+'/recruiting')}
  <main class="page-main">
    <div class="page-header"><h1>Recruiting</h1><p>${user?.name||'Athlete'} · Recruiting profile and tracker</p></div>
    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Your Recruiting Profile</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
            ${[['PIQ Score',piq,'Recruiters use this as a training intelligence metric'],['Sport',(profile.sport||'Basketball').charAt(0).toUpperCase()+(profile.sport||'basketball').slice(1),'Primary sport'],['Position',profile.position||'Point Guard','Your position'],['Class Year',profile.gradYear||new Date().getFullYear()+1,'Graduation year'],['GPA','3.7','Academic standing']].map(([k,v,d])=>`
            <div style="padding:10px;background:var(--surface-2);border-radius:8px">
              <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                <span style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${k}</span>
                <span style="font-size:13px;font-weight:700;color:var(--piq-green)">${v}</span>
              </div>
              <div style="font-size:11.5px;color:var(--text-muted)">${d}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Interest Tracker</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
          ${schools.map(s=>`
          <div style="padding:12px;border:1px solid ${s.color}40;border-radius:12px;background:${s.color}08">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
              <div><div style="font-weight:700;font-size:13.5px;color:var(--text-primary)">${s.name}</div><div style="font-size:12px;color:var(--text-muted)">${s.div} · ${s.sport}</div></div>
              <span style="font-size:11px;padding:3px 8px;border-radius:8px;background:${s.color}20;color:${s.color};font-weight:700">${s.interest}</span>
            </div>
            <button class="btn-draft" style="font-size:12px;padding:6px 12px">Track Progress</button>
          </div>`).join('')}
          <button class="btn-draft" style="font-size:12.5px;padding:10px;text-align:center;width:100%">+ Add School</button>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
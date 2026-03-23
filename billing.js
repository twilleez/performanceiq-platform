import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderAdminSettings() {
  const roster = getRoster();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/settings')}
  <main class="page-main">
    <div class="page-header"><h1>Settings</h1><p>Platform administration</p></div>
    
    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Organization</div>
          ${[['Organization Name','Riverside Athletics'],['Type','High School Program'],['Sports','Basketball, Track, Soccer'],['Location','Newport News, VA']].map(([k,v])=>`
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:13px;color:var(--text-muted)">${k}</span>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${v}</span>
          </div>`).join('')}
          <button class="btn-draft" style="width:100%;margin-top:14px;font-size:13px;padding:10px">Edit Organization</button>
        </div>
        <div class="panel">
          <div class="panel-title">Appearance</div>
          <button class="btn-draft" style="width:100%;font-size:13px;padding:10px;margin-top:10px" data-route="settings/theme">Theme Settings</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Platform Settings</div>
        ${[['Allow athlete self-registration',true],['Require coach approval for new athletes',false],['Enable parent portal',true],['Send weekly digest emails',true],['Allow anonymous performance data sharing',false]].map(([l,on])=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;color:var(--text-primary)">${l}</span>
          <div style="width:40px;height:22px;border-radius:11px;background:${on?'var(--piq-green)':'var(--surface-2)'};position:relative;cursor:pointer">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;${on?'right:2px':'left:2px'}"></div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}
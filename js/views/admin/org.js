import { buildSidebar } from '../../components/nav.js';
export function renderAdminOrg() {
  return `<div class="view-with-sidebar">${buildSidebar('admin','admin/org')}
  <main class="page-main">
    <div class="page-header"><h1>Organization</h1><p>Manage organization settings</p></div>
    <div class="panels-2">
      <div class="panel"><div class="panel-title">Organization Details</div>
        <div style="margin-top:12px">
          ${[['Name','Riverside Athletics'],['Type','High School Program'],['Sports','Basketball, Track, Soccer'],['Founded','2018'],['Location','Newport News, VA']].map(([k,v])=>`
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12.5px;color:var(--text-muted)">${k}</span>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${v}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="panel"><div class="panel-title">Subscription</div>
        <div style="padding:16px;background:var(--surface-2);border-radius:12px;margin-top:12px">
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">Team Pro Plan</div>
          <div style="font-size:22px;font-weight:700;margin-top:8px">$149<span style="font-size:13px;font-weight:400;color:var(--text-muted)">/month</span></div>
        </div>
      </div>
    </div>
  </main></div>`;
}

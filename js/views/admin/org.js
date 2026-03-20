/**
 * Admin Org View — organization settings
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderAdminOrg() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/org')}
  <main class="page-main">
    <div class="page-header">
      <h1>Organization</h1>
      <p>Manage your organization settings and structure</p>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Organization Details</div>
        <div style="margin-top:12px">
          ${[['Name','Riverside Athletics'],['Type','High School Program'],['Sports','Basketball, Track, Soccer'],['Founded','2018'],['Location','Riverside, CA']].map(([k,v])=>`
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12.5px;color:var(--text-muted)">${k}</span>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${v}</span>
          </div>`).join('')}
        </div>
        <button class="btn-draft" style="width:100%;margin-top:14px;font-size:13px;padding:10px">Edit Organization</button>
      </div>
      <div class="panel">
        <div class="panel-title">Subscription</div>
        <div style="padding:16px;background:var(--surface-2);border-radius:12px;margin-top:12px">
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">Team Pro Plan</div>
          <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px">Up to 50 athletes · 5 coaches · Full analytics</div>
          <div style="font-size:22px;font-weight:700">$149<span style="font-size:13px;font-weight:400;color:var(--text-muted)">/month</span></div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

/**
 * PerformanceIQ — Admin notice for signed-in accounts
 * The admin dashboards are built on sample organisation data. A real admin
 * account is shown this notice instead of sample numbers presented as live.
 */
import { buildSidebar } from '../../components/nav.js';

export function renderRealAdminNotice(route) {
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin', route)}
  <main class="page-main">
    <div class="page-header"><h1>Organisation <span>Admin</span></h1><p>Live reporting is not connected yet</p></div>
    <div class="panel" style="padding:28px 20px;text-align:center">
      <div style="font-size:30px;margin-bottom:8px">🏛️</div>
      <div style="font-weight:700;font-size:15px;color:var(--text-primary)">No live organisation data to show</div>
      <div style="font-size:12.5px;color:var(--text-muted);line-height:1.6;margin-top:6px;max-width:520px;margin-left:auto;margin-right:auto">
        Admin dashboards currently run on sample data and are available in the demo only.
        This account will show real teams, coaches and athletes once organisation reporting is connected.
      </div>
    </div>
  </main>
</div>`;
}

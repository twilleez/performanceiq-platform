/**
 * Coach Session View — Stub
 * Renders a single training session detail page.
 */
import { buildSidebar } from '../../components/nav.js';
import { getCurrentRole } from '../../core/auth.js';

export function renderCoachSession() {
  const role = getCurrentRole() || 'coach';
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, 'coach/session')}
  <main class="page-main">
    <div class="page-header">
      <h1>Session <span>Detail</span></h1>
      <p>View and manage individual training sessions</p>
    </div>
    <div class="panel" style="text-align:center;padding:48px 24px">
      <div style="font-size:48px;margin-bottom:16px">📋</div>
      <div style="font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:8px">Session Detail</div>
      <div style="font-size:14px;color:var(--text-muted)">Full session management coming in the next release.</div>
      <button data-route="coach/program" class="btn btn-primary" style="margin-top:24px">← Back to Programs</button>
    </div>
  </main>
</div>`;
}

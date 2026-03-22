import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderAdminBilling() {
  const roster = getRoster();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/billing')}
  <main class="page-main">
    <div class="page-header"><h1>Billing</h1><p>Organization billing and invoices</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Plan</div><div class="kpi-val" style="color:#22c955;font-size:16px">Team Pro</div><div class="kpi-chg">Current plan</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Monthly Cost</div><div class="kpi-val b">$149</div><div class="kpi-chg">Per month</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Athletes</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Included: 20</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Next Renewal</div><div class="kpi-val" style="color:#f59e0b;font-size:16px">Apr 1</div><div class="kpi-chg">2026</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Current Plan</div>
        <div style="padding:16px;background:var(--surface-2);border-radius:12px;margin-top:12px">
          <div style="font-weight:700;font-size:16px;color:var(--text-primary);margin-bottom:4px">Team Pro</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Up to 20 athletes · Unlimited coaches · Full analytics</div>
          <div style="font-size:28px;font-weight:700;color:var(--text-primary)">$149<span style="font-size:13px;font-weight:400;color:var(--text-muted)">/month</span></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn-draft" style="flex:1;font-size:13px;padding:10px">Upgrade Plan</button>
          <button class="btn-draft" style="flex:1;font-size:13px;padding:10px">Update Payment</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Recent Invoices</div>
        ${['March 2026','February 2026','January 2026'].map((m,i)=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <div><div style="font-size:13px;font-weight:600;color:var(--text-primary)">${m}</div><div style="font-size:11.5px;color:var(--text-muted)">Team Pro · ${i===0?'Due Apr 1':'Paid'}</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-weight:700;color:var(--text-primary)">$149</span>
            <button class="btn-draft" style="font-size:11px;padding:4px 10px">${i===0?'Pay':'Download'}</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}
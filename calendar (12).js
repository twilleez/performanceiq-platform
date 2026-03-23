import { buildSidebar } from '../../components/nav.js';
export function renderParentBilling() {
  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/billing')}
  <main class="page-main">
    <div class="page-header"><h1>Billing</h1><p>Subscription and payment details</p></div>
    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Current Plan</div>
          <div style="padding:16px;background:var(--surface-2);border-radius:12px;margin-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-weight:700;font-size:16px;color:var(--text-primary)">Family Plan</span>
              <span style="font-size:11px;padding:3px 10px;border-radius:10px;background:#22c95522;color:#22c955;font-weight:700">ACTIVE</span>
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">1 athlete · Full access · Renews monthly</div>
            <div style="font-size:24px;font-weight:700;color:var(--text-primary)">$19.99<span style="font-size:13px;font-weight:400;color:var(--text-muted)">/month</span></div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Payment Method</div>
          <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--surface-2);border-radius:10px;margin-top:10px">
            <div style="font-size:24px">💳</div>
            <div><div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">Visa ending in 4242</div><div style="font-size:12px;color:var(--text-muted)">Expires 12/27</div></div>
          </div>
          <button class="btn-draft" style="font-size:13px;padding:10px;width:100%;margin-top:12px">Update Payment Method</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Recent Invoices</div>
        ${['March 2026','February 2026','January 2026'].map((m,i)=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <div><div style="font-size:13px;font-weight:600;color:var(--text-primary)">${m}</div><div style="font-size:11.5px;color:var(--text-muted)">Family Plan · ${i===0?'Due Mar 1':'Paid'}</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-weight:700;font-size:14px;color:var(--text-primary)">$19.99</span>
            <button class="btn-draft" style="font-size:11px;padding:4px 10px">${i===0?'Pay':'Download'}</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}
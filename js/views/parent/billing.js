/**
 * Parent Billing View — subscription and payment management
 */
import { buildSidebar }  from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { showToast }     from '../../core/notifications.js';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function renderParentBilling() {
  const user = getCurrentUser();

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      features: ['1 athlete account', 'Readiness tracking', 'Weekly plan view', 'Coach messaging'],
      color: '#6b7280',
    },
    {
      id: 'family',
      name: 'Family',
      price: 19.99,
      features: ['1 athlete account', 'Full PIQ Score analytics', 'Progress reports', 'Nutrition tracking', 'Recruiting profile', 'Priority support'],
      color: '#22c955',
      current: true,
    },
    {
      id: 'family-plus',
      name: 'Family+',
      price: 34.99,
      features: ['Up to 3 athletes', 'Everything in Family', 'Cross-athlete dashboard', 'Video analysis access'],
      color: '#3b82f6',
    },
  ];

  const invoices = [
    { id:'INV-2024-012', date:'Dec 1, 2024',  amount:19.99, status:'Paid' },
    { id:'INV-2024-011', date:'Nov 1, 2024',  amount:19.99, status:'Paid' },
    { id:'INV-2024-010', date:'Oct 1, 2024',  amount:19.99, status:'Paid' },
    { id:'INV-2024-009', date:'Sep 1, 2024',  amount:19.99, status:'Paid' },
  ];

  const planCards = plans.map(p => `
  <div style="border:${p.current?'2px solid '+p.color:'1px solid var(--border)'};border-radius:14px;padding:18px;position:relative;background:${p.current?p.color+'11':'var(--surface-1)'}">
    ${p.current ? `<div style="position:absolute;top:-1px;right:14px;background:${p.color};color:#0d1b3e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:0 0 8px 8px">YOUR PLAN</div>` : ''}
    <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:var(--text-primary)">${esc(p.name)}</div>
    <div style="font-size:26px;font-weight:700;color:${p.color};margin-bottom:10px">
      $${p.price}<span style="font-size:12px;font-weight:400;color:var(--text-muted)">/mo</span>
    </div>
    <div style="margin-bottom:14px">
      ${p.features.map(f=>`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12.5px;color:var(--text-primary)"><span style="color:${p.color};font-weight:700">✓</span>${esc(f)}</div>`).join('')}
    </div>
    <button class="${p.current?'btn-draft':'btn-primary'}" style="width:100%;font-size:13px;padding:10px" ${p.current?'disabled':''} data-plan="${p.id}">
      ${p.current ? 'Current Plan' : 'Switch Plan'}
    </button>
  </div>`).join('');

  const invoiceRows = invoices.map(inv => `
  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
    <div style="display:flex;align-items:center;gap:14px">
      <span style="font-size:12.5px;color:var(--text-muted);font-family:monospace">${esc(inv.id)}</span>
      <span style="font-size:13px;color:var(--text-muted)">${esc(inv.date)}</span>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:14px;font-weight:700;color:var(--text-primary)">$${inv.amount.toFixed(2)}</span>
      <span style="background:#22c95522;color:#22c955;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600">${esc(inv.status)}</span>
      <button class="btn-draft inv-pdf-btn" style="font-size:11.5px;padding:5px 10px">PDF</button>
    </div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/billing')}
  <main class="page-main">
    <div class="page-header">
      <h1>Billing</h1>
      <p>Manage your subscription and payment details</p>
    </div>

    <!-- Active plan summary -->
    <div class="panel" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--text-primary)">Family Plan · Active</div>
          <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px">Next billing: January 1, 2025 · $19.99</div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn-draft" id="par-cancel-plan" style="font-size:13px;padding:9px 14px;border-color:#ef4444;color:#ef4444">Cancel Plan</button>
          <button class="btn-draft" id="par-update-pay" style="font-size:13px;padding:9px 14px">Update Payment</button>
        </div>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;align-items:center;gap:12px">
        <div style="background:var(--surface-2);border-radius:8px;padding:8px 14px;font-size:13px;color:var(--text-muted);display:flex;align-items:center;gap:8px">
          <span>💳</span> Visa •••• 4242 · Expires 12/27
        </div>
        <button class="btn-draft" id="par-change-card" style="font-size:12px;padding:7px 12px">Change</button>
      </div>
    </div>

    <!-- Plan options -->
    <div class="panel" style="margin-bottom:20px">
      <div class="panel-title">Available Plans</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:14px">
        ${planCards}
      </div>
    </div>

    <!-- Invoice history -->
    <div class="panel" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-weight:600;font-size:13.5px">Billing History</span>
        <button class="btn-draft" id="par-export-inv" style="font-size:12px;padding:6px 12px">Export All</button>
      </div>
      ${invoiceRows}
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.getElementById('par-cancel-plan')?.addEventListener('click', () => showToast('Contact support to cancel your plan', 'warn'));
  document.getElementById('par-update-pay')?.addEventListener('click', () => showToast('Payment update — contact support'));
  document.getElementById('par-change-card')?.addEventListener('click', () => showToast('Payment update — contact support'));
  document.getElementById('par-export-inv')?.addEventListener('click', () => showToast('Invoice export queued'));
  document.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => showToast(`Plan change to ${btn.dataset.plan} — contact support`));
  });
  document.querySelectorAll('.inv-pdf-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Invoice PDF downloading'));
  });
});

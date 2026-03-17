/**
 * Solo Subscription View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderSoloSubscription() {
  const user = getCurrentUser();

  const plans = [
    { name: 'Free', price: '$0', period: 'forever', features: ['Basic workout logging','PIQ Score tracking','Readiness index','Exercise library access'], current: true, color: '#6b7280' },
    { name: 'Solo Pro', price: '$9.99', period: '/month', features: ['Everything in Free','AI training recommendations','Advanced analytics','Goal tracking','Priority support'], current: false, color: '#22c955' },
    { name: 'Elite', price: '$19.99', period: '/month', features: ['Everything in Solo Pro','Coach connection','Recruiting profile','Video analysis','Custom programs'], current: false, color: '#3b82f6' },
  ];

  const planCards = plans.map(p => `
  <div style="padding:20px;border:2px solid ${p.current?p.color:'var(--border)'};border-radius:14px;position:relative;background:${p.current?p.color+'11':'transparent'}">
    ${p.current?`<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:10px;padding:3px 12px;border-radius:10px;background:${p.color};color:#fff;font-weight:700;white-space:nowrap">CURRENT PLAN</div>`:''}
    <div style="font-weight:700;font-size:16px;color:var(--text-primary);margin-bottom:4px">${p.name}</div>
    <div style="font-size:24px;font-weight:700;color:${p.color};margin-bottom:12px">${p.price}<span style="font-size:13px;font-weight:400;color:var(--text-muted)">${p.period}</span></div>
    <div style="margin-bottom:16px">
      ${p.features.map(f=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12.5px;color:var(--text-primary)"><span style="color:${p.color}">✓</span>${f}</div>`).join('')}
    </div>
    <button class="${p.current?'btn-draft':'btn-primary'}" style="width:100%;font-size:13px;padding:10px" ${p.current?'disabled':''}>
      ${p.current?'Current Plan':'Upgrade'}
    </button>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/subscription')}
  <main class="page-main">
    <div class="page-header">
      <h1>Subscription</h1>
      <p>Manage your PerformanceIQ plan</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:20px">
      ${planCards}
    </div>
    <div class="panel">
      <div class="panel-title">Billing Information</div>
      <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">
        You are currently on the <strong style="color:var(--text-primary)">Free Plan</strong>. No billing information required.
      </div>
    </div>
  </main>
</div>`;
}

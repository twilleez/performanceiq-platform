import { buildSidebar } from '../../components/nav.js';
export function renderSoloSubscription() {
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/subscription')}
  <main class="page-main">
    <div class="page-header"><h1>Subscription</h1><p>Your plan and billing details</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px">
      <div class="panel" style="border:2px solid var(--piq-green)">
        <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.08em;margin-bottom:8px">CURRENT PLAN</div>
        <div style="font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:4px">Solo Free</div>
        <div style="font-size:32px;font-weight:800;color:var(--piq-green);margin-bottom:12px">$0<span style="font-size:14px;font-weight:400;color:var(--text-muted)">/month</span></div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
          ${['Daily workout generation','PIQ Score tracking','Readiness check-ins','Progress history','Nutrition targets'].map(f=>`
          <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-primary)">
            <span style="color:var(--piq-green)">✓</span>${f}
          </div>`).join('')}
        </div>
        <div style="padding:10px;background:var(--piq-green-glow);border-radius:8px;font-size:12px;color:var(--piq-green);font-weight:600;text-align:center">Free forever — no credit card needed</div>
      </div>
      <div class="panel">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.08em;margin-bottom:8px">SOLO PRO</div>
        <div style="font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:4px">Solo Pro</div>
        <div style="font-size:32px;font-weight:800;color:var(--text-primary);margin-bottom:12px">$9.99<span style="font-size:14px;font-weight:400;color:var(--text-muted)">/month</span></div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
          ${['Everything in Free','Advanced ACWR analytics','Injury risk monitoring','Recruiting profile tools','Export training data','Priority support'].map(f=>`
          <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-muted)">
            <span style="color:var(--text-muted)">+</span>${f}
          </div>`).join('')}
        </div>
        <button class="btn-primary" style="width:100%;font-size:14px;padding:13px">Upgrade to Pro →</button>
      </div>
    </div>
  </main>
</div>`;
}
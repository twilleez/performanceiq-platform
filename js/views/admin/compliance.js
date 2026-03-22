import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderAdminCompliance() {
  const roster = getRoster();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/compliance')}
  <main class="page-main">
    <div class="page-header"><h1>Compliance</h1><p>Platform administration</p></div>
    
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">HIPAA Status</div><div class="kpi-val g">✓</div><div class="kpi-chg">Compliant</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Data Encryption</div><div class="kpi-val g">✓</div><div class="kpi-chg">AES-256</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Last Audit</div><div class="kpi-val b" style="font-size:16px">Jan 2026</div><div class="kpi-chg">Next: Apr 2026</div></div>
    </div>
    <div class="panels-2">
      <div class="panel"><div class="panel-title">Data Privacy Controls</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
          ${[['Athlete data encrypted at rest','Active','#22c955'],['GDPR consent tracking','Active','#22c955'],['Minor athlete protections','Active','#22c955'],['Data retention policy (2yr)','Active','#22c955'],['Export / deletion requests','Available','#3b82f6']].map(([label,status,color])=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--surface-2);border-radius:8px">
            <span style="font-size:13px;color:var(--text-primary)">${label}</span>
            <span style="font-size:11px;padding:2px 8px;border-radius:8px;background:${color}20;color:${color};font-weight:600">${status}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="panel"><div class="panel-title">Minor Athlete Protections</div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-muted);line-height:1.7">
          <p style="margin:0 0 10px">All athletes under 18 have enhanced privacy protections. Parental consent is required for data collection, and health data is never shared with third parties.</p>
          <p style="margin:0">Coaches and admins can view performance data only. Medical or injury notes are restricted to designated medical staff.</p>
        </div>
        <button class="btn-draft" style="width:100%;margin-top:14px;font-size:13px;padding:10px">Download Compliance Report</button>
      </div>
    </div>
  </main>
</div>`;
}
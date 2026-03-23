/**
 * PerformanceIQ — Admin Org View
 * ─────────────────────────────────────────────────────────────
 * Phase 2: Final missing route implemented.
 * Organisation settings, subscription, team structure,
 * and platform health summary in one view.
 */
import { buildSidebar }       from '../../components/nav.js';
import { getCurrentUser }     from '../../core/auth.js';
import { getRoster }          from '../../state/state.js';
import { showToast }          from '../../core/notifications.js';

export function renderAdminOrg() {
  const user    = getCurrentUser();
  const roster  = getRoster();
  const avgPIQ  = roster.length ? Math.round(roster.reduce((s,a) => s+a.piq, 0) / roster.length) : 0;
  const avgRdy  = roster.length ? Math.round(roster.reduce((s,a) => s+a.readiness, 0) / roster.length) : 0;
  const atRisk  = roster.filter(a => a.readiness < 60).length;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('admin','admin/org')}
  <main class="page-main">

    <div class="page-header">
      <h1>Organization</h1>
      <p>Manage your organization profile, subscription, and platform settings</p>
    </div>

    <!-- Org health snapshot -->
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Athletes</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Active accounts</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg PIQ</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">Platform average</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Readiness</div><div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card" style="${atRisk?'border-color:rgba(239,68,68,.4)':''}">
        <div class="kpi-lbl">At Risk</div>
        <div class="kpi-val" style="color:${atRisk?'#ef4444':'#22c955'}">${atRisk}</div>
        <div class="kpi-chg">Readiness &lt;60</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

      <!-- Left column -->
      <div>

        <!-- Org details -->
        <div class="panel" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div class="panel-title" style="margin:0">Organization Profile</div>
            <button class="btn-draft" style="font-size:12px;padding:6px 12px" id="edit-org-btn">Edit</button>
          </div>

          <div id="org-view">
            ${[
              ['Organization Name', 'Riverside Athletics'],
              ['Type',              'High School Sports Program'],
              ['Primary Sport',     'Basketball, Track, Soccer'],
              ['Founded',           '2018'],
              ['Location',          'Newport News, VA'],
              ['Website',           'riversideathletics.org'],
            ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:12.5px;color:var(--text-muted)">${k}</span>
              <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${v}</span>
            </div>`).join('')}
          </div>

          <div id="org-edit" style="display:none">
            ${[
              ['org-name',     'text',  'Organization Name', 'Riverside Athletics'],
              ['org-location', 'text',  'Location',          'Newport News, VA'],
              ['org-website',  'url',   'Website',           'riversideathletics.org'],
            ].map(([id,type,label,placeholder]) => `
            <div class="b-field" style="margin-top:10px">
              <label>${label}</label>
              <input type="${type}" id="${id}" placeholder="${placeholder}">
            </div>`).join('')}
            <div style="display:flex;gap:10px;margin-top:14px">
              <button class="btn-primary" id="save-org-btn" style="font-size:13px;padding:10px 20px">Save</button>
              <button class="btn-draft"   id="cancel-org-btn" style="font-size:13px;padding:10px 20px">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Platform Settings -->
        <div class="panel">
          <div class="panel-title">Platform Settings</div>
          <div style="margin-top:12px">
            ${[
              ['Allow athlete self-registration',      true],
              ['Require coach approval for new athletes', false],
              ['Enable parent portal',                 true],
              ['Send weekly digest emails',            true],
              ['Allow anonymous data sharing',         false],
            ].map(([label, on]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:11px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:13px;color:var(--text-primary)">${label}</span>
              <div style="width:40px;height:22px;border-radius:11px;
                          background:${on?'var(--piq-green)':'var(--surface-2)'};
                          position:relative;cursor:pointer;flex-shrink:0">
                <div style="width:18px;height:18px;border-radius:50%;background:#fff;
                            position:absolute;top:2px;${on?'right:2px':'left:2px'}"></div>
              </div>
            </div>`).join('')}
          </div>
        </div>

      </div>

      <!-- Right column -->
      <div>

        <!-- Subscription -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Subscription</div>

          <div style="padding:16px;background:var(--surface-2);border-radius:12px;margin-top:12px;
                      border:1px solid rgba(34,201,85,.2)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span style="font-weight:700;font-size:16px;color:var(--text-primary)">Team Pro</span>
              <span style="font-size:11px;padding:3px 9px;border-radius:10px;
                           background:#22c95522;color:#22c955;font-weight:700">ACTIVE</span>
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
              Up to 20 athletes · Unlimited coaches · Full analytics
            </div>
            <div style="font-size:28px;font-weight:800;color:var(--text-primary)">
              $149<span style="font-size:14px;font-weight:400;color:var(--text-muted)">/month</span>
            </div>
          </div>

          <div style="margin-top:14px">
            <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);
                        margin-bottom:10px;letter-spacing:.04em">PLAN FEATURES</div>
            ${[
              ['Athletes included',     '20 seats'],
              ['Coaches',               'Unlimited'],
              ['Check-in history',      '90 days'],
              ['Analytics',             'Full ACWR + PIQ'],
              ['Parent portal',         'Included'],
              ['Data export',           'CSV + PDF'],
              ['Next renewal',          'April 1, 2026'],
            ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;padding:7px 0;
                        border-bottom:1px solid var(--border)">
              <span style="font-size:12.5px;color:var(--text-muted)">${k}</span>
              <span style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${v}</span>
            </div>`).join('')}
          </div>

          <div style="display:flex;gap:10px;margin-top:14px">
            <button class="btn-draft" style="flex:1;font-size:12.5px;padding:9px">Upgrade Plan</button>
            <button class="btn-draft" style="flex:1;font-size:12.5px;padding:9px">Update Payment</button>
          </div>
        </div>

        <!-- Science Compliance -->
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);
                                   border-color:#22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);
                      letter-spacing:.06em;margin-bottom:8px">SCIENCE FOUNDATION</div>
          <div style="font-size:12.5px;color:#c8d8e8;line-height:1.7">
            Scoring based on Gabbett BJSM 2016 (ACWR),
            Halson Sports Med 2014 (readiness), IOC 2016 consensus,
            and ISSN 2017 (nutrition). All athlete data encrypted at rest.
          </div>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
            ${['ACWR Engine','Readiness Engine','Nutrition Engine','Mindset Engine'].map(e =>
              `<span style="font-size:10.5px;padding:3px 8px;border-radius:8px;
                background:#22c95520;color:#22c955;font-weight:600">${e}</span>`
            ).join('')}
          </div>
        </div>

      </div>
    </div>

  </main>
</div>`;
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'admin/org') return;

  document.getElementById('edit-org-btn')?.addEventListener('click', () => {
    document.getElementById('org-view').style.display = 'none';
    document.getElementById('org-edit').style.display = 'block';
  });
  document.getElementById('cancel-org-btn')?.addEventListener('click', () => {
    document.getElementById('org-view').style.display = 'block';
    document.getElementById('org-edit').style.display = 'none';
  });
  document.getElementById('save-org-btn')?.addEventListener('click', () => {
    document.getElementById('org-view').style.display = 'block';
    document.getElementById('org-edit').style.display = 'none';
    showToast('✅ Organization details saved', 'success');
  });
});

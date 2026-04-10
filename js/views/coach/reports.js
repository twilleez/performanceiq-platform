/**
 * Coach Reports View — UX Enhanced
 *
 * UX FIXES INTEGRATED:
 * [Fix-7]  Report outputs show "Generated at [time]" timestamp
 * [Fix-9]  Coming Soon buttons show tooltip on hover
 */
import { buildSidebar }       from '../../components/nav.js';
import { getRoster, getState } from '../../state/state.js';
import { showToast }           from '../../core/notifications.js';
import { buildReportTimestamp } from '../../components/ux-enhancements.js';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function renderCoachReports() {
  const roster = getRoster();
  const state  = getState();
  const logs   = state.workoutLog || [];
  const now    = Date.now();
  const day7   = now - 7  * 86_400_000;

  const avgPIQ    = roster.length ? Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length) : 0;
  const avgRdy    = roster.length ? Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length) : 0;
  const logsWeek  = logs.filter(l => l.ts >= day7).length;
  const caution   = roster.filter(a => a.readiness < 60).length;
  const completed = logs.filter(l => l.ts >= day7 && l.completed).length;

  const REPORTS = [
    { id:'weekly',      icon:'📊', title:'Weekly summary',       desc:'Team performance overview — past 7 days',           badge:'Ready' },
    { id:'piq-trend',   icon:'📈', title:'PIQ trend report',     desc:'Score distribution and tier breakdown by roster',   badge:'Ready' },
    { id:'readiness',   icon:'💚', title:'Readiness report',     desc:'Readiness flags, patterns, and at-risk athletes',   badge:'Ready' },
    { id:'compliance',  icon:'📋', title:'Compliance report',    desc:'Workout completion rates across all athletes',      badge:'Ready' },
    { id:'wellness',    icon:'🏥', title:'Wellness report',       desc:'RPE, sleep, and recovery data summary',             badge:'Coming Soon' },
    { id:'goals',       icon:'🎯', title:'Goal progress report', desc:'Individual athlete goal tracking and milestones',   badge:'Coming Soon' },
  ];

  const reportCards = REPORTS.map(r => `
  <div class="rpt-card">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="font-size:24px;flex-shrink:0">${r.icon}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-weight:700;font-size:13.5px;color:var(--text-primary)">${r.title}</span>
          <span style="font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;background:${r.badge==='Ready'?'#22c95522':'var(--surface-2)'};color:${r.badge==='Ready'?'#22c955':'var(--text-muted)'}">${r.badge}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${r.desc}</div>
        ${r.badge === 'Ready'
          ? `<button class="btn-draft rpt-gen-btn" data-rid="${r.id}" style="font-size:12px;padding:6px 14px">Generate report</button>`
          : `<button class="btn-draft" disabled
               data-coming-soon="Available in the next release"
               style="font-size:12px;padding:6px 14px;opacity:.45;cursor:not-allowed"
               aria-disabled="true">Coming soon</button>`}
      </div>
    </div>
    <div class="rpt-output" id="rpt-out-${r.id}" style="display:none;margin-top:16px;border-top:1px solid var(--border);padding-top:14px"></div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/reports')}
  <main class="page-main">
    <div class="page-header">
      <h1>Reports</h1>
      <p>Team performance analytics and exports</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Team avg PIQ</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">This week</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg readiness</div><div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions (7d)</div><div class="kpi-val b">${logsWeek}</div><div class="kpi-chg">Logged</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Caution flags</div><div class="kpi-val" style="color:${caution>0?'#ef4444':'var(--piq-green)'}">${caution}</div><div class="kpi-chg">Athletes &lt;60%</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px">${reportCards}</div>
  </main>
</div>
<style>
.rpt-card{background:var(--surface-1);border:1px solid var(--border);border-radius:14px;padding:16px;transition:border-color .2s}
.rpt-card:hover{border-color:var(--piq-green)44}
.rpt-stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.rpt-stat{background:var(--surface-2);border-radius:8px;padding:10px 12px;text-align:center}
.rpt-stat-val{font-size:20px;font-weight:700;color:var(--text-primary)}
.rpt-stat-lbl{font-size:10.5px;color:var(--text-muted);margin-top:2px}
.rpt-table{width:100%;border-collapse:collapse;font-size:12.5px}
.rpt-table th{text-align:left;color:var(--text-muted);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--border);font-size:11px;text-transform:uppercase}
.rpt-table td{padding:8px 8px;border-bottom:1px solid var(--border);color:var(--text-primary)}
.rpt-table tr:last-child td{border-bottom:none}
</style>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.querySelectorAll('.rpt-gen-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const rid    = btn.dataset.rid;
      const out    = document.getElementById('rpt-out-' + rid);
      if (!out) return;

      const roster = getRoster();
      const state  = getState();
      const logs   = state.workoutLog || [];
      const now    = Date.now();
      const day7   = now - 7 * 86_400_000;
      const avgPIQ = roster.length ? Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length) : 0;
      const avgRdy = roster.length ? Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length) : 0;
      const lw     = logs.filter(l => l.ts >= day7).length;
      const caution= roster.filter(a => a.readiness < 60).length;
      const high   = roster.filter(a => a.readiness >= 80).length;

      const generators = {
        weekly: () => {
          const top3 = [...roster].sort((a,b)=>b.piq-a.piq).slice(0,3);
          return `<div class="rpt-stat-row">
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:var(--piq-green)">${avgPIQ}</div><div class="rpt-stat-lbl">Avg PIQ</div></div>
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:#3b82f6">${lw}</div><div class="rpt-stat-lbl">Sessions</div></div>
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:${caution>0?'#ef4444':'var(--piq-green)'}">${caution}</div><div class="rpt-stat-lbl">Caution flags</div></div>
          </div>
          <table class="rpt-table"><thead><tr><th>Athlete</th><th>PIQ</th><th>Readiness</th><th>Streak</th></tr></thead><tbody>
            ${top3.map(a=>`<tr><td style="font-weight:600">${esc(a.name)}</td><td style="color:var(--piq-green);font-weight:700">${a.piq}</td><td style="color:${a.readiness>=80?'var(--piq-green)':a.readiness<60?'#ef4444':'#f59e0b'}">${a.readiness}%</td><td>${a.streak||0}🔥</td></tr>`).join('')}
          </tbody></table>`;
        },
        'piq-trend': () => {
          const tiers = [
            { l:'Elite (85+)',        n:roster.filter(a=>a.piq>=85).length,         c:'#a78bfa' },
            { l:'Strong (70–84)',     n:roster.filter(a=>a.piq>=70&&a.piq<85).length, c:'var(--piq-green)' },
            { l:'Developing (55–69)',  n:roster.filter(a=>a.piq>=55&&a.piq<70).length, c:'#f59e0b' },
            { l:'Needs focus (<55)',  n:roster.filter(a=>a.piq<55).length,           c:'#ef4444' },
          ];
          return tiers.map(t=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0">
            <span style="font-size:12px;color:var(--text-muted);min-width:140px">${t.l}</span>
            <div style="flex:1;background:var(--surface-2);border-radius:3px;height:7px">
              <div style="height:7px;width:${roster.length?Math.round(t.n/roster.length*100):0}%;background:${t.c};border-radius:3px"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${t.c};min-width:20px;text-align:right">${t.n}</span>
          </div>`).join('');
        },
        readiness: () => {
          const sorted = [...roster].sort((a,b)=>b.readiness-a.readiness);
          return `<div class="rpt-stat-row">
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:var(--piq-green)">${high}</div><div class="rpt-stat-lbl">Ready (80%+)</div></div>
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:#f59e0b">${roster.length-high-caution}</div><div class="rpt-stat-lbl">Moderate</div></div>
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:#ef4444">${caution}</div><div class="rpt-stat-lbl">Caution</div></div>
          </div>
          <table class="rpt-table"><thead><tr><th>Athlete</th><th>Readiness</th><th>Status</th></tr></thead><tbody>
            ${sorted.map(a=>{const col=a.readiness>=80?'var(--piq-green)':a.readiness<60?'#ef4444':'#f59e0b';const lbl=a.readiness>=80?'Ready':a.readiness<60?'Caution':'Moderate';return`<tr><td style="font-weight:600">${esc(a.name)}</td>
            <td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;background:var(--surface-2);border-radius:3px;height:6px;min-width:60px"><div style="height:6px;width:${a.readiness}%;background:${col};border-radius:3px"></div></div><span style="color:${col};font-weight:700;font-size:12.5px">${a.readiness}%</span></div></td>
            <td><span style="background:${col}22;color:${col};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600">${lbl}</span></td></tr>`;}).join('')}
          </tbody></table>`;
        },
        compliance: () => {
          const target = 4;
          const rows = roster.map(a=>{const cnt=logs.filter(l=>l.ts>=day7&&(l.athleteId===a.id||!l.athleteId)).length;const pct=Math.min(100,Math.round(cnt/target*100));const col=pct>=75?'var(--piq-green)':pct>=50?'#f59e0b':'#ef4444';
            return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0"><span style="font-size:12.5px;color:var(--text-primary);min-width:120px">${esc(a.name)}</span>
            <div style="flex:1;background:var(--surface-2);border-radius:3px;height:6px"><div style="height:6px;width:${pct}%;background:${col};border-radius:3px"></div></div>
            <span style="font-size:12px;font-weight:700;color:${col};min-width:32px;text-align:right">${pct}%</span></div>`;}).join('');
          const teamPct = lw > 0 ? Math.round(logs.filter(l=>l.ts>=day7&&l.completed).length/lw*100):0;
          return `<div class="rpt-stat-row">
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:#3b82f6">${lw}</div><div class="rpt-stat-lbl">Sessions (7d)</div></div>
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:var(--piq-green)">${logs.filter(l=>l.ts>=day7&&l.completed).length}</div><div class="rpt-stat-lbl">Completed</div></div>
            <div class="rpt-stat"><div class="rpt-stat-val" style="color:${teamPct>=75?'var(--piq-green)':teamPct>=50?'#f59e0b':'#ef4444'}">${teamPct}%</div><div class="rpt-stat-lbl">Team rate</div></div>
          </div>${rows}`;
        },
      };

      if (generators[rid]) {
        // [Fix-7] Add timestamp to output
        out.innerHTML = buildReportTimestamp() + generators[rid]();
        out.style.display = 'block';
        btn.textContent = 'Regenerate';
        showToast('Report generated');
      }
    });
  });
});

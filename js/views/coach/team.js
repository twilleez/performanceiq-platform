/**
 * Coach Team View — full roster with readiness overview
 */
import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';

const SPORT_EMOJI = {basketball:'🏀',football:'🏈',soccer:'⚽',baseball:'⚾',volleyball:'🏐',track:'🏃'};

export function renderCoachTeam() {
  const roster = getRoster();
  const ready    = roster.filter(a => a.readiness >= 80).length;
  const caution  = roster.filter(a => a.readiness < 60).length;
  const moderate = roster.length - ready - caution;

  const rows = roster.map(a => `
  <tr>
    <td style="padding:10px 12px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:16px">${SPORT_EMOJI[a.sport]||'🏅'}</div>
        <div>
          <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${a.name}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'} · ${a.sport||'—'}</div>
        </div>
      </div>
    </td>
    <td style="padding:10px 12px;text-align:center">
      <span style="font-weight:700;font-size:15px;color:${a.readiness>=80?'var(--piq-green)':a.readiness<60?'#ef4444':'#f59e0b'}">${a.readiness}%</span>
    </td>
    <td style="padding:10px 12px;text-align:center">
      <span style="font-weight:700;font-size:15px;color:var(--text-primary)">${a.piq}</span>
    </td>
    <td style="padding:10px 12px;text-align:center">🔥 ${a.streak}d</td>
    <td style="padding:10px 12px;text-align:center">
      ${a.readiness>=80
        ? `<span class="alert-badge alert-ready">Ready</span>`
        : a.readiness<60
        ? `<span class="alert-badge alert-caution">Caution</span>`
        : `<span class="alert-badge" style="background:var(--g200);color:var(--g600)">Moderate</span>`}
    </td>
  </tr>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/team')}
  <main class="page-main">
    <div class="page-header">
      <h1>Team Overview</h1>
      <p>Full roster readiness and performance snapshot</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Athletes</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">On roster</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Ready</div><div class="kpi-val g">${ready}</div><div class="kpi-chg">≥80% readiness</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Moderate</div><div class="kpi-val" style="color:#f59e0b">${moderate}</div><div class="kpi-chg">60–79%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Caution</div><div class="kpi-val" style="color:#ef4444">${caution}</div><div class="kpi-chg">&lt;60% readiness</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Roster — Readiness Today</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="padding:8px 12px;text-align:left;font-size:11.5px;color:var(--text-muted);font-weight:600">ATHLETE</th>
              <th style="padding:8px 12px;text-align:center;font-size:11.5px;color:var(--text-muted);font-weight:600">READINESS</th>
              <th style="padding:8px 12px;text-align:center;font-size:11.5px;color:var(--text-muted);font-weight:600">PIQ</th>
              <th style="padding:8px 12px;text-align:center;font-size:11.5px;color:var(--text-muted);font-weight:600">STREAK</th>
              <th style="padding:8px 12px;text-align:center;font-size:11.5px;color:var(--text-muted);font-weight:600">STATUS</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </main>
</div>`;
}

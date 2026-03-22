import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
const SPORT_EMOJI = {basketball:'🏀',football:'🏈',soccer:'⚽',baseball:'⚾',volleyball:'🏐',track:'🏃'};
export function renderCoachTeam() {
  const roster = getRoster();
  const ready = roster.filter(a=>a.readiness>=80).length;
  const caution = roster.filter(a=>a.readiness<60).length;
  const moderate = roster.length - ready - caution;
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/team')}
  <main class="page-main">
    <div class="page-header"><h1>Team <span>Overview</span></h1><p>${roster.length} athletes · Today's readiness status</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Ready</div><div class="kpi-val g">${ready}</div><div class="kpi-chg">Readiness ≥80</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Moderate</div><div class="kpi-val" style="color:#f59e0b">${moderate}</div><div class="kpi-chg">60–79</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Caution</div><div class="kpi-val" style="color:#ef4444">${caution}</div><div class="kpi-chg">Under 60</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Roster Size</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Total athletes</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Full Team Table</div>
      <div style="overflow-x:auto;margin-top:12px">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead><tr style="border-bottom:2px solid var(--border)">
            <th style="text-align:left;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">ATHLETE</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">POS</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">READINESS</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">PIQ</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">STREAK</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text-muted);font-size:11px;font-weight:600">STATUS</th>
          </tr></thead>
          <tbody>
            ${[...roster].sort((a,b)=>b.readiness-a.readiness).map(a => {
              const rc = a.readiness>=80?'#22c955':a.readiness<60?'#ef4444':'#f59e0b';
              const sl = a.readiness>=80?'Ready':a.readiness<60?'Caution':'Moderate';
              const sc = a.readiness>=80?'alert-ready':a.readiness<60?'alert-caution':'';
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:10px"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:18px">${SPORT_EMOJI[a.sport]||'🏅'}</span><div><div style="font-weight:600;color:var(--text-primary)">${a.name}</div><div style="font-size:11.5px;color:var(--text-muted)">${a.level||'—'}</div></div></div></td>
                <td style="text-align:center;padding:10px;color:var(--text-muted)">${a.position||'—'}</td>
                <td style="text-align:center;padding:10px;font-weight:700;color:${rc}">${a.readiness}%</td>
                <td style="text-align:center;padding:10px;font-weight:700;color:var(--piq-green)">${a.piq}</td>
                <td style="text-align:center;padding:10px">🔥 ${a.streak}d</td>
                <td style="text-align:center;padding:10px"><span class="alert-badge ${sc}" style="${!sc?'background:var(--surface-2);color:var(--text-muted)':''}">${sl}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </main>
</div>`;
}
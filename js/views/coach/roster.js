import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';
import { navigate }     from '../../router.js';
import { SPORT_EMOJI }  from '../../data/exerciseLibrary.js';

export function renderCoachRoster() {
  const roster = getRoster();
  const ready    = roster.filter(a => a.readiness >= 80);
  const caution  = roster.filter(a => a.readiness < 60);
  const full     = roster.filter(a => a.readiness >= 60 && a.readiness < 80);

  const athleteCards = roster.map(a => `
  <div class="coach-team-card" style="cursor:pointer" data-id="${a.id}">
    <div class="athlete-avatar">${a.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${a.name}</div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${a.position} · ${SPORT_EMOJI[a.sport]||''} ${a.sport} · Streak 🔥${a.streak}d</div>
    </div>
    <div style="text-align:right">
      <div class="athlete-piq">${a.piq}</div>
      <div style="font-size:10px;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;letter-spacing:1px">PIQ</div>
    </div>
    <div class="athlete-status">
      ${a.readiness >= 80
        ? `<span class="alert-badge alert-ready">✓ Ready ${a.readiness}%</span>`
        : a.readiness < 60
        ? `<span class="alert-badge alert-caution">⚠ Caution ${a.readiness}%</span>`
        : `<span class="alert-badge" style="background:var(--g200);color:var(--g600)">${a.readiness}%</span>`}
    </div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/roster')}
  <main class="page-main">
    <div class="page-header">
      <h1>Team <span>Roster</span></h1>
      <p>${roster.length} athletes · ${ready.length} ready · ${caution.length} caution</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Total Athletes</div><div class="kpi-val b">${roster.length}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Ready</div><div class="kpi-val g">${ready.length}</div><div class="kpi-chg">≥80%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Moderate</div><div class="kpi-val">${full.length}</div><div class="kpi-chg">60–79%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Caution</div><div class="kpi-val" style="color:#d97706">${caution.length}</div><div class="kpi-chg">&lt;60%</div></div>
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="tpl-sport-btn active" id="rf-all" data-filter="all">All (${roster.length})</button>
      <button class="tpl-sport-btn" data-filter="ready">✅ Ready (${ready.length})</button>
      <button class="tpl-sport-btn" data-filter="caution">⚠ Caution (${caution.length})</button>
    </div>

    <div class="panel" id="roster-list">${athleteCards}</div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  // Filter buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('#roster-list .coach-team-card').forEach(card => {
        const id = +card.dataset.id;
        const a  = getRoster().find(x => x.id === id);
        if (!a) return;
        const show = f === 'all'
          || (f === 'ready' && a.readiness >= 80)
          || (f === 'caution' && a.readiness < 60);
        card.style.display = show ? 'flex' : 'none';
      });
    });
  });
});

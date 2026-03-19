import { router }           from '../../core/router.js';
import { state }            from '../../state/state.js';
import { renderEmptyState } from '../../app.js';
export function renderCoachTeam(container) {
  const athletes = state.get('athletes') || [];
  container.innerHTML = `
    <div class="view-screen">
      <div class="view-nav-bar">
        <button class="back-btn" id="back">←</button>
        <div class="view-nav-title">TEAM ROSTER</div>
        <button class="icon-btn" id="add-btn" style="font-size:20px;width:36px;height:36px;">+</button>
      </div>
      <div id="team-list" style="padding:16px 20px;"></div>
    </div>`;
  const teamList = container.querySelector('#team-list');
  if (!athletes.length) {
    renderEmptyState(teamList, 'athletes');
  } else {
    teamList.innerHTML = athletes.map(a => `
      <div class="athlete-row card" style="margin:0 0 8px;">
        <div class="athlete-row-avatar">${(a.name||'AT').slice(0,2).toUpperCase()}</div>
        <div class="athlete-row-info">
          <div class="athlete-name">${a.name||'Athlete'}</div>
          <div class="athlete-sport">${a.sport||'—'}</div>
        </div>
        <div class="athlete-row-status" style="color:#00E599;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;">
          PIQ ${a.piq||'—'}
        </div>
      </div>`).join('');
  }
  container.querySelector('#back')?.addEventListener('click', () => history.back());
  container.querySelector('#add-btn')?.addEventListener('click', () => {
    const name = prompt('Athlete name?');
    if (!name) return;
    const sport = prompt('Sport?') || 'Basketball';
    const list = state.get('athletes') || [];
    list.push({ name, sport, piq: 70, readiness: 'moderate', initials: name.slice(0,2).toUpperCase() });
    state.set('athletes', list);
    renderCoachTeam(container);
  });
}

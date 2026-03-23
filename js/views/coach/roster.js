/**
 * PerformanceIQ — Coach Roster v2
 * Phase 5: Athlete cards are now clickable → athlete detail view.
 * Clicking a card stores the athlete id in sessionStorage and
 * navigates to coach/athlete/:id (renderCoachAthleteDetail).
 */
import { buildSidebar }   from '../../components/nav.js';
import { getRoster }      from '../../state/state.js';
import { navigate }       from '../../router.js';

const SPORT_EMOJI = {basketball:'🏀',football:'🏈',soccer:'⚽',baseball:'⚾',volleyball:'🏐',track:'🏃'};

const INTEREST_META = {
  High:     { label:'High Interest',    color:'#22c955' },
  Medium:   { label:'Medium Interest',  color:'#3b82f6' },
  Low:      { label:'Low Interest',     color:'#94a3b8' },
  Applied:  { label:'Applied',          color:'#f59e0b' },
  Offer:    { label:'Offer Received',   color:'#a78bfa' },
};

export function renderCoachRoster() {
  const roster = getRoster();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/roster')}
  <main class="page-main">
    <div class="page-header">
      <h1>Roster <span>Management</span></h1>
      <p>${roster.length} athletes · Click any card for full athlete detail</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${roster.map(a => {
        const rColor = a.readiness >= 80 ? 'var(--piq-green)' : a.readiness < 60 ? '#ef4444' : '#f59e0b';
        const badge  = a.readiness >= 80 ? {label:'Ready',bg:'rgba(34,201,85,.15)',color:'#22c955'}
                     : a.readiness < 60  ? {label:'Caution',bg:'rgba(239,68,68,.15)',color:'#ef4444'}
                     : {label:'Moderate',bg:'var(--surface-2)',color:'var(--text-muted)'};
        return `
      <div class="panel athlete-card" data-id="${a.id}"
        style="padding:16px;cursor:pointer;transition:transform .15s,box-shadow .15s"
        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 20px rgba(0,0,0,.15)'"
        onmouseout="this.style.transform='';this.style.boxShadow=''">

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:42px;height:42px;border-radius:50%;background:var(--piq-green);
                      display:flex;align-items:center;justify-content:center;
                      font-size:17px;font-weight:800;color:#0d1b3e;flex-shrink:0">
            ${(a.name||'A').charAt(0)}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px;color:var(--text-primary);
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${a.position||'—'} · ${SPORT_EMOJI[a.sport]||'🏅'} ${a.sport||''}</div>
          </div>
          <span style="font-size:11px;padding:3px 8px;border-radius:9px;font-weight:700;
                       background:${badge.bg};color:${badge.color};white-space:nowrap;flex-shrink:0">
            ${badge.label}
          </span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:12px">
          <div style="padding:8px;background:var(--surface-2);border-radius:8px">
            <div style="color:var(--text-muted);margin-bottom:2px;font-size:11px">Readiness</div>
            <div style="font-weight:700;font-size:18px;color:${rColor}">${a.readiness}%</div>
          </div>
          <div style="padding:8px;background:var(--surface-2);border-radius:8px">
            <div style="color:var(--text-muted);margin-bottom:2px;font-size:11px">PIQ</div>
            <div style="font-weight:700;font-size:18px;color:var(--text-primary)">${a.piq}</div>
          </div>
          <div style="padding:8px;background:var(--surface-2);border-radius:8px">
            <div style="color:var(--text-muted);margin-bottom:2px;font-size:11px">Streak</div>
            <div style="font-weight:700;font-size:18px">🔥${a.streak}d</div>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:11.5px;color:var(--text-muted)">
            ${a.level ? `<strong>${a.level}</strong>` : ''}
            ${a.level && a.compPhase ? ' · ' : ''}
            ${a.compPhase ? a.compPhase : ''}
          </div>
          <span style="font-size:11px;color:var(--piq-green);font-weight:600">View detail →</span>
        </div>
      </div>`;
      }).join('')}
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'coach/roster') return;

  document.querySelectorAll('.athlete-card').forEach(card => {
    card.addEventListener('click', () => {
      sessionStorage.setItem('piq_athlete_id', card.dataset.id);
      navigate('coach/athlete/' + card.dataset.id);
    });
  });
});

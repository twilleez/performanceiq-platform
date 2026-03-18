import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';
import { SPORT_EMOJI }  from '../../data/exerciseLibrary.js';

export function renderCoachReadiness() {
  const roster = getRoster();
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  const sorted = [...roster].sort((a,b) => b.readiness - a.readiness);

  // Readiness distribution
  const bands = [
    { label:'90–100', color:'#22c955', count: roster.filter(a=>a.readiness>=90).length },
    { label:'80–89',  color:'#4ade80', count: roster.filter(a=>a.readiness>=80&&a.readiness<90).length },
    { label:'70–79',  color:'#f59e0b', count: roster.filter(a=>a.readiness>=70&&a.readiness<80).length },
    { label:'60–69',  color:'#fb923c', count: roster.filter(a=>a.readiness>=60&&a.readiness<70).length },
    { label:'<60',    color:'#ef4444', count: roster.filter(a=>a.readiness<60).length },
  ];
  const maxBand = Math.max(...bands.map(b=>b.count), 1);

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/readiness')}
  <main class="page-main">
    <div class="page-header">
      <h1>Team <span>Readiness</span></h1>
      <p>Today's training capacity for every athlete</p>
    </div>

    <!-- Team avg ring + dist -->
    <div class="panels-2" style="margin-bottom:20px">
      <div class="panel">
        <div class="panel-title">Team Average</div>
        <div class="ring-wrap">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border)" stroke-width="9"/>
            <circle cx="55" cy="55" r="46" fill="none"
              stroke="${avgRdy>=80?'#22c955':avgRdy>=60?'#f59e0b':'#ef4444'}"
              stroke-width="9" stroke-dasharray="289"
              stroke-dashoffset="${Math.round(289-(avgRdy/100)*289)}"
              stroke-linecap="round" transform="rotate(-90 55 55)"/>
          </svg>
          <div class="ring-num" style="color:${avgRdy>=80?'var(--piq-green-dark)':avgRdy>=60?'#d97706':'#ef4444'}">${avgRdy}</div>
          <div class="ring-lbl">Team Avg Readiness</div>
        </div>
        <p class="readiness-explain" style="text-align:center">
          ${avgRdy>=80?'Team is primed — great day for high-intensity work.':avgRdy>=60?'Moderate readiness — consider a technique-focused session.':'Low team readiness — recovery or light work recommended.'}
        </p>
      </div>
      <div class="panel">
        <div class="panel-title">Readiness Distribution</div>
        ${bands.map(b => `
        <div class="chart-bar-row">
          <span class="chart-bar-lbl" style="font-size:11.5px">${b.label}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar-fill" style="width:${b.count?Math.round(b.count/maxBand*100):0}%;background:${b.color}">
              ${b.count > 0 ? `<span class="chart-bar-val">${b.count}</span>` : ''}
            </div>
          </div>
          <span style="font-size:12px;color:var(--text-muted);width:14px;text-align:right">${b.count}</span>
        </div>`).join('')}
      </div>
    </div>

    <!-- Full roster readiness -->
    <div class="panel">
      <div class="panel-title">Individual Readiness — Today</div>
      ${sorted.map(a => `
      <div class="athlete-row">
        <div class="athlete-avatar">${a.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
        <div class="athlete-info">
          <div class="athlete-name">${a.name}</div>
          <div class="athlete-meta">${a.position} · PIQ ${a.piq} · Streak 🔥${a.streak}d</div>
        </div>
        <div style="flex:1;max-width:200px;margin:0 16px">
          <div class="prog-bg">
            <div class="prog-fill" style="width:${a.readiness}%;background:${a.readiness>=80?'var(--piq-green-dark)':a.readiness>=60?'#f59e0b':'#ef4444'}"></div>
          </div>
        </div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;min-width:36px;text-align:right;color:${a.readiness>=80?'var(--piq-green-dark)':a.readiness>=60?'#d97706':'#ef4444'}">${a.readiness}%</div>
        ${a.readiness >= 80
          ? `<span class="alert-badge alert-ready" style="margin-left:8px">Ready</span>`
          : a.readiness < 60
          ? `<span class="alert-badge alert-caution" style="margin-left:8px">Caution</span>`
          : `<span class="alert-badge" style="margin-left:8px;background:var(--g200);color:var(--g600)">Moderate</span>`}
      </div>`).join('')}
    </div>
  </main>
</div>`;
}

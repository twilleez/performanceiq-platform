import { dom } from '../ui/dom.js';
import { STATE, ATHLETES } from '../state/state.js';
import { WEEK_LOAD } from '../data/demo.js';
import { getAcrClass, getSevClass } from '../features/scoring.js';

export function renderAnalytics(){
  if (dom.analyticsSub) dom.analyticsSub.textContent = `${STATE.teamName} · ${STATE.season}`;

  const logged = ATHLETES.filter(a => a.score > 0);
  const avg = logged.length ? Math.round(logged.reduce((s,a) => s+a.score,0)/logged.length) : 0;
  const logRate = ATHLETES.length ? Math.round(logged.length / ATHLETES.length * 100) : 0;
  const BASE = 65;

  const grid = dom.analyticsStatGrid;
  if (grid) grid.innerHTML = `
    <div class="stat-card accent">
      <div class="stat-label">Team Avg PIQ</div><div class="stat-value">${avg}</div>
      <div class="stat-sub up">↑ ${Math.max(0,avg-BASE)} pts this week</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Logging Rate</div><div class="stat-value">${logRate}%</div>
      <div class="stat-sub up">${logged.length} / ${ATHLETES.length} athletes</div>
    </div>
    <div class="stat-card yellow">
      <div class="stat-label">Avg Readiness</div><div class="stat-value">72%</div>
      <div class="stat-sub down">↓ 5% vs last week</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Risk Flags</div>
      <div class="stat-value">${ATHLETES.filter(a=>a.riskLevel==='rest'||a.riskLevel==='watch').length}</div>
      <div class="stat-sub">This week</div>
    </div>`;

  const maxAU = Math.max(...WEEK_LOAD.map(d => d.au));
  if (dom.loadChart) dom.loadChart.innerHTML = WEEK_LOAD.map(d => {
    const h = Math.max(4, Math.round(d.au/maxAU*100));
    const color = d.au >= 900 ? 'var(--red)' : d.au >= 700 ? 'var(--yellow)' : 'var(--accent)';
    const alpha = (0.55 + 0.45*(d.au/maxAU)).toFixed(2);
    return `<div class="chart-bar-wrap" data-label="${d.au} AU" title="${d.au} AU">
      <div class="chart-bar" style="height:${h}%;background:${color};opacity:${alpha}"></div>
      <div class="chart-bar-lbl">${d.day}</div>
    </div>`;
  }).join('');

  const ranges = [
    {label:'80–100', count:ATHLETES.filter(a=>a.score>=80).length,              color:'var(--green)'  },
    {label:'60–79',  count:ATHLETES.filter(a=>a.score>=60&&a.score<80).length,  color:'var(--accent)' },
    {label:'40–59',  count:ATHLETES.filter(a=>a.score>=40&&a.score<60).length,  color:'var(--yellow)' },
    {label:'1–39',   count:ATHLETES.filter(a=>a.score>0&&a.score<40).length,    color:'var(--red)'    },
    {label:'N/A',    count:ATHLETES.filter(a=>a.score===0).length,              color:'var(--surface4)'},
  ];
  const maxC = Math.max(...ranges.map(r=>r.count), 1);

  if (dom.scoreDistChart) dom.scoreDistChart.innerHTML = ranges.map(r =>
    `<div class="chart-bar-wrap" data-label="${r.count} athletes" title="${r.count} athletes">
      <div class="chart-bar" style="height:${Math.max(6,Math.round(r.count/maxC*100))}%;background:${r.color}"></div>
      <div class="chart-bar-lbl">${r.label}</div>
    </div>`).join('');

  if (dom.scoreRanges) dom.scoreRanges.innerHTML = ranges.map(r => `
    <div style="display:flex;align-items:center;gap:9px;font-size:13px">
      <div style="width:10px;height:10px;border-radius:2px;background:${r.color};flex-shrink:0"></div>
      <div style="flex:1">${r.label}</div>
      <div style="font-family:var(--font-mono);font-weight:600">${r.count} athlete${r.count!==1?'s':''}</div>
    </div>`).join('');

  if (dom.analyticsBody) dom.analyticsBody.innerHTML = ATHLETES.filter(a => a.score > 0).map(a => {
    const h = a.weekHistory;
    const acrCls = getAcrClass(a.acr);
    return `<tr>
      <td><div class="athlete-cell">
        <div style="width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${a.color};color:${a.colorText};font-size:11px;font-weight:700">${a.initials}</div>
        <div class="athlete-name-text">${a.name}</div>
      </div></td>
      <td style="font-family:var(--font-mono);color:var(--text-dim)">${h[0]??'—'}</td>
      <td style="font-family:var(--font-mono);color:var(--text-dim)">${h[2]??'—'}</td>
      <td style="font-family:var(--font-mono);color:var(--text-dim)">${h[4]??'—'}</td>
      <td><span class="score-badge ${getSevClass(a.severity)}">${a.score}</span></td>
      <td><span class="trend-val ${a.trend>=0?'up':'down'}">${a.trend>=0?'↑':'↓'}${Math.abs(a.trend)}</span></td>
      <td><span class="acr-val ${acrCls}">${a.acr??'—'}</span></td>
    </tr>`;
  }).join('');
}

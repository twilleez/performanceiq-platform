import { buildSidebar } from '../../components/nav.js';
import { getReadinessScore,getReadinessRingOffset,getReadinessColor,getReadinessExplain } from '../../state/selectors.js';
import { getWorkoutLog } from '../../state/state.js';

export function renderSoloReadiness() {
  const score=getReadinessScore(),offset=getReadinessRingOffset(score),color=getReadinessColor(score),explain=getReadinessExplain(score);
  const log=getWorkoutLog(),recent=log.slice(-7);
  const avgRPE=recent.length?(recent.reduce((s,w)=>s+(w.avgRPE||5),0)/recent.length).toFixed(1):'—';
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/readiness')}
  <main class="page-main">
    <div class="page-header"><h1>Readiness <span>Engine</span></h1><p>Your daily training capacity</p></div>
    <div class="panels-2">
      <div class="panel">
        <div class="ring-wrap">
          <svg width="130" height="130" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border)" stroke-width="9"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke="${color}" stroke-width="9"
              stroke-dasharray="289" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 55 55)"/>
          </svg>
          <div class="ring-num" style="color:${color}">${score}</div>
          <div class="ring-lbl">Readiness Score</div>
        </div>
        <p class="readiness-explain" style="text-align:center">${explain}</p>
        ${[['Sleep',Math.min(99,score+6),'var(--piq-green)'],['Load',Math.max(40,score-4),'var(--piq-blue)'],['Recovery',Math.min(98,score+3),'var(--piq-green)']].map(([l,v,c])=>`
        <div class="rf-row"><span class="rf-lbl">${l}</span><div class="rf-bar-bg"><div class="rf-bar-fill" style="width:${v}%;background:${c}"></div></div><span class="rf-num">${v}</span></div>`).join('')}
      </div>
      <div class="panel">
        <div class="panel-title">Recommendation</div>
        ${score>=80?`<div style="background:rgba(57,230,107,.08);border-radius:10px;padding:14px;border:1.5px solid rgba(57,230,107,.2)"><div style="font-size:22px;margin-bottom:8px">💪</div><div style="font-weight:700;color:var(--piq-green-dark);margin-bottom:4px">Go Hard</div><div style="font-size:13px;color:var(--text-secondary)">Great day for peak intensity work.</div></div>`:
          score>=60?`<div style="background:rgba(245,158,11,.08);border-radius:10px;padding:14px;border:1.5px solid rgba(245,158,11,.2)"><div style="font-size:22px;margin-bottom:8px">🏃</div><div style="font-weight:700;color:#d97706;margin-bottom:4px">Moderate Session</div><div style="font-size:13px;color:var(--text-secondary)">Technique or conditioning work recommended.</div></div>`:
          `<div style="background:rgba(248,113,113,.08);border-radius:10px;padding:14px;border:1.5px solid rgba(248,113,113,.2)"><div style="font-size:22px;margin-bottom:8px">🧘</div><div style="font-weight:700;color:#dc2626;margin-bottom:4px">Rest Day</div><div style="font-size:13px;color:var(--text-secondary)">Prioritize recovery and quality sleep.</div></div>`}
        <div style="margin-top:14px"><button class="btn-primary" style="width:auto;padding:10px 20px;font-size:13px" data-route="solo/today">Start Today's Session</button></div>
        <div style="margin-top:16px" class="panel-title" style="font-size:12px">Avg RPE (last 7)</div>
        <div style="font-size:28px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${+avgRPE>=8?'#ef4444':+avgRPE>=6?'#f59e0b':'var(--piq-green-dark)'}">${avgRPE}</div>
        <div style="font-size:12px;color:var(--text-muted)">Target: 6–7 for optimal load balance</div>
      </div>
    </div>
  </main>
</div>`;
}
